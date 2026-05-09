from typing import Dict, Any, List
from dataclasses import dataclass
from core.prompts import AnalysisResponse
from core.intent_classifier import ClassifiedIntent
import re

@dataclass
class ValidatedResponse:
    validation_warnings: List[str]
    was_modified: bool
    data_gap: bool
    final_response: AnalysisResponse

def validate_response(response: AnalysisResponse, intent: ClassifiedIntent, domain_config: Dict[str, Any], retrieved_count: int) -> ValidatedResponse:
    warnings = []
    was_modified = False
    data_gap = False
    
    # e. Non-legal response check
    if not getattr(intent, 'is_legal_query', True):
        return ValidatedResponse(warnings, was_modified, data_gap, response)
        
    # a. Domain mismatch check
    primary_acts = [act.lower() for act in domain_config.get("primary_acts", [])]
    if primary_acts:
        valid_laws = []
        for law in response.applicable_laws:
            law_act_lower = law.act.lower()
            is_valid = False
            for pact in primary_acts:
                # Partial match (e.g., "penal code" in "indian penal code")
                if pact in law_act_lower or law_act_lower in pact:
                    is_valid = True
                    break
            
            if is_valid:
                valid_laws.append(law)
            else:
                warnings.append(f"Removed out-of-domain act: {law.act}")
                was_modified = True
                
        response.applicable_laws = valid_laws

    # b. Section number sanity check
    sane_laws = []
    for law in response.applicable_laws:
        act_lower = law.act.lower()
        section_str = str(law.section)
        
        nums = re.findall(r'\d+', section_str)
        if not nums:
            sane_laws.append(law)
            continue
            
        sec_num = int(nums[0])
        is_sane = True
        
        if "ipc" in act_lower or "penal code" in act_lower:
            if not (1 <= sec_num <= 511): is_sane = False
        elif "crpc" in act_lower or "criminal procedure" in act_lower:
            if not (1 <= sec_num <= 484): is_sane = False
        elif "companies act" in act_lower:
            if not (1 <= sec_num <= 470): is_sane = False
            
        if is_sane:
            sane_laws.append(law)
        else:
            warnings.append(f"Removed hallucinated section: {law.act} {law.section}")
            was_modified = True
            
    response.applicable_laws = sane_laws

    # c. Empty response check
    if not response.conversational_reply or len(response.conversational_reply.strip()) < 10:
        response.conversational_reply = "I need more details to provide a specific legal answer. Could you please clarify your situation?"
        warnings.append("Replaced empty conversational reply")
        was_modified = True

    # d. Confidence check (data gap)
    if retrieved_count == 0:
        data_gap = True
        warnings.append("No context retrieved. Flagging data gap.")
        was_modified = True
        
    return ValidatedResponse(
        validation_warnings=warnings,
        was_modified=was_modified,
        data_gap=data_gap,
        final_response=response
    )
