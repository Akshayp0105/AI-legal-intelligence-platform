import os
import uuid
import tempfile
import aiofiles
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from core.storage import upload_file_to_supabase
from core.auth import get_current_user
from models.user import User
from models.document import Document, DocType
from services.document_parser import extract_text_from_pdf, extract_text_from_image, detect_document_language
from services.rag import index_document

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    doc_type: DocType = Form(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 20MB limit.")
        
    allowed_extensions = [".pdf", ".png", ".jpg", ".jpeg"]
    _, ext = os.path.splitext(file.filename.lower() if file.filename else "")
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}")

    fd, temp_path = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    
    try:
        async with aiofiles.open(temp_path, 'wb') as out_file:
            await out_file.write(content)
            
        try:
            if ext == ".pdf":
                raw_text, page_count = extract_text_from_pdf(temp_path)
            else:
                raw_text, page_count = extract_text_from_image(temp_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error extracting text: {str(e)}")
            
        language = detect_document_language(raw_text)
        
        file_uuid = uuid.uuid4()
        destination_path = f"{current_user.id}/{file_uuid}{ext}"
        bucket_name = "legal-docs"
        
        content_type = "application/pdf" if ext == ".pdf" else f"image/{ext[1:]}"
        if ext == ".jpg":
            content_type = "image/jpeg"
            
        try:
            file_url = await upload_file_to_supabase(
                file_path=temp_path,
                bucket=bucket_name,
                destination_path=destination_path,
                content_type=content_type
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file to storage: {str(e)}")
            
        document = Document(
            id=file_uuid,
            user_id=current_user.id,
            filename=file.filename or f"uploaded_file{ext}",
            file_url=file_url,
            raw_text=raw_text,
            doc_type=doc_type,
            language=language,
            page_count=page_count
        )
        
        db.add(document)
        await db.commit()
        await db.refresh(document)
        
        background_tasks.add_task(index_document, str(document.id), raw_text)
        
        return {
            "document_id": str(document.id),
            "extracted_text": raw_text[:500] if raw_text else "",
            "page_count": page_count,
            "detected_language": language
        }
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
