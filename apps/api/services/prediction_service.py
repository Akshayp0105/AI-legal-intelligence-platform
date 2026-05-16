import json
import logging
import google.generativeai as genai
from schemas.prediction import CaseStrengthScore, PredictionRequest
from core.prediction_prompts import PREDICTION_SCORING_PROMPT
from services.rag.retriever import qdrant_search

logger = logging.getLogger(__name__)

def get_gemini_model():
    return genai.GenerativeModel("gemini-1.5-pro-latest")

async def predict_case_strength(request: PredictionRequest) -> dict:
    # 1. Fetch similar cases from Qdrant
    similar_cases_context = ""
    try:
        results = qdrant_search(query=request.case_description, top_k=5)
        context_parts = []
        for res in results:
            payload = res.get('payload', {})
            text = payload.get('text', '')
            if text:
                context_parts.append(text)
        if context_parts:
            similar_cases_context = "\\n\\n".join(context_parts)
        else:
            similar_cases_context = "No highly similar cases found in the database."
    except Exception as e:
        logger.error(f"Failed to fetch similar cases from Qdrant: {e}")
        similar_cases_context = "Error retrieving similar cases."

    # 2. Prepare prompt
    prompt = PREDICTION_SCORING_PROMPT.format(
        case_description=request.case_description,
        case_type=request.case_type,
        court_level=request.court_level,
        similar_cases_context=similar_cases_context
    )

    # 3. Call Gemini
    model = get_gemini_model()
    try:
        response = model.generate_content(prompt)
        clean_json = response.text.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:-3]
        elif clean_json.startswith("```"):
            clean_json = clean_json[3:-3]
            
        parsed_json = json.loads(clean_json)
        # Validate with Pydantic model
        validated_score = CaseStrengthScore(**parsed_json)
        return validated_score.model_dump()
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini JSON response: {e}. Response was: {response.text}")
        raise ValueError("Invalid JSON received from Gemini")
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise Exception(f"Failed to generate prediction: {str(e)}")
