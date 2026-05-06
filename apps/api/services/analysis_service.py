import os
import json
import hashlib
import redis
import logging
from typing import AsyncGenerator
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
# Consider using redis.asyncio in production, but synchronous is used here for simplicity.
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
CACHE_TTL = 3600  # 1 hour

def get_gemini_model():
    return genai.GenerativeModel("gemini-1.5-pro")

async def analyze_case_stream(case_description: str, language: str = "en") -> AsyncGenerator[str, None]:
    model = get_gemini_model()
    
    # Check cache first
    cache_key = f"analysis:{hashlib.sha256(case_description.encode('utf-8')).hexdigest()}:{language}"
    try:
        cached_result = redis_client.get(cache_key)
        if cached_result:
            yield f"data: {json.dumps({'chunk': cached_result, 'is_cached': True})}\n\n"
            return
    except Exception as e:
        logger.warning(f"Redis cache access failed: {e}")

    # Step 4: Handle language translation to English
    if language != "en":
        try:
            translation_res = model.generate_content(TRANSLATE_TO_ENGLISH_PROMPT.format(text=case_description))
            case_description = translation_res.text.strip()
            logger.info("Translated case description to English")
        except Exception as e:
            logger.error(f"Translation failed: {e}")

    # Step A: Query expansion - Extract 5 key legal issues
    try:
        issues_res = model.generate_content(ISSUE_EXTRACTION_PROMPT.format(case_description=case_description))
        issues = [i.strip() for i in issues_res.text.split(',')]
        logger.info(f"Extracted issues: {issues}")
    except Exception as e:
        logger.error(f"Issue extraction failed: {e}")
        issues = [case_description]

    # Step B: RAG retrieval
    retrieved_context_list = []
    for issue in issues:
        if issue:
            try:
                results = qdrant_search(query=issue, top_k=5)
                for res in results:
                    payload = res.get('payload', {})
                    text = payload.get('text', '')
                    if text and text not in retrieved_context_list:
                        retrieved_context_list.append(text)
            except Exception as e:
                logger.error(f"Retrieval failed for issue '{issue}': {e}")
    
    retrieved_context_str = "\n\n".join(retrieved_context_list)

    # Step C: Synthesis
    prompt = MASTER_ANALYSIS_PROMPT.format(
        case_description=case_description,
        retrieved_context=retrieved_context_str
    )

    try:
        response = model.generate_content(prompt, stream=True)
        full_response = ""
        
        for chunk in response:
            if chunk.text:
                full_response += chunk.text
                # Stream the JSON chunks via SSE
                yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"

        # Step 4 continued: Translate summary back if needed
        if language != "en":
            try:
                clean_json = full_response.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:-3]
                parsed_json = json.loads(clean_json)
                summary_text = parsed_json.get("summary", "")
                
                if summary_text:
                    translated_summary_res = model.generate_content(
                        TRANSLATE_SUMMARY_PROMPT.format(target_language=language, summary=summary_text)
                    )
                    translated_summary = translated_summary_res.text.strip()
                    yield f"data: {json.dumps({'translated_summary': translated_summary})}\n\n"
            except json.JSONDecodeError:
                logger.error("Failed to parse JSON for summary translation")
            except Exception as e:
                logger.error(f"Summary translation failed: {e}")

        # Cache the final response
        try:
            redis_client.setex(cache_key, CACHE_TTL, full_response)
        except Exception as e:
            logger.warning(f"Redis cache set failed: {e}")

    except Exception as e:
        logger.error(f"Model generation failed: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
