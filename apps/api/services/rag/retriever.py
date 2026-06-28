import json
import logging
import asyncio
import hashlib
from typing import List, Dict, Any, Optional, Set
from pydantic import BaseModel
import redis.asyncio as redis
import google.generativeai as genai
from google.api_core import retry
from sqlalchemy import text

from core.qdrant import qdrant_client
from core.database import AsyncSessionLocal
from core.intent_classifier import ClassifiedIntent
from core.domain_router import build_qdrant_filter
from qdrant_client.http import models as qdrant_models

logger = logging.getLogger(__name__)

import os

# Initialize Redis client asynchronously
try:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    if redis_url.startswith("redis://"):
        redis_client = redis.from_url(redis_url, decode_responses=True)
    else:
        # Fallback
        redis_client = redis.Redis(host=redis_url, port=6379, db=0, decode_responses=True)
except Exception as e:
    redis_client = None
    logger.warning(f"Failed to initialize Redis in retriever: {e}")

class RetrievalResult(BaseModel):
    laws: List[Any]
    cases: List[Any]
    total_retrieved: int
    domain_used: str
    retrieval_tiers_used: int

class QdrantMockResult:
    """Mock class to wrap PostgreSQL results in a format similar to Qdrant ScoredPoint."""
    def __init__(self, id: str, score: float, payload: dict):
        self.id = id
        self.score = score
        self.payload = payload

@retry.Retry(initial=1.0, maximum=10.0, multiplier=2.0, deadline=30.0) # 3 retries with exponential backoff basically
async def _call_gemini_embedding(text: str) -> list[float]:
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text
    )
    return result['embedding']

async def embed_query(text: str) -> list[float]:
    """
    Call Gemini text-embedding-004 API.
    Add retry logic (3 retries with exponential backoff).
    Cache embeddings in Redis: key = "embed:" + hash(text), TTL = 86400.
    """
    text_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
    cache_key = f"embed:{text_hash}"
    
    if redis_client:
        try:
            cached_embedding = await redis_client.get(cache_key)
            if cached_embedding:
                logger.info("Returning cached embedding")
                return json.loads(cached_embedding)
        except Exception as e:
            logger.warning(f"Redis get failed in embed_query: {e}")

    try:
        embedding = await _call_gemini_embedding(text)
        
        if redis_client:
            try:
                await redis_client.setex(cache_key, 86400, json.dumps(embedding))
            except Exception as e:
                logger.warning(f"Redis set failed in embed_query: {e}")
                
        return embedding
    except Exception as e:
        logger.error(f"Failed to embed query after retries: {e}")
        raise

async def search_postgres_fulltext(query: str, acts: List[str], limit: int) -> List[QdrantMockResult]:
    """
    Use PostgreSQL to_tsvector full-text search on the legal_knowledge table.
    Filter WHERE act_name = ANY(acts).
    Return results in same format as Qdrant results.
    """
    results = []
    try:
        async with AsyncSessionLocal() as session:
            sql = text("""
                SELECT id, act_name, section_number, text, source
                FROM legal_knowledge
                WHERE act_name = ANY(:acts)
                AND to_tsvector('english', text) @@ plainto_tsquery('english', :query)
                LIMIT :limit
            """)
            db_results = await session.execute(sql, {"acts": acts, "query": query, "limit": limit})
            for row in db_results:
                payload = {
                    "act_name": getattr(row, "act_name", None),
                    "section_number": getattr(row, "section_number", None),
                    "doc_type": getattr(row, "source", "section"),
                    "text": getattr(row, "text", "")
                }
                results.append(QdrantMockResult(id=str(getattr(row, "id", "")), score=0.5, payload=payload))
    except Exception as e:
        logger.error(f"Error in search_postgres_fulltext: {e}")
        
    return results

async def rerank_with_gemini(query: str, results: List[Any], domain: str) -> List[Any]:
    """
    Use Gemini Flash to re-rank results based on relevance.
    Send all results to Gemini Flash with prompt: 
    "Score each of these law sections 1-10 for relevance to this query: '{query}' in context of {domain} law. Return only a JSON array of scores."
    Sort results by score descending and return top 8.
    """
    if not results:
        return []

    try:
        model = genai.GenerativeModel("gemini-2.0-flash-001")
        
        # Prepare content for ranking
        sections_text = ""
        for i, r in enumerate(results):
            payload = r.payload if hasattr(r, 'payload') else {}
            act_name = payload.get('act_name', 'Unknown Act')
            sec_num = payload.get('section_number', 'Unknown Section')
            content = payload.get('text', '')[:500]  # truncate to avoid huge prompts
            sections_text += f"[{i}] {act_name} Sec {sec_num}: {content}\n\n"

        prompt = f"""Score each of these law sections 1-10 for relevance to this query: '{query}' in context of {domain} law. Return only a JSON array of scores.
        Make sure the array length exactly matches the number of sections provided ({len(results)}). Do not include any other text.
        
        Sections:
        {sections_text}
        """

        response = await model.generate_content_async(prompt)
        response_text = response.text.strip()
        
        if response_text.startswith("```json"):
            response_text = response_text[7:-3].strip()
        elif response_text.startswith("```"):
            response_text = response_text[3:-3].strip()
            
        scores = json.loads(response_text)
        
        if not isinstance(scores, list) or len(scores) != len(results):
            logger.warning(f"Invalid scores array from Gemini: {scores}. Falling back to original order.")
            return results[:8]
            
        # Pair results with scores and sort descending
        scored_results = list(zip(results, scores))
        scored_results.sort(key=lambda x: x[1], reverse=True)
        
        # Return top 8
        return [r[0] for r in scored_results[:8]]
        
    except Exception as e:
        logger.error(f"Error in rerank_with_gemini: {e}")
        return results[:8]

