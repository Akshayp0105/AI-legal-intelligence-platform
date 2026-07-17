import json
import re
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ApplicableLaw(BaseModel):
    act: str
    section: str
    title: str
    explanation: str
    relevance: str

class LegalAnalysis(BaseModel):
    situation_summary: str
    key_legal_issues: List[str]
    user_rights: List[str]
    user_obligations: List[str]
    immediate_actions: List[str]
    court_jurisdiction: str
    limitation_period: str
    estimated_timeline: str

class PracticalStep(BaseModel):
    step: int
    action: str
    where: str
    documents_needed: List[str]
    cost_estimate: str

class AnalysisResponse(BaseModel):
    response_type: str = "analysis"
    conversational_reply: str
    domain: Optional[str] = "general"
    applicable_laws: List[ApplicableLaw] = Field(default_factory=list)
    legal_analysis: Optional[LegalAnalysis] = None
    practical_steps: List[PracticalStep] = Field(default_factory=list)
    documents_you_may_need: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    suggested_documents_to_draft: List[str] = Field(default_factory=list)
    disclaimer: str = "LexAI provides legal information, not legal advice. Consult a qualified advocate before taking legal action."
    needs_advocate: bool = False
    advocate_urgency: str = "optional"

# section_validator dict - simple check to flag wrong law acts per domain
section_validator = {
    "corporate": ["IPC", "Indian Penal Code", "CrPC", "Criminal Procedure Code", "BNS", "Bharatiya Nyaya Sanhita"],
    "civil": ["IPC", "Indian Penal Code", "CrPC", "Criminal Procedure Code", "BNS", "Bharatiya Nyaya Sanhita"],
    "criminal": ["Companies Act", "Consumer Protection Act", "RERA", "Real Estate Regulation Act"]
}

