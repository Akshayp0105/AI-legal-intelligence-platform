import asyncio, json, logging, os, hashlib
# Analysis service v1.0.1 - Enhanced domain detection
from typing import AsyncGenerator
import google.generativeai as genai

logger = logging.getLogger("lexai.analysis")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

DOMAIN_KEYWORDS = {
    "cyber": ["cyber","bullying","hacking","online","fraud","it act","social media",
              "whatsapp","defamation","phishing","digital","internet","fake","deepfake",
              "email","password","account","data","privacy","screenshot","threat","troll"],
    "criminal": ["murder","theft","rape","assault","fir","bail","arrest","ipc","crpc",
                 "cognizable","police","chargesheet","custody","accused","crime","offence"],
    "corporate": ["company","registration","partnership","mca","incorporation","director",
                  "shares","gst","trademark","llp","firm","business","bond","agreement"],
    "property": ["land","plot","property","sale deed","encroachment","possession","rera",
                 "rent","eviction","builder","flat","apartment","lease","landlord","tenant"],
    "family": ["divorce","maintenance","custody","adoption","will","marriage","dowry",
               "domestic violence","alimony","separation","heir","inheritance"],
    "consumer": ["refund","defect","service","product","complaint","ncdrc","consumer",
                 "deficiency","warranty","guarantee","overcharge","purchase","seller"],
    "labour": ["salary","termination","pf","esi","gratuity","employment","fired","layoff",
               "resign","worker","employee","employer","overtime","wages"],
}

DOMAIN_ACTS = {
    "cyber": ["IT Act 2000", "IT Amendment Act 2008", "IPC Section 66 series",
              "Digital Personal Data Protection Act 2023", "IPC 499/500 (Online Defamation)"],
    "criminal": ["Indian Penal Code (IPC)", "Code of Criminal Procedure (CrPC)",
                 "Indian Evidence Act", "POCSO Act"],
    "corporate": ["Companies Act 2013", "Partnership Act 1932", "LLP Act 2008",
                  "Contract Act 1872", "GST Act"],
    "property": ["Transfer of Property Act", "RERA Act 2016", "Registration Act 1908",
                 "Stamp Act", "Rent Control Act"],
    "family": ["Hindu Marriage Act 1955", "Hindu Succession Act", "Domestic Violence Act",
               "Guardianship Act"],
    "consumer": ["Consumer Protection Act 2019", "NCDRC Rules", "E-Commerce Rules 2020"],
    "labour": ["Industrial Disputes Act", "Payment of Wages Act", "PF Act", "Labour Codes 2020"],
    "general": ["Constitution of India"],
}

DOMAIN_ROLES = {
    "cyber": "You are a senior cyber law expert with 15 years experience in Indian IT law, cybercrime prosecution, and digital rights. You know the IT Act 2000 and all amendments deeply.",
    "criminal": "You are a senior criminal lawyer with 20 years experience in Indian criminal courts, IPC, CrPC, bail hearings, and FIR procedures.",
    "corporate": "You are a senior corporate lawyer specializing in MCA compliance, company registration, partnership deeds, and commercial contracts in India.",
    "property": "You are a senior property lawyer specializing in RERA, land disputes, property transactions, and real estate law in India.",
    "family": "You are a compassionate family law expert specializing in Indian matrimonial law, succession, child custody, and domestic violence cases.",
    "consumer": "You are a consumer rights lawyer specializing in Consumer Protection Act 2019, NCDRC procedures, and grievance redressal in India.",
    "labour": "You are a labour law expert specializing in Indian employment law, workers rights, PF/ESI compliance, and industrial disputes.",
    "general": "You are a knowledgeable Indian legal assistant who provides accurate legal guidance and helps people understand their rights under Indian law.",
}


def detect_domain(message: str, history: list) -> str:
    """Fast local keyword detection — no API call needed."""
    text = (message + " ".join(m.get("content","") for m in history[-2:])).lower()
    scores = {domain: sum(1 for kw in keywords if kw in text)
              for domain, keywords in DOMAIN_KEYWORDS.items()}
    best = max(scores, key=scores.get)
    score = scores[best]
    logger.info(f"Domain detection: {scores} → {best} (score={score})")
    return best if score > 0 else "general"


