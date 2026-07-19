"""CLI script for loading IPC sections into the RAG pipeline.

Reads legal data from JSON files, chunks statutes, generates
embeddings, indexes into Qdrant, and stores in PostgreSQL.
Supports argparse CLI invocation for batch data loading.
"""

import asyncio
import json
import os
import argparse
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from models.knowledge import LegalKnowledge
from services.rag.chunker import chunk_statute
from services.rag.embedder import get_embeddings
from services.rag.indexer import index_chunks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def load_ipc_data(json_file_path: str):
    """
    Load IPC sections from a JSON file and index them into Qdrant and PostgreSQL.
    JSON format expected:
    [
        {"section_number": "302", "text": "Punishment for murder...", "act_name": "Indian Penal Code", "year": 1860},
        ...
    ]
    """
    if not os.path.exists(json_file_path):
        logger.error(f"File not found: {json_file_path}")
        return

    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    all_chunks = []
    all_metadata = []

    for item in data:
        section_number = item.get("section_number", "")
        text = item.get("text", "")
        act_name = item.get("act_name", "Indian Penal Code")
        year = item.get("year", 1860)

        # 1. Chunking
        chunks = chunk_statute(text, section_number, act_name)
        
        for idx, chunk in enumerate(chunks):
            all_chunks.append(chunk)
            all_metadata.append({
                "source": "statute",
                "section_number": section_number,
                "act_name": act_name,
                "year": year,
                "chunk_index": idx
            })

    logger.info(f"Generated {len(all_chunks)} chunks from {len(data)} sections.")

    if not all_chunks:
        logger.warning("No data to index.")
        return

    # 2. Embedding
    logger.info("Generating embeddings...")
    embeddings = get_embeddings(all_chunks)

    # 3. Qdrant Indexing
    logger.info("Indexing into Qdrant...")
    index_chunks(all_chunks, embeddings, all_metadata)

    # 4. PostgreSQL Indexing
    logger.info("Indexing into PostgreSQL...")
    async with AsyncSessionLocal() as session:
        try:
            for chunk, meta in zip(all_chunks, all_metadata):
                db_item = LegalKnowledge(
                    text=chunk,
                    source=meta["source"],
                    section_number=meta["section_number"],
                    act_name=meta["act_name"],
                    year=meta["year"],
                    chunk_index=meta["chunk_index"]
                )
                session.add(db_item)
            await session.commit()
            logger.info("Successfully saved to PostgreSQL.")
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to save to PostgreSQL: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load IPC data into the RAG pipeline.")
    parser.add_argument("--file", type=str, required=True, help="Path to the JSON file containing IPC sections.")
    args = parser.parse_args()

    asyncio.run(load_ipc_data(args.file))
