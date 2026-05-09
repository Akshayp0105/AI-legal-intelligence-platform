from typing import Dict, Any, Optional
from qdrant_client.http import models as qdrant_models

DOMAIN_CONFIG = {
    "criminal": {
        "primary_acts": ["IPC", "CrPC", "Indian Evidence Act", "POCSO", "NDPS", "Prevention of Corruption Act"],
        "qdrant_filter": {"act_name": ["IPC", "CrPC", "Indian Evidence Act"]},
        "retrieval_top_k": 10,
        "prompt_role": "You are a senior criminal lawyer with 20 years experience in Indian courts. You specialize in bail, FIRs, chargesheet, and criminal trials.",
        "response_sections": ["applicable_ipc_sections", "crpc_procedures", "bail_eligibility", "evidence_requirements", "similar_cases"],
        "document_templates": ["bail_application", "fir_complaint", "vakalatnama"]
    },
    "corporate": {
        "primary_acts": ["Companies Act 2013", "Partnership Act 1932", "LLP Act 2008", "SEBI Act", "GST Act", "Trademark Act", "MSME Act"],
        "qdrant_filter": {"act_name": ["Companies Act 2013", "Partnership Act 1932", "LLP Act 2008"]},
        "retrieval_top_k": 8,
        "prompt_role": "You are a senior corporate lawyer specializing in Indian company law, business registration, MCA compliance, and commercial contracts.",
        "response_sections": ["applicable_acts", "compliance_requirements", "registration_steps", "penalties_for_non_compliance", "recommended_documents"],
        "document_templates": ["legal_notice", "mou_draft", "partnership_deed", "nda"]
    },
    "property": {
        "primary_acts": ["Transfer of Property Act", "Registration Act 1908", "Stamp Act", "RERA Act 2016", "Rent Control Act", "Land Acquisition Act"],
        "qdrant_filter": {"act_name": ["Transfer of Property Act", "RERA Act 2016", "Registration Act 1908"]},
        "retrieval_top_k": 8,
        "prompt_role": "You are a senior property lawyer specializing in Indian real estate law, land disputes, RERA compliance, and property transactions.",
        "response_sections": ["applicable_acts", "title_verification_steps", "registration_requirements", "dispute_resolution", "rera_compliance"],
        "document_templates": ["legal_notice", "sale_agreement", "rent_agreement"]
    },
    "family": {
        "primary_acts": ["Hindu Marriage Act", "Special Marriage Act", "Hindu Succession Act", "Guardianship Act", "Domestic Violence Act", "Muslim Personal Law"],
        "qdrant_filter": {"act_name": ["Hindu Marriage Act", "Hindu Succession Act", "Guardianship Act"]},
        "retrieval_top_k": 8,
        "prompt_role": "You are a compassionate family law expert specializing in Indian matrimonial law, succession, child custody, and domestic relations. Always acknowledge the emotional difficulty while providing clear legal guidance.",
        "response_sections": ["applicable_laws", "legal_remedies", "court_jurisdiction", "maintenance_entitlement", "child_welfare_considerations"],
        "document_templates": ["legal_notice", "petition"]
    },
    "consumer": {
        "primary_acts": ["Consumer Protection Act 2019", "NCDRC Rules", "E-Commerce Rules 2020"],
        "qdrant_filter": {"act_name": ["Consumer Protection Act 2019"]},
        "retrieval_top_k": 6,
        "prompt_role": "You are a consumer rights lawyer specializing in Indian consumer protection law, product liability, and redressal mechanisms.",
        "response_sections": ["applicable_acts", "forum_jurisdiction", "compensation_entitlement", "complaint_procedure", "limitation_period"],
        "document_templates": ["consumer_complaint", "legal_notice"]
    },
    "labour": {
        "primary_acts": ["Industrial Disputes Act", "Payment of Wages Act", "PF Act", "ESI Act", "Factories Act", "Labour Codes 2020"],
        "qdrant_filter": {"act_name": ["Industrial Disputes Act", "PF Act", "Labour Codes 2020"]},
        "retrieval_top_k": 8,
        "prompt_role": "You are a labour law expert specializing in Indian employment law, workers rights, PF/ESI compliance, and industrial disputes.",
        "response_sections": ["applicable_acts", "worker_rights", "employer_obligations", "dispute_resolution_mechanism", "statutory_benefits"],
        "document_templates": ["legal_notice", "petition"]
    },
    "general": {
        "primary_acts": ["Constitution of India"],
        "qdrant_filter": {},
        "retrieval_top_k": 5,
        "prompt_role": "You are a knowledgeable Indian legal assistant who provides general legal guidance and helps people understand their rights.",
        "response_sections": ["overview", "applicable_laws", "suggested_next_steps"],
        "document_templates": ["legal_notice"]
    }
}

def get_domain_config(legal_domain: str) -> Dict[str, Any]:
    return DOMAIN_CONFIG.get(legal_domain, DOMAIN_CONFIG["general"])

def build_qdrant_filter(domain_config: Dict[str, Any], year_from: Optional[int] = None) -> qdrant_models.Filter:
    must_conditions = []
    
    act_names = domain_config.get("qdrant_filter", {}).get("act_name", [])
    if act_names:
        must_conditions.append(
            qdrant_models.FieldCondition(
                key="act_name",
                match=qdrant_models.MatchAny(any=act_names)
            )
        )
        
    if year_from is not None:
        must_conditions.append(
            qdrant_models.FieldCondition(
                key="year",
                range=qdrant_models.Range(gte=year_from)
            )
        )
        
    return qdrant_models.Filter(must=must_conditions)

def get_relevant_laws_list(legal_domain: str) -> str:
    config = get_domain_config(legal_domain)
    acts = config.get("primary_acts", [])
    return ", ".join(acts)
