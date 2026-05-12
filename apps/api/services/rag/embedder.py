import os
import logging
import google.generativeai as genai
from typing import List

logger = logging.getLogger(__name__)

# Note: Ensure GEMINI_API_KEY is set in environment variables
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    logger.warning("GEMINI_API_KEY is not set. Embedder will fail.")

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Get embeddings for a list of texts using text-embedding-004.
    Batches requests to max 100 per call.
    """
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
