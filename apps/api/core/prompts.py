MASTER_ANALYSIS_PROMPT = """You are LexAI, an advanced legal intelligence engine.
Analyze the following case description and retrieved legal context.

Return your response ONLY as a JSON object matching this exact structure:
{
  "summary": "plain language summary of the case",
  "applicable_laws": [{"act": "IPC", "section": "302", "description": "...", "relevance": "..."}],
  "constitutional_provisions": [{"article": "21", "description": "...", "relevance": "..."}],
  "similar_cases": [{"case_name": "...", "court": "...", "year": 2020, "summary": "...", "outcome": "..."}],
  "legal_arguments": {
    "for_plaintiff": ["argument 1", "argument 2"],
    "for_defendant": ["argument 1", "argument 2"]
  },
  "case_gaps": ["gap/weakness 1", "gap/weakness 2"],
  "strength_score": 72,
  "confidence": "medium",
  "recommended_next_steps": ["step 1", "step 2"]
}

Case Description: {case_description}

Retrieved Legal Context:
{retrieved_context}
"""

ISSUE_EXTRACTION_PROMPT = """Extract the top 5 key legal issues from the following case description.
Return ONLY a comma-separated list of the 5 issues. No numbering or bullet points.

Case Description: {case_description}
"""

TRANSLATE_TO_ENGLISH_PROMPT = """Translate the following text to English. Ensure legal terms are accurately translated.
Return ONLY the translated text.

Text: {text}
"""

TRANSLATE_SUMMARY_PROMPT = """Translate the following case summary to {target_language}.
Return ONLY the translated summary.

Summary: {summary}
"""
