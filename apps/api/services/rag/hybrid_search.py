import logging
import json
import google.generativeai as genai
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from services.rag.retriever import qdrant_search
from models.knowledge import LegalKnowledge
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

async def pg_fulltext_search(
    db: AsyncSession,
    query: str,
    top_k: int = 10,
    act_name: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    court: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Perform PostgreSQL full-text search on the legal_knowledge table.
    """
    try:
        # Build base query
        # Using websearch_to_tsquery for better handling of user input
        sql_query = """
            SELECT id, text, source, section_number, act_name, case_id, court, year, chunk_index,
                   ts_rank(search_vector, websearch_to_tsquery('english', :query)) as rank
            FROM legal_knowledge
            WHERE search_vector @@ websearch_to_tsquery('english', :query)
        """
        
        params = {"query": query, "limit": top_k}
        
        # Add filters
        if act_name:
            sql_query += " AND act_name = :act_name"
            params["act_name"] = act_name
        if court:
            sql_query += " AND court = :court"
            params["court"] = court
        if year_from is not None:
            sql_query += " AND year >= :year_from"
            params["year_from"] = year_from
        if year_to is not None:
            sql_query += " AND year <= :year_to"
            params["year_to"] = year_to
            
        sql_query += " ORDER BY rank DESC LIMIT :limit"
        
        result = await db.execute(text(sql_query), params)
        rows = result.fetchall()
        
        formatted_results = []
        for row in rows:
            formatted_results.append({
                "id": str(row.id),
                "score": float(row.rank),
                "payload": {
                    "text": row.text,
                    "source": row.source,
                    "section_number": row.section_number,
                    "act_name": row.act_name,
                    "case_id": row.case_id,
                    "court": row.court,
                    "year": row.year,
                    "chunk_index": row.chunk_index
                }
            })
            
        return formatted_results
        
    except Exception as e:
        logger.error(f"Error in PostgreSQL full-text search: {e}")
        return []

def normalize_scores(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not results:
        return []
    max_score = max([r["score"] for r in results])
    min_score = min([r["score"] for r in results])
    
    if max_score == min_score:
        for r in results:
            r["normalized_score"] = 1.0
    else:
        for r in results:
            r["normalized_score"] = (r["score"] - min_score) / (max_score - min_score)
            
    return results

def rerank_with_gemini(query: str, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Prompt Gemini to score each result 1-10 for relevance to the query.
    """
    if not results:
        return []
        
    prompt = f"Given the user query: '{query}', rate the relevance of the following legal text chunks from 1 to 10.\n"
    prompt += "Return the result as a JSON array of objects with keys 'index' and 'relevance_score'.\n\n"
    
    for i, res in enumerate(results):
        prompt += f"Chunk {i}:\n{res['payload'].get('text', '')[:500]}...\n\n"
        
    try:
        model = genai.GenerativeModel('models/gemini-1.5-flash')
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        scores_data = json.loads(response.text)
        
        # Merge scores back
        for score_info in scores_data:
            idx = score_info.get("index")
            relevance = score_info.get("relevance_score", 0)
            if 0 <= idx < len(results):
                results[idx]["gemini_score"] = float(relevance)
                
        # Sort by Gemini score descending
        results.sort(key=lambda x: x.get("gemini_score", 0), reverse=True)
        return results
        
    except Exception as e:
        logger.error(f"Error during Gemini reranking: {e}")
        # If reranking fails, just return the original results
        return results

async def hybrid_search(
    db: AsyncSession,
    query: str,
    top_k: int = 10,
    filters: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Combine Qdrant vector search (70%) with PostgreSQL full-text search (30%).
    Re-rank using Gemini.
    """
    filters = filters or {}
    act_name = filters.get("act")
    year_from = filters.get("year_from")
    year_to = filters.get("year_to")
    court = filters.get("court")
    
    # 1. Qdrant Search
    qdrant_results = qdrant_search(query, top_k=top_k, act_name=act_name, year_from=year_from, year_to=year_to, court=court)
    
    # 2. Postgres Search
    pg_results = await pg_fulltext_search(db, query, top_k=top_k, act_name=act_name, year_from=year_from, year_to=year_to, court=court)
    
    # Normalize scores
    qdrant_results = normalize_scores(qdrant_results)
    pg_results = normalize_scores(pg_results)
    
    # Combine results
    combined_map = {}
    
    # Weightings
    W_VECTOR = 0.7
    W_FTS = 0.3
    
    for r in qdrant_results:
        text_content = r["payload"].get("text", "")
        # Use text hash or chunk index + source as key if ID from FTS and Qdrant differ
        key = text_content[:100]
        combined_map[key] = r
        combined_map[key]["hybrid_score"] = r["normalized_score"] * W_VECTOR
        
    for r in pg_results:
        text_content = r["payload"].get("text", "")
        key = text_content[:100]
        if key in combined_map:
            combined_map[key]["hybrid_score"] += r["normalized_score"] * W_FTS
        else:
            combined_map[key] = r
            combined_map[key]["hybrid_score"] = r["normalized_score"] * W_FTS
            
    combined_list = list(combined_map.values())
    combined_list.sort(key=lambda x: x["hybrid_score"], reverse=True)
    
    # Take top 2 * top_k for reranking to ensure we have good candidates
    candidates = combined_list[:top_k * 2]
    
    # Rerank with Gemini
    reranked_results = rerank_with_gemini(query, candidates)
    
    # Return top_k
    return reranked_results[:top_k]
