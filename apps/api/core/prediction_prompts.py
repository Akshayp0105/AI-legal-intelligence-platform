"""Prediction scoring prompts for Gemini-based case strength analysis."""

PREDICTION_SCORING_PROMPT = """
You are an expert legal strategist and AI analyst.
Analyze the following case description and provide a structured JSON response containing a case strength prediction.

Case Description:
{case_description}

Case Type: {case_type}
Court Level: {court_level}

Similar Past Cases & Outcomes Context:
{similar_cases_context}

Evaluate the case and provide scores (0-100) for the following dimensions:
1. Evidence Strength
2. Legal Provisions Match
3. Precedent Support (Boost this score if similar past cases were decided favorably, reduce if unfavorably)
4. Procedural Compliance
5. Witness Credibility

Provide an overall score out of 100 based on these factors.
Identify risk factors and positive factors.
Provide outcome probabilities (success, partial_success, failure) which must sum up to 100.
Provide strategic suggestions based on the overall score:
- If < 40: Consider settlement or point out major flaws.
- If 40-65: Suggest ways to strengthen evidence or procedural aspects.
- If > 65: Suggest proceeding confidently with specific tactical steps.

Respond ONLY with a valid JSON matching this schema:
{{
  "overall_score": 72,
  "confidence": "low|medium|high",
  "factors": {{
    "evidence_strength": 65,
    "legal_provisions_match": 85,
    "precedent_support": 70,
    "procedural_compliance": 80,
    "witness_credibility": 60
  }},
  "risk_factors": ["string"],
  "positive_factors": ["string"],
  "outcome_probability": {{
    "success": 68,
    "partial_success": 20,
    "failure": 12
  }},
  "strategy_suggestions": ["string"]
}}
"""