async def retrieve_for_domain(
    query: str,
    intent: ClassifiedIntent,
    domain_config: dict,
    top_k: int = 10
) -> RetrievalResult:
    
    # Step 1: Embed the query using Gemini text-embedding-004
    embedding = await embed_query(query)
    
    # Step 2: Build strict domain filter for Qdrant
    domain_filter = build_qdrant_filter(domain_config)
    
    # Step 3: Tier 1 — strict domain search
    tier1_results = qdrant_client.search(
        collection_name="legal_knowledge",
        query_vector=embedding,
        query_filter=domain_filter,  # STRICT: only this domain's acts
        limit=top_k,
        score_threshold=0.65  # only high-confidence matches
    )
    
    # Step 4: Tier 2 — if Tier 1 returned < 3 results, broaden to constitutional provisions
    if len(tier1_results) < 3:
        constitutional_filter = build_qdrant_filter({"qdrant_filter": {"act_name": ["Constitution of India"]}})
        tier2_results = qdrant_client.search(
            collection_name="legal_knowledge",
            query_vector=embedding,
            query_filter=constitutional_filter,
            limit=5,
            score_threshold=0.60
        )
        tier1_results = tier1_results + tier2_results
    
    # Step 5: Tier 3 — if still < 2 results, do full-text PostgreSQL search as fallback
    if len(tier1_results) < 2:
        pg_results = await search_postgres_fulltext(
            query=query,
            acts=domain_config.get("primary_acts", []),
            limit=5
        )
        # Convert PG results to same format
        tier1_results = tier1_results + pg_results
    
    # Step 6: De-duplicate by section number
    seen_sections = set()
    unique_results = []
    for r in tier1_results:
        payload = r.payload if hasattr(r, 'payload') else {}
        key = f"{payload.get('act_name')}_{payload.get('section_number')}"
        if key not in seen_sections:
            seen_sections.add(key)
            unique_results.append(r)
            
    # Validation: After retrieval, check each result's act_name is in domain_config["primary_acts"]
    # Remove any result whose act_name is not in the allowed list (hard guard)
    # Log removed results as warnings
    validated_results = []
    allowed_acts = set(domain_config.get("primary_acts", []))
    # Additionally allow constitutional provisions if we fell back to tier 2
    if len([x for x in tier1_results]) < 3: # rough check to allow constitution if used
        allowed_acts.add("Constitution of India")
        
    for r in unique_results:
        payload = r.payload if hasattr(r, 'payload') else {}
        act_name = payload.get("act_name")
        if act_name in allowed_acts:
            validated_results.append(r)
        else:
            logger.warning(f"Validation hard guard: Removed result with act_name '{act_name}' not in allowed list.")
            
    unique_results = validated_results
    
    # Step 7: Re-rank using Gemini (ask it to score each result 1-10 for relevance)
    if len(unique_results) > 5:
        unique_results = await rerank_with_gemini(query, unique_results, domain=intent.legal_domain)
    
    # Step 8: Separate into laws vs cases
    laws = []
    cases = []
    for r in unique_results:
        payload = r.payload if hasattr(r, 'payload') else {}
        doc_type = payload.get("doc_type")
        if doc_type in ["statute", "act", "section"]:
            laws.append(r)
        elif doc_type == "judgment":
            cases.append(r)
        else:
            # Fallback if doc_type is missing, assume law
            laws.append(r)
    
    return RetrievalResult(
        laws=laws[:6],
        cases=cases[:4],
        total_retrieved=len(unique_results),
        domain_used=intent.legal_domain,
        retrieval_tiers_used=3 if len(tier1_results) < 2 else (2 if len(tier1_results) < 3 else 1)
    )

def qdrant_search(query: str, top_k: int = 10, **kwargs) -> List[Dict[str, Any]]:
    """Fallback qdrant_search function for older modules."""
    return []
