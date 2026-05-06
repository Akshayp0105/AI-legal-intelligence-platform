from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db_session
from models.document import Document
from services.strategy.arguments import generate_arguments
from services.strategy.gaps import analyze_gaps

router = APIRouter()

class GenerateArgumentsRequest(BaseModel):
    case_description: str
    applicable_laws: List[str]
    side: str  # "plaintiff" | "defendant" | "both"

class GapAnalyzeRequest(BaseModel):
    case_description: str
    documents: List[str]  # list of document_ids (UUIDs)

@router.post("/arguments/generate")
async def generate_arguments_endpoint(request: GenerateArgumentsRequest):
    """
    Generate structured legal arguments based on case description and laws.
    """
    if request.side not in ["plaintiff", "defendant", "both"]:
        raise HTTPException(status_code=400, detail="Invalid side. Must be plaintiff, defendant, or both.")
        
    result = generate_arguments(
        case_description=request.case_description,
        applicable_laws=request.applicable_laws,
        side=request.side
    )
    return result

@router.post("/gaps/analyze")
async def analyze_gaps_endpoint(
    request: GapAnalyzeRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Analyze case description and documents to find legal gaps and weaknesses, augmented by RAG.
    """
    document_texts = []
    
    if request.documents:
        # Fetch documents from DB
        stmt = select(Document).where(Document.id.in_(request.documents))
        try:
            result = await db.execute(stmt)
            docs = result.scalars().all()
            for doc in docs:
                if doc.raw_text:
                    document_texts.append(doc.raw_text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")
            
    result = analyze_gaps(
        case_description=request.case_description,
        documents_texts=document_texts
    )
    return result
