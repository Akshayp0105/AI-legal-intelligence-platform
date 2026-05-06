import json
import logging
import google.generativeai as genai
from qdrant_client.http import models as qdrant_models
from core.qdrant import qdrant_client, COLLECTION_NAME
from services.rag.embedder import get_query_embedding
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

COMPARISON_PROMPT = """
You are a legal expert. You are given a case description and a potentially similar past court judgment.
Compare the two cases and explain why they are similar in exactly 3 sentences. Focus on the legal reasoning, outcomes, and facts.
Also extract the outcome of the past judgment (e.g. favour_plaintiff, favour_defendant, mixed, dismissed).
Finally, provide a single key reasoning point.

Output exactly a JSON object with this format, and no other text:
{
  "comparison_note": "This case is similar to the past judgment because...",
  "outcome": "favour_plaintiff",
  "key_reasoning": "The court found that..."
}

Case Description:
{case_description}

Past Judgment Text (Truncated):
{judgment_text}
"""

def analyze_similar_cases(case_description: str, top_k: int = 10, court: Optional[str] = None, year_from: Optional[int] = None, year_to: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Find similar past judgments and use Gemini to generate a comparison.
    """
    try:
        query_vector = get_query_embedding(case_description)
    except Exception as e:
        logger.error(f"Error getting query embedding for matcher: {e}")
        return []

    must_conditions = [
        qdrant_models.FieldCondition(
            key="type",
            match=qdrant_models.MatchValue(value="judgment")
        )
    ]
    
    if court:
        must_conditions.append(
            qdrant_models.FieldCondition(
                key="court",
                match=qdrant_models.MatchValue(value=court)
            )
        )
        
    if year_from is not None or year_to is not None:
        range_kwargs = {}
        if year_from is not None:
            range_kwargs["gte"] = year_from
        if year_to is not None:
            range_kwargs["lte"] = year_to
        must_conditions.append(
            qdrant_models.FieldCondition(
                key="year",
                range=qdrant_models.Range(**range_kwargs)
            )
        )

    try:
        search_results = qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=qdrant_models.Filter(must=must_conditions),
            limit=top_k,
            with_payload=True
        )
    except Exception as e:
        logger.error(f"Error searching Qdrant for similar cases: {e}")
        return []

    model = genai.GenerativeModel("gemini-1.5-pro")
    
    similar_cases = []
    for result in search_results:
        payload = result.payload or {}
        judgment_text = payload.get("text", "")[:3000]
        
        # Calculate similarity score 0-100 based on cosine similarity result.score
        # Qdrant cosine distance score is typically -1 to 1.
        # Assuming normalized vectors, score is 0 to 1 where 1 is identical.
        sim_score = max(0, min(100, int(result.score * 100)))
        
        prompt = COMPARISON_PROMPT.format(case_description=case_description, judgment_text=judgment_text)
        
        comparison_note = "Similar case."
        outcome = "unknown"
        key_reasoning = "N/A"
        
        try:
            gemini_res = model.generate_content(prompt)
            res_text = gemini_res.text.strip()
            if res_text.startswith("```json"):
                res_text = res_text[7:-3].strip()
                
            parsed = json.loads(res_text)
            comparison_note = parsed.get("comparison_note", comparison_note)
            outcome = parsed.get("outcome", outcome)
            key_reasoning = parsed.get("key_reasoning", key_reasoning)
        except Exception as e:
            logger.error(f"Error generating comparison with Gemini: {e}")
            
        similar_cases.append({
            "case_name": payload.get("case_id", "Unknown Case"),  # Fallback to case_id if name isn't stored
            "citation": payload.get("case_id", ""),
            "court": payload.get("court", ""),
            "year": payload.get("year"),
            "similarity_score": sim_score,
            "outcome": outcome,
            "key_reasoning": key_reasoning,
            "relevance_note": comparison_note
        })
        
    return similar_cases
