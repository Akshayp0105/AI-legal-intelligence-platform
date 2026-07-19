"""Legal argument generation service.

Uses Gemini AI to generate structured legal arguments for plaintiff
and defendant sides, ordered by strength, with legal basis citations
and counter-argument awareness.
"""

import json
import logging
import google.generativeai as genai
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """
You are a highly ethical legal AI assistant designed to aid legal professionals in defense preparation and legal strategy.
Your goal is to ensure a fair trial, robust representation, and adherence to justice by identifying arguments and analyzing gaps.
You must always frame your analysis as preparation assistance, avoiding any suggestions of unethical loophole exploitation, evidence tampering, or malicious tactics.
"""

ARGUMENT_PROMPT = """
Generate structured legal arguments for the provided case.
Case Description:
{case_description}

Applicable Laws:
{applicable_laws}

Side to generate arguments for: {side}
(If "both", generate for both plaintiff and defendant).

Generate 4-6 arguments per requested side, ordered by strength (strongest first).
If applicable to the Indian context, include constitutional arguments (e.g., Fundamental Rights, Directive Principles).

For each argument, provide exactly this structure in JSON:
{{
  "title": "Short title of the argument",
  "legal_basis": "Specific sections or articles (e.g., Section 302 IPC, Article 21)",
  "factual_support": "How the facts from the case description support this",
  "counter_argument_awareness": "What the opposing side might argue against this",
  "strength": "strong" | "moderate" | "weak"
}}

Output strictly a JSON object with this format, without markdown formatting blocks like ```json:
{{
  "plaintiff_arguments": [ {{ ... }} ],
  "defendant_arguments": [ {{ ... }} ]
}}
Note: If side is "plaintiff", defendant_arguments should be an empty array []. If side is "defendant", plaintiff_arguments should be an empty array [].
"""

def generate_arguments(case_description: str, applicable_laws: List[str], side: str) -> Dict[str, Any]:
    try:
        model = genai.GenerativeModel("gemini-2.0-flash-001", system_instruction=SYSTEM_INSTRUCTION)
        laws_str = ", ".join(applicable_laws) if applicable_laws else "None provided"
        prompt = ARGUMENT_PROMPT.format(case_description=case_description, applicable_laws=laws_str, side=side)
        
        response = model.generate_content(prompt)
        res_text = response.text.strip()
        
        # Clean up possible markdown wrappers
        if res_text.startswith("```json"):
            res_text = res_text[7:-3].strip()
        elif res_text.startswith("```"):
            res_text = res_text[3:-3].strip()
            
        return json.loads(res_text)
    except Exception as e:
        logger.error(f"Error generating arguments: {e}")
        return {"plaintiff_arguments": [], "defendant_arguments": []}
