import logging
from qdrant_client.http import models as qdrant_models
from core.qdrant import qdrant_client, COLLECTION_NAME
from services.rag.embedder import get_query_embedding
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

def qdrant_search(
    query: str, 
    top_k: int = 10, 
    act_name: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    court: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Embed the query and perform a semantic search in Qdrant.
    Apply filters if specified.
    """
    try:
        # Get query embedding
        query_vector = get_query_embedding(query)
        
        # Build filter conditions
        must_conditions = []
        if act_name:
            must_conditions.append(
                qdrant_models.FieldCondition(
                    key="act_name",
                    match=qdrant_models.MatchValue(value=act_name)
                )
            )
        if court:
            must_conditions.append(
                qdrant_models.FieldCondition(
                    key="court",
                    match=qdrant_models.MatchValue(value=court)
                )
            )
        
        # Range filter for year
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
            
        search_filter = None
        if must_conditions:
            search_filter = qdrant_models.Filter(must=must_conditions)
            
        # Execute search
        results = qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=search_filter,
            limit=top_k,
            with_payload=True
        )
        
        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                "id": result.id,
                "score": result.score,
                "payload": result.payload
            })
            
        return formatted_results
        
    except Exception as e:
        logger.error(f"Error during Qdrant search: {e}")
        raise
