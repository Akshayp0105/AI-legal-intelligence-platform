import os
import json
import hashlib
import redis
import logging
from typing import AsyncGenerator, List, Dict, Any, Optional
import google.generativeai as genai

from core.prompts import (
    MASTER_ANALYSIS_PROMPT, 
    ISSUE_EXTRACTION_PROMPT, 
    TRANSLATE_TO_ENGLISH_PROMPT,
    TRANSLATE_SUMMARY_PROMPT
)
from services.rag.retriever import qdrant_search

logger = logging.getLogger(__name__)

# Initialize Redis client
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(redis_url, decode_responses=True)
CACHE_TTL = 3600  # 1 hour

def get_gemini_model(system_instruction: Optional[str] = None):
    kwargs = {}
    if system_instruction:
        kwargs["system_instruction"] = system_instruction
    return genai.GenerativeModel("gemini-2.0-flash-001", **kwargs)

async def analyze_case_stream(case_description: str, language: str = "en", chat_history: Optional[List[Dict[str, Any]]] = None, session_id: Optional[str] = None) -> AsyncGenerator[str, None]:
    from core.intent_classifier import classify_intent
    from core.domain_router import get_domain_config, build_qdrant_filter, get_relevant_laws_list
    from core.memory import ConversationMemoryManager
    from core.validator import validate_response
    from core.prompts import PromptBuilder, parse_gemini_response
    import uuid

    if not session_id:
        session_id = str(uuid.uuid4())

    memory_manager = ConversationMemoryManager()
    session = await memory_manager.get_or_create_session(session_id, "unknown")
    
    # Classify intent
    new_intent = await classify_intent(case_description, chat_history)
    
    # Handle follow-up domain inheritance
    intent = await memory_manager.inherit_domain_if_followup(session_id, new_intent, case_description)
    
    domain_config = get_domain_config(intent.legal_domain)
    
    if not intent.is_legal_query:
        yield f"data: {json.dumps({'chunk': 'I am a legal AI assistant. I can only answer questions related to Indian law.'})}\n\n"
        return
        
    if intent.clarification_needed:
        yield f"data: {json.dumps({'chunk': intent.clarification_question})}\n\n"
        return
        
    if intent.confidence < 0.5:
        yield f"data: {json.dumps({'chunk': 'I am not entirely sure about the specifics of your query. Could you please rephrase or provide more details?'})}\n\n"
        return

    # Extract new entities to case context
    if intent.entities:
        await memory_manager.update_case_context(session_id, intent.entities.model_dump())

    sys_prompt = PromptBuilder.build_system_prompt(domain_config, "public", language)
    model = get_gemini_model(system_instruction=sys_prompt)
    
    # Check cache first
    cache_key = f"analysis:{hashlib.sha256(case_description.encode('utf-8')).hexdigest()}:{language}"
    try:
        cached_result = redis_client.get(cache_key)
        if cached_result:
            yield f"data: {json.dumps({'chunk': cached_result, 'is_cached': True})}\n\n"
            return
    except Exception as e:
        logger.warning(f"Redis cache access failed: {e}")

    # RAG retrieval
    retrieved_context_list = []
    q_filter = build_qdrant_filter(domain_config)
    retrieval_top_k = domain_config.get("retrieval_top_k", 5)
    
    # Use context memory if no new entities but there is context
    search_query = case_description
    if session.current_case_context:
        search_query += f" (Context: {json.dumps(session.current_case_context)})"
        
    try:
        results = qdrant_search(
            query=search_query, 
            top_k=retrieval_top_k, 
            custom_filter=q_filter
        )
        for res in results:
            payload = res.get('payload', {})
            text = payload.get('text', '')
            if text and text not in retrieved_context_list:
                retrieved_context_list.append(payload)
    except Exception as e:
        logger.error(f"Retrieval failed for issue '{search_query}': {e}")
    
    # Build prompt with memory context
    mem_context = await memory_manager.get_context_for_prompt(session_id)
    
    prompt = PromptBuilder.build_user_prompt(
        user_message=case_description,
        entities=mem_context["current_case_context"],
        retrieved_laws=retrieved_context_list,
        retrieved_cases=[], # Need similar cases logic if available
        chat_history=mem_context["chat_history"]
    )

    try:
        response = model.generate_content(prompt, stream=False)
        full_response_text = response.text
        
        # Parse and Validate Response
        analysis_obj = parse_gemini_response(full_response_text)
        validated = validate_response(analysis_obj, intent, domain_config, len(retrieved_context_list))
        
        final_dict = validated.final_response.model_dump()
        if validated.data_gap:
            final_dict["data_gap"] = True
            final_dict["data_gap_message"] = "I could not find specific sections in my database for this query. Here is general guidance based on my legal knowledge."
            
        final_json_str = json.dumps(final_dict)

        # Add to memory
        await memory_manager.add_message(session_id, "user", case_description)
        await memory_manager.add_message(session_id, "assistant", final_dict.get("conversational_reply", ""))

        # Chunk the output to simulate streaming for the frontend
        chunk_size = 100
        for i in range(0, len(final_json_str), chunk_size):
            chunk = final_json_str[i:i+chunk_size]
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"

        # Cache the final response
        try:
            redis_client.setex(cache_key, CACHE_TTL, final_json_str)
        except Exception as e:
            logger.warning(f"Redis cache set failed: {e}")

    except Exception as e:
        logger.error(f"Model generation failed: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
