"""Qdrant vector indexing for legal knowledge chunks.

Upserts vectors with metadata payloads into the Qdrant
'legal_knowledge' collection and provides verification utilities.
"""

import logging
import uuid
from qdrant_client.http.models import PointStruct
from core.qdrant import qdrant_client, COLLECTION_NAME, init_qdrant
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Ensure collection exists
init_qdrant()

def index_chunks(chunks: List[str], embeddings: List[List[float]], metadata: List[Dict[str, Any]]):
    """
    Upsert vectors into Qdrant collection "legal_knowledge" with payload.
    Payload should contain: {text, source, section_number, act_name, case_id, court, year, chunk_index}
    """
    if len(chunks) != len(embeddings) or len(chunks) != len(metadata):
        raise ValueError("Lengths of chunks, embeddings, and metadata must match.")
        
    points = []
    for i, (chunk, embedding, meta) in enumerate(zip(chunks, embeddings, metadata)):
        # Include text in payload
        payload = {
            "text": chunk,
            "source": meta.get("source"),
            "section_number": meta.get("section_number"),
            "act_name": meta.get("act_name"),
            "case_id": meta.get("case_id"),
            "court": meta.get("court"),
            "year": meta.get("year"),
            "chunk_index": meta.get("chunk_index", i)
        }
        
        point_id = str(uuid.uuid4())
        points.append(
            PointStruct(
                id=point_id,
                vector=embedding,
                payload=payload
            )
        )
        
    try:
        operation_info = qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            wait=True,
            points=points
        )
        logger.info(f"Successfully indexed {len(points)} chunks into Qdrant.")
        return operation_info
    except Exception as e:
        logger.error(f"Failed to index chunks into Qdrant: {e}")
        raise

async def verify_index():
    """Verify that the Qdrant collection contains data."""
    try:
        collection_info = qdrant_client.get_collection(COLLECTION_NAME)
        logger.info(f"Total vectors in {COLLECTION_NAME}: {collection_info.points_count}")
        return collection_info.points_count
    except Exception as e:
        logger.error(f"Failed to verify index: {e}")
        return 0