class PromptBuilder:
    """Builds structured system and user prompts for Gemini legal analysis.

    Generates domain-specific prompts incorporating user role, language,
    retrieved laws, and conversation history.
    """
    @staticmethod
    def build_system_prompt(domain_config: dict, user_role: str, language: str) -> str:
        primary_acts_str = ', '.join(domain_config.get('primary_acts', []))
        domain_name = domain_config.get('domain', 'general')
        prompt_role = domain_config.get('prompt_role', 'an expert Indian legal intelligence assistant.')
        
        lang_instruction = 'Respond in Malayalam. Use simple, everyday Malayalam words. Add English legal terms in brackets where necessary.' if language == 'ml' else 'Respond in clear, simple English. Avoid excessive legal jargon. Explain legal terms when you use them.'
        
        role_instruction = 'Use simple language, avoid jargon, explain every legal term' if user_role == 'public' else 'You can use standard legal terminology' if user_role == 'advocate' else 'Use academic legal language with citations'
        
        return f"""You are LexAI, an expert Indian legal intelligence assistant.

YOUR ROLE: {prompt_role}

CRITICAL RULES — YOU MUST FOLLOW THESE EXACTLY:
1. ONLY cite laws and sections from this domain's relevant acts: {primary_acts_str}
2. NEVER cite IPC sections for civil/corporate matters. NEVER cite Companies Act for criminal matters.
3. Always specify which court has jurisdiction (District Court / High Court / Supreme Court / NCDRC / Labour Tribunal etc.)
4. Give practical, actionable advice — not just theoretical legal text
5. If the user's query is vague or missing facts, ask ONE specific clarifying question before analysis
6. Always mention limitation periods where applicable
7. Flag if the user needs to consult a physical advocate urgently (arrest, custody, immediate court hearing)
8. Language: {lang_instruction}
9. User's background: {user_role} — {role_instruction}
10. NEVER make up case names, citations, or section numbers. If you are not certain of a section number, say "under the relevant provisions of [Act Name]" instead.

YOUR OUTPUT FORMAT — Always respond with this exact JSON structure:
{{
  "response_type": "analysis" | "question" | "explanation" | "draft_guidance" | "clarification_request",
  "conversational_reply": "A warm, helpful 2-3 sentence summary of what you found — this is what gets shown in the chat bubble. Written naturally, not like a legal document.",
  "domain": "{domain_name}",
  "applicable_laws": [
    {{"act": "Act name", "section": "Section number", "title": "Section title", "explanation": "Plain language explanation of how this section applies to the user's situation", "relevance": "high|medium|low"}}
  ],
  "legal_analysis": {{
    "situation_summary": "What the user's legal situation actually is in plain terms",
    "key_legal_issues": ["issue 1", "issue 2"],
    "user_rights": ["right 1", "right 2"],
    "user_obligations": ["obligation 1"],
    "immediate_actions": ["Do this first", "Then do this"],
    "court_jurisdiction": "Which court/forum handles this",
    "limitation_period": "Time limit to file a case if applicable",
    "estimated_timeline": "Rough timeline for resolution"
  }},
  "practical_steps": [
    {{"step": 1, "action": "What to do", "where": "Where to go / which office", "documents_needed": ["doc1", "doc2"], "cost_estimate": "approximate cost in INR if known"}}
  ],
  "documents_you_may_need": ["List of documents"],
  "red_flags": ["Urgent concern 1 if any"],
  "suggested_documents_to_draft": ["legal_notice" | "petition" | "consumer_complaint" | "bail_application" | "partnership_deed" etc],
  "disclaimer": "LexAI provides legal information, not legal advice. Consult a qualified advocate before taking legal action.",
  "needs_advocate": true | false,
  "advocate_urgency": "immediate" | "soon" | "optional"
}}
"""

    @staticmethod
    def build_user_prompt(user_message: str, entities: dict, retrieved_laws: list, retrieved_cases: list, chat_history: list) -> str:
        history_text = ""
        if chat_history:
            history_text = "CONVERSATION HISTORY (last 5 exchanges):\n"
            for msg in chat_history[-5:]:
                history_text += f"{msg.get('role', '').upper()}: {msg.get('content', '')[:300]}\n"
        
        laws_text = ""
        if retrieved_laws:
            laws_text = "RELEVANT LAW SECTIONS FROM DATABASE (use these, do not invent others):\n"
            for law in retrieved_laws:
                laws_text += f"- [{law.get('act', 'Unknown Act')} §{law.get('section', '')}] {law.get('title', '')}: {str(law.get('text', ''))[:400]}\n"
        
        cases_text = ""
        if retrieved_cases:
            cases_text = "SIMILAR COURT JUDGMENTS FROM DATABASE:\n"
            for case in retrieved_cases[:3]:
                cases_text += f"- {case.get('case_name', 'Unknown Case')} ({case.get('court', '')}, {case.get('year', '')}): {str(case.get('summary', ''))[:300]}\n"
        
        entities_text = f"EXTRACTED ENTITIES: {json.dumps(entities)}" if entities else ""
        
        return f"""{history_text}

{entities_text}

USER'S QUERY: {user_message}

{laws_text}

{cases_text}

INSTRUCTIONS:
- Answer the user's ACTUAL question (about: {user_message[:100]})
- Use ONLY the law sections provided above. Do not add sections not in the list.
- If retrieved laws are empty, say you need to search further and ask the user for more details
- Keep conversational_reply friendly and under 3 sentences
- Make practical_steps specific to India (mention actual government offices, portals like MCA21, RERA portal, consumer forum etc.)
- If this is a simple question (under 30 words, asking "what is X"), skip applicable_laws and just give a clear explanation in conversational_reply

Respond with ONLY the JSON object. No markdown. No explanation outside JSON."""


def parse_gemini_response(raw_response: str) -> AnalysisResponse:
    # Strip markdown code fences if present
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw_response.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # If parsing fails, create a minimal valid response
        data = {
            "response_type": "explanation",
            "conversational_reply": raw_response.strip(),
            "applicable_laws": [],
            "practical_steps": []
        }
    
    # Validation: Filter out hallucinated sections using section_validator
    domain = data.get("domain", "general").lower()
    applicable_laws = data.get("applicable_laws", [])
    
    if domain in section_validator and isinstance(applicable_laws, list):
        invalid_acts = [act.lower() for act in section_validator[domain]]
        valid_laws = []
        for law in applicable_laws:
            law_act = str(law.get("act", "")).lower()
            if not any(invalid_act in law_act for invalid_act in invalid_acts):
                valid_laws.append(law)
        data["applicable_laws"] = valid_laws
        
    return AnalysisResponse(**data)

# Legacy prompts kept for backward compatibility:
MASTER_ANALYSIS_PROMPT = """You are LexAI, an advanced legal intelligence engine.
Analyze the following case description and retrieved legal context.

Focus ONLY on these primary laws: {relevant_laws}

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
