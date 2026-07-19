"""RAG (Retrieval-Augmented Generation) indexing orchestrator.

Coordinates the pipeline of chunking document text, generating
embeddings, and storing vectors in Qdrant for semantic search.
"""

import logging
from services.rag.chunker import get_text_splitter
from services.rag.embedder import get_embeddings
from services.rag.indexer import index_chunks

logger = logging.getLogger(__name__)

async def index_document(document_id: str, raw_text: str):
    """
    Chunk document text, generate embeddings, and store in Qdrant.
    """
    logger.info(f"Background task started: Indexing document {document_id}")

    if not raw_text or not raw_text.strip():
        logger.warning(f"Document {document_id} has no text content, skipping indexing.")
        return

    try:
        splitter = get_text_splitter()
        chunks = splitter.split_text(raw_text)
        logger.info(f"Split document {document_id} into {len(chunks)} chunks.")

        embeddings = get_embeddings(chunks)
        logger.info(f"Generated {len(embeddings)} embeddings for document {document_id}.")

        metadata = [
            {
                "source": f"document:{document_id}",
                "document_id": document_id,
                "chunk_index": i,
            }
            for i in range(len(chunks))
        ]

        index_chunks(chunks, embeddings, metadata)
        logger.info(f"Background task completed: Indexed document {document_id} ({len(chunks)} chunks).")
    except Exception as e:
        logger.error(f"Failed to index document {document_id}: {e}", exc_info=True)
