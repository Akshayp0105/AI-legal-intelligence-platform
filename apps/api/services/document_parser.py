import fitz
import pytesseract
from PIL import Image
from langdetect import detect, DetectorFactory
from typing import Tuple

# To enforce consistent results from langdetect
DetectorFactory.seed = 0

def extract_text_from_pdf(file_path: str) -> Tuple[str, int]:
    """
    Extracts text from a PDF file. 
    If a page has very little text (e.g. scanned), it falls back to OCR via pytesseract.
    Returns the extracted text and the page count.
    """
    doc = fitz.open(file_path)
    page_count = len(doc)
    full_text = ""

    for page_num in range(page_count):
        page = doc.load_page(page_num)
        text = page.get_text()
        
        # If less than 100 chars, assume it's a scanned page and use OCR
        if len(text.strip()) < 100:
            pix = page.get_pixmap()
            # Depending on PyMuPDF version, might need different handling for frombytes
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            ocr_text = pytesseract.image_to_string(img)
            full_text += ocr_text + "\n"
        else:
            full_text += text + "\n"
            
    doc.close()
    return full_text.strip(), page_count

def extract_text_from_image(file_path: str) -> Tuple[str, int]:
    """
    Extracts text from an image file using pytesseract.
    Returns the extracted text and page count (always 1 for image).
    """
    img = Image.open(file_path)
    text = pytesseract.image_to_string(img)
    return text.strip(), 1

def detect_document_language(text: str) -> str:
    """
    Detects the language of the provided text.
    Returns 'unknown' if detection fails or text is empty.
    """
    if not text or len(text.strip()) == 0:
        return "unknown"
    try:
        lang = detect(text)
        return lang
    except Exception:
        return "unknown"
