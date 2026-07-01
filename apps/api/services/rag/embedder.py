import os
import google.generativeai as genai
from typing import List

from core.logging import get_logger

logger = get_logger(__name__)

_configured = False

def _ensure_configured() -> None:
    """Ensure the Gemini API is configured with the API key."""
    global _configured
    if _configured:
        return
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
    else:
        logger.warning("GEMINI_API_KEY is not set. Embedder will fail.")
    _configured = True

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Get embeddings for a list of texts using text-embedding-004.
    Batches requests to max 100 per call.
    """
    _ensure_configured()
    embeddings = []
    batch_size = 100
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        try:
            result = genai.embed_content(
                model="models/gemini-embedding-001",
                content=batch,
                task_type="retrieval_document"
            )
            # Depending on the SDK version, result['embedding'] is a list of embeddings
            batch_embeddings = result['embedding']
            embeddings.extend(batch_embeddings)
        except Exception as e:
            logger.error(f"Error getting embeddings for batch {i//batch_size}: {e}")
            raise
            
    return embeddings

def get_query_embedding(text: str) -> List[float]:
    """
    Get embedding for a single query string.
    """
    _ensure_configured()
    try:
        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=text,
            task_type="retrieval_query"
        )
        return result['embedding']
    except Exception as e:
        logger.error(f"Error getting query embedding: {e}")
        raise
