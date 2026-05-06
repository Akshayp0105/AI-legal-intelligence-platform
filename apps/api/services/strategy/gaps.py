import json
import logging
import google.generativeai as genai
from typing import List, Dict, Any

from services.rag.retriever import qdrant_search

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """
You are a highly ethical legal AI assistant designed to aid legal professionals in defense preparation and legal strategy.
Your goal is to ensure a fair trial, robust representation, and adherence to justice by identifying weaknesses and gaps in the case.
You must always frame your analysis as preparation assistance, avoiding any suggestions of unethical loophole exploitation, evidence tampering, or malicious tactics.
"""

GAP_IDENTIFICATION_PROMPT = """
Analyze the following case description and document text to identify potential legal gaps and weaknesses.
Look for:
a. Missing evidence gaps
b. Procedural weaknesses (e.g., delays)
c. Alternative legal interpretations
d. Jurisdictional issues
e. Limitation period concerns

Case Description:
{case_description}

Document Text:
{document_text}

For each identified gap, provide exactly this structure in JSON format (no markdown blocks like ```json):
{{
  "gaps": [
    {{
      "type": "evidence | procedural | legal_interpretation | jurisdiction | limitation",
      "description": "Detailed description of the gap.",
      "severity": "critical | moderate | minor",
      "remedy": "Suggested remedy or counter-strategy."
    }}
  ]
}}
"""

RAG_AUGMENTATION_PROMPT = """
You identified the following legal gap in a case:
{gap_description}

Here are excerpts from some past precedents:
{precedents_text}

Did a similar gap or weakness cause a case dismissal or negative outcome in any of these precedents?
If yes, rewrite the gap description to briefly mention this (e.g., "... Similar procedural delays caused dismissal in past cases such as X.").
If no, just return the original gap description.

Return ONLY the final (potentially modified) gap description string, nothing else.
"""

def analyze_gaps(case_description: str, documents_texts: List[str]) -> Dict[str, Any]:
    try:
        model = genai.GenerativeModel("gemini-1.5-pro", system_instruction=SYSTEM_INSTRUCTION)
        
        doc_text_combined = "\n\n".join(documents_texts)
        if len(doc_text_combined) > 50000:
            doc_text_combined = doc_text_combined[:50000] # Truncate to avoid massive prompts
            
        prompt = GAP_IDENTIFICATION_PROMPT.format(
            case_description=case_description, 
            document_text=doc_text_combined
        )
        
        response = model.generate_content(prompt)
        res_text = response.text.strip()
        
        if res_text.startswith("```json"):
            res_text = res_text[7:-3].strip()
        elif res_text.startswith("```"):
            res_text = res_text[3:-3].strip()
            
        gaps_data = json.loads(res_text)
        gaps = gaps_data.get("gaps", [])
        
        # Augment with RAG
        for gap in gaps:
            search_query = f"{gap.get('type', '')} weakness: {gap.get('description', '')}"
            try:
                # Top 3 to avoid overloading prompt
                results = qdrant_search(query=search_query, top_k=3)
                precedents_texts = []
                for res in results:
                    payload = res.get('payload', {})
                    text = payload.get('text', '')
                    if text:
                        precedents_texts.append(text[:1000]) # Take first 1000 chars of each match
                        
                if precedents_texts:
                    aug_prompt = RAG_AUGMENTATION_PROMPT.format(
                        gap_description=gap.get("description", ""),
                        precedents_text="\n---\n".join(precedents_texts)
                    )
                    aug_response = model.generate_content(aug_prompt)
                    new_desc = aug_response.text.strip()
                    if new_desc:
                        gap["description"] = new_desc
            except Exception as e:
                logger.error(f"Error during RAG augmentation for gap: {e}")
                
        return {"gaps": gaps}
    except Exception as e:
        logger.error(f"Error analyzing gaps: {e}")
        return {"gaps": []}