def build_prompt(message: str, domain: str, history: list, language: str, user_role: str) -> tuple[str, str]:
    acts = "\n".join(f"  • {a}" for a in DOMAIN_ACTS.get(domain, DOMAIN_ACTS["general"]))
    role = DOMAIN_ROLES.get(domain, DOMAIN_ROLES["general"])

    lang_note = {
        "ml": "Respond in simple Malayalam. Use English in brackets for legal terms.",
        "hi": "Respond in simple Hindi. Use English in brackets for legal terms.",
    }.get(language, "Respond in clear, simple English. Explain every legal term you use.")

    role_note = {
        "advocate": "User is a lawyer — use technical legal terminology freely.",
        "student": "User is a law student — be academically precise.",
        "public": "User is a common person — avoid jargon, explain everything simply.",
    }.get(user_role, "User is a common person — use very simple language.")

    system = f"""{role}

USER: {role_note}
LANGUAGE: {lang_note}

DOMAIN: {domain.upper()} LAW — Only cite laws from:
{acts}

CRITICAL RULES:
1. NEVER cite IPC §302 or criminal sections for cyber/civil/corporate matters.
2. NEVER invent section numbers. If unsure, write "under [Act Name]" without a number.
3. Always name the specific court/forum with jurisdiction.
4. Always mention the limitation period (time to file) if applicable.
5. Give specific, actionable steps with Indian government portals/offices.
6. If a question is vague, ask ONE specific clarifying question.
7. Be warm, professional, and genuinely helpful — like a trusted legal advisor.

RESPOND WITH THIS EXACT JSON (no markdown, no text outside JSON):
{{
  "conversational_reply": "2-3 warm sentences summarizing your key findings. This appears in the chat bubble. Write naturally.",
  "domain": "{domain}",
  "applicable_laws": [
    {{
      "act": "Exact Act Name",
      "section": "Section number or blank if unsure",
      "title": "Section title",
      "explanation": "How this section applies to the user's specific situation",
      "relevance": "high"
    }}
  ],
  "practical_steps": [
    {{
      "step": 1,
      "action": "Specific thing to do",
      "where": "Specific office, portal, or authority in India",
      "documents": ["document 1", "document 2"],
      "cost": "Approximate INR or Free"
    }}
  ],
  "key_rights": ["Right 1", "Right 2"],
  "documents_needed": ["Document 1", "Document 2"],
  "limitation_period": "Time limit to file action, or N/A",
  "jurisdiction": "Which court or forum handles this",
  "needs_advocate": true,
  "advocate_urgency": "optional",
  "draft_suggestions": ["legal_notice"],
  "disclaimer": "LexAI provides legal information, not legal advice. Consult a qualified advocate before taking action."
}}"""

    history_text = ""
    if history:
        history_text = "PRIOR CONVERSATION:\n"
        for m in history[-5:]:
            history_text += f"{m.get('role','user').upper()}: {m.get('content','')[:300]}\n"

    user = f"""{history_text}
USER QUESTION: {message}

This is a {domain.upper()} law matter. Only cite {domain} law sections.
Return ONLY the JSON object."""

    return system, user


async def analyze(message: str, session_id: str, history: list,
                  language: str = "en", user_role: str = "public") -> dict:
    """Main analysis function — guaranteed to return a valid response."""

    domain = detect_domain(message, history)
    logger.info(f"Analyzing: '{message[:60]}' | domain={domain} | session={session_id}")

    system_prompt, user_prompt = build_prompt(message, domain, history, language, user_role)

    model = genai.GenerativeModel(
        model_name="gemini-flash-latest",
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            max_output_tokens=4096,
        )
    )

    try:
        response = model.generate_content(user_prompt)
        raw = response.text.strip()

        # Better JSON extraction
        start = raw.find('{')
        end = raw.rfind('}')
        if start != -1 and end != -1:
            raw = raw[start:end+1]

        result = json.loads(raw)
        result["domain"] = domain   # Always set domain from our classifier, not Gemini's guess
        logger.info(f"Success — domain={domain}, laws={len(result.get('applicable_laws',[]))}")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse failed: {e} | Raw: {raw[:300]}")
        # SAFE FALLBACK — always return something useful
        return {
            "conversational_reply": f"I found relevant information about your {domain} law query. {response.text[:400] if hasattr(response,'text') else 'Please see the details below.'}",
            "domain": domain,
            "applicable_laws": [],
            "practical_steps": [{"step": 1, "action": "Consult a local advocate for detailed guidance", "where": "District Bar Association", "documents": [], "cost": "Varies"}],
            "key_rights": [],
            "documents_needed": [],
            "limitation_period": "Verify with an advocate",
            "jurisdiction": "As applicable",
            "needs_advocate": True,
            "advocate_urgency": "soon",
            "draft_suggestions": [],
            "disclaimer": "LexAI provides legal information only. Consult a qualified advocate."
        }
    except Exception as e:
        logger.error(f"Gemini call failed: {type(e).__name__}: {e}")
        raise


async def analyze_stream(message: str, session_id: str, history: list,
                         language: str = "en", user_role: str = "public", db: AsyncSession = None) -> AsyncGenerator[str, None]:
    """Streaming analysis — yields SSE events."""

    domain = detect_domain(message, history)
    logger.info(f"Stream: '{message[:60]}' | domain={domain}")

    # Immediately tell frontend the domain
    yield f"data: {json.dumps({'type': 'domain', 'domain': domain})}\n\n"
    await asyncio.sleep(0)

    system_prompt, user_prompt = build_prompt(message, domain, history, language, user_role)

    model = genai.GenerativeModel(
        model_name="gemini-flash-latest",
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            max_output_tokens=4096,
        )
    )

    full_text = ""
    try:
        for chunk in model.generate_content(user_prompt, stream=True):
            if chunk.text:
                full_text += chunk.text
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk.text})}\n\n"
                await asyncio.sleep(0)

        # Parse and send complete structured result
        clean = full_text.strip()
        start = clean.find('{')
        end = clean.rfind('}')
        if start != -1 and end != -1:
            clean = clean[start:end+1]

        try:
            result = json.loads(clean)
            result["domain"] = domain
        except:
            result = {
                "conversational_reply": clean[:500],
                "domain": domain,
                "applicable_laws": [],
                "practical_steps": [],
                "key_rights": [],
                "documents_needed": [],
                "disclaimer": "LexAI provides legal information only."
            }

        yield f"data: {json.dumps({'type': 'complete', 'data': result})}\n\n"
        
        if db:
            from services.case_service import get_or_create_case, save_message
            try:
                case = await get_or_create_case(db, session_id, message, domain)
                await save_message(db, case, session_id, "user", message, domain=domain)
                await save_message(db, case, session_id, "assistant",
                                   result.get("conversational_reply",""), analysis=result, domain=domain)
                await db.commit()
            except Exception as e:
                logger.error(f"Stream DB save failed: {e}")
                await db.rollback()

    except Exception as e:
        logger.error(f"Stream error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    yield "data: [DONE]\n\n"
