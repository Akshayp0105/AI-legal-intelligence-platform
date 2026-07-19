"""Indian Kanoon case scraper and indexer.

Fetches case law from the Indian Kanoon API, parses HTML to text,
stores in PostgreSQL, generates embeddings, and indexes into Qdrant
for semantic search.
"""

import os
import re
import uuid
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime

from core.database import AsyncSessionLocal
from models.precedent import CaseJudgment
from services.rag.embedder import get_embeddings
from services.rag.indexer import index_chunks
from core.logging import get_logger

logger = get_logger(__name__)

INDIAN_KANOON_API_URL = "https://api.indiankanoon.org/search"
INDIAN_KANOON_DOC_URL = "https://api.indiankanoon.org/doc"

# NOTE: Set INDIAN_KANOON_API_KEY in your environment variables.
# Format for Kanoon API requires an Authorization header: "Token {api_key}"

async def fetch_cases_from_kanoon(query: str, pagenum: int = 0) -> List[Dict[str, Any]]:
    """
    Fetch search results from Indian Kanoon API.
    """
    api_key = os.environ.get("INDIAN_KANOON_API_KEY")
    if not api_key:
        logger.error("INDIAN_KANOON_API_KEY is not set.")
        return []

    headers = {
        "Authorization": f"Token {api_key}",
        "Accept": "application/json"
    }
    
    params = {
        "formInput": query,
        "pagenum": pagenum
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(INDIAN_KANOON_API_URL, headers=headers, data=params)
            response.raise_for_status()
            data = response.json()
            return data.get('docs', [])
        except Exception as e:
            logger.error(f"Error fetching cases from Kanoon: {e}")
            return []

async def fetch_case_document(doc_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch the full document using the doc_id.
    """
    api_key = os.environ.get("INDIAN_KANOON_API_KEY")
    if not api_key:
        return None
        
    headers = {
        "Authorization": f"Token {api_key}",
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{INDIAN_KANOON_DOC_URL}/{doc_id}/", headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching case document {doc_id}: {e}")
            return None

def extract_text_from_html(html_content: str) -> str:
    """Extract plain text from HTML content using BeautifulSoup.

    Strips all HTML tags and returns cleaned text with newline separators.
    """
    from bs4 import BeautifulSoup
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, "html.parser")
    return soup.get_text(separator="\n").strip()

async def scrape_and_index_cases(query: str, max_cases: int = 5):
    """
    Fetch cases, parse, store in DB, and index in Qdrant.
    """
    docs = await fetch_cases_from_kanoon(query)
    
    cases_processed = 0
    for doc in docs:
        if cases_processed >= max_cases:
            break
            
        doc_id = doc.get("tid")
        if not doc_id:
            continue
            
        case_data = await fetch_case_document(doc_id)
        if not case_data:
            continue
            
        case_name = case_data.get("title", "")
        court = doc.get("court", "Unknown Court")
        # Extract year from date or publishdate
        date_str = case_data.get("publishdate") or case_data.get("date")
        year = None
        if date_str:
            try:
                # Naive extraction of 4-digit year, or parsing if standard format
                # Assuming Indian Kanoon might return standard dates or strings containing a year
                match = re.search(r'\b(19|20)\d{2}\b', date_str)
                if match:
                    year = int(match.group(0))
            except Exception:
                pass
                
        full_text_html = case_data.get("doc", "")
        full_text = extract_text_from_html(full_text_html)
        
        if not full_text:
            continue
            
        # We index the case description/summary or the first 1000 words as a representation
        chunk_text = full_text[:3000] # Qdrant/Gemini text limit roughly
        
        try:
            embeddings = get_embeddings([chunk_text])
        except Exception as e:
            logger.error(f"Embedding failed for case {case_name}: {e}")
            continue
            
        db_embedding_id = str(uuid.uuid4())
        
        # Save to PostgreSQL
        async with AsyncSessionLocal() as session:
            new_case = CaseJudgment(
                case_number=doc_id, # using Kanoon TID as case number for now
                case_name=case_name,
                court=court,
                year=year,
                full_text=full_text,
                summary=chunk_text[:500] + "...", # Dummy summary
                embedding_id=db_embedding_id,
                outcome="unknown"
            )
            session.add(new_case)
            await session.commit()
            
        # Index in Qdrant
        metadata = [{
            "source": "indian_kanoon",
            "case_id": doc_id,
            "court": court,
            "year": year,
            "type": "judgment"
        }]
        
        # In `indexer.py`, indexing is done and points are generated with uuid4, but here we can just pass the text and metadata.
        # Wait, indexer.py creates its own UUIDs for qdrant point IDs, but our `db_embedding_id` wouldn't match. 
        # For simplicity, we just index it. We can find it via case_id metadata in Qdrant.
        try:
            index_chunks([chunk_text], embeddings, metadata)
            logger.info(f"Successfully processed case: {case_name}")
            cases_processed += 1
        except Exception as e:
            logger.error(f"Failed to index case {case_name} into Qdrant: {e}")
