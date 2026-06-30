import json
import hashlib
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import google.generativeai as genai
import redis.asyncio as aioredis

from core.logging import get_logger

logger = get_logger(__name__)

import os

try:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    if redis_url.startswith("redis://") or redis_url.startswith("rediss://"):
        redis_client = aioredis.from_url(redis_url, decode_responses=True)
    else:
        redis_client = aioredis.Redis(host=redis_url, port=6379, db=0, decode_responses=True)
except Exception as e:
    redis_client = None
    logger.warning(f"Failed to initialize Redis in intent_classifier: {e}")

DOMAIN_MAP = {
    "criminal": ["murder", "theft", "rape", "assault", "FIR", "bail", "IPC", "CrPC", "arrest", "cognizable"],
    "corporate": ["company", "registration", "partnership", "MCA", "incorporation", "MOA", "AOA", "director", "shares", "GST", "trademark"],
    "property": ["land", "plot", "sale deed", "encroachment", "possession", "tenancy", "rent", "eviction", "mutation"],
    "family": ["divorce", "maintenance", "custody", "adoption", "succession", "will", "marriage", "dowry"],
    "consumer": ["deficiency", "service", "product", "refund", "complaint", "NCDRC", "district forum", "e-commerce"],
    "labour": ["termination", "salary", "PF", "ESI", "gratuity", "employment", "factory", "workmen"],
    "constitutional": ["fundamental rights", "PIL", "writ", "High Court", "Supreme Court", "Article", "fundamental duty"],
    "cyber": ["hacking", "fraud", "online", "IT Act", "data", "social media", "defamation", "cybercrime"],
    "contract": ["agreement", "breach", "damages", "arbitration", "clause", "MOU", "NDA", "bond"],
    "general": []   # fallback
}

class Entities(BaseModel):
    party_names: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)
    dates: List[str] = Field(default_factory=list)
    amounts: List[str] = Field(default_factory=list)
    companies: List[str] = Field(default_factory=list)

class ClassifiedIntent(BaseModel):
    legal_domain: str = "general"
    query_type: str = "question"
    is_legal_query: bool = True
    entities: Entities = Field(default_factory=Entities)
    language: str = "en"
    urgency: str = "normal"
    clarification_needed: bool = False
    clarification_question: str = ""
    confidence: float = 1.0

SYSTEM = """You are a legal domain classifier for an Indian law AI assistant.
Your ONLY job is to analyze the user's message and return a JSON object.
You must NOT answer the legal question itself. Only classify it.
Return ONLY valid JSON. No explanation. No markdown. No preamble."""

async def classify_intent(user_message: str, chat_history: Optional[List[Dict[str, Any]]] = None) -> ClassifiedIntent:
    if chat_history is None:
        chat_history = []
        
    cache_key = f"intent:{hashlib.sha256(user_message[:200].encode('utf-8')).hexdigest()}"
    
    if redis_client:
        try:
            cached_intent = await redis_client.get(cache_key)
            if cached_intent:
                logger.info("Returning cached intent classification")
                return ClassifiedIntent.model_validate_json(cached_intent)
        except Exception as e:
            logger.warning(f"Redis get failed in classify_intent: {e}")

    try:
        model = genai.GenerativeModel("gemini-2.0-flash-001", system_instruction=SYSTEM)
        history_context = chat_history[-3:] if len(chat_history) > 3 else chat_history
        
        USER_PROMPT = f"""Classify this legal query:

User message: "{user_message}"
Previous messages context: {json.dumps(history_context)}

Return this exact JSON structure:
{{
  "legal_domain": "",
  "query_type": "",
  "is_legal_query": true,
  "entities": {{
    "party_names": [],
    "locations": [],
    "dates": [],
    "amounts": [],
    "companies": []
  }},
  "language": "",
  "urgency": "",
  "clarification_needed": false,
  "clarification_question": "",
  "confidence": 1.0
}}

Rules:
- If user says "hi", "hello", "thanks" → is_legal_query: false
- If query mentions company/registration/partnership/MOU/MOA → legal_domain: "corporate"
- If query mentions murder/FIR/bail/arrest/IPC → legal_domain: "criminal"  
- If too vague ("I have a legal problem") → clarification_needed: true
- Detect if language is Malayalam, Hindi, Tamil etc and set language accordingly
"""
        response = await model.generate_content_async(USER_PROMPT)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
            
        parsed_data = json.loads(text)
        intent = ClassifiedIntent(**parsed_data)
        
        # cache the result with TTL 3600 seconds
        if redis_client:
            try:
                await redis_client.setex(cache_key, 3600, intent.model_dump_json())
            except Exception as e:
                logger.warning(f"Redis set failed in classify_intent: {e}")
                
        return intent

    except Exception as e:
        logger.error(f"Intent classification failed: {e}")
        return ClassifiedIntent(legal_domain="general", clarification_needed=False)
