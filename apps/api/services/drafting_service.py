import os
import json
from typing import Dict, Any
import google.generativeai as genai
from jinja2 import Environment, FileSystemLoader, select_autoescape
from docx import Document

from core.logging import get_logger

logger = get_logger(__name__)

MAX_RETRIES = 3
API_TIMEOUT = 30

def get_gemini_model() -> genai.GenerativeModel:
    return genai.GenerativeModel("gemini-2.0-flash-001")

class DraftingService:
    def __init__(self):
        template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates', 'drafting')
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape()
        )

    async def generate_draft(self, document_type: str, case_details: Dict[str, Any], party_details: Dict[str, Dict[str, Any]], language: str, tone: str) -> Dict[str, Any]:
        model = get_gemini_model()
        
        # Step 1: Ask Gemini to extract required fields
        extract_prompt = f"""
        You are a legal assistant. Based on the following case details, extract the necessary information to draft a {document_type}.
        Return ONLY a JSON object with the fields that would be required to fill out a {document_type} form (e.g. subject, response_days, etc.).
        Do not generate the legal text itself yet.
        
        Case Details: {json.dumps(case_details)}
        """
        try:
            extraction_res = model.generate_content(extract_prompt)
            clean_json = extraction_res.text.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:-3]
            elif clean_json.startswith("```"):
                clean_json = clean_json[3:-3]
            extracted_fields = json.loads(clean_json)
        except Exception as e:
            logger.error(f"Failed to extract fields: {e}")
            extracted_fields = {}

        # Merge extracted fields with party details
        template_vars = {
            **extracted_fields,
            "sender_name": party_details.get("sender", {}).get("name", "[SENDER NAME]"),
            "sender_address": party_details.get("sender", {}).get("address", "[SENDER ADDRESS]"),
            "recipient_name": party_details.get("recipient", {}).get("name", "[RECIPIENT NAME]"),
            "recipient_address": party_details.get("recipient", {}).get("address", "[RECIPIENT ADDRESS]"),
            "date": "[DATE]"
        }

        # Step 2: Generate legal content sections using Gemini
        sections_to_generate = ["facts", "cause_of_action", "prayer_clause"]
        generated_sections = {}
        
        for section in sections_to_generate:
            prompt = f"""
            You are a senior Indian advocate with 20 years experience. 
            Draft the {section} for a {document_type} in {tone} legal English appropriate for Indian courts. 
            Cite specific sections of applicable law.
            
            Case Details: {json.dumps(case_details)}
            Extracted Fields: {json.dumps(extracted_fields)}
            """
            try:
                res = model.generate_content(prompt)
                generated_sections[section] = res.text.strip()
            except Exception as e:
                logger.error(f"Failed to generate section {section}: {e}")
                generated_sections[section] = f"[Failed to generate {section}]"

        template_vars.update(generated_sections)

        # Render Jinja template
        template_file = f"{document_type}.txt"
        try:
            template = self.jinja_env.get_template(template_file)
            draft_text = template.render(**template_vars)
        except Exception as e:
            logger.error(f"Template rendering failed: {e}")
            draft_text = "Template rendering failed. Please ensure the template exists."

        if language != "en":
             draft_text = await self.translate_draft(draft_text, language)

        return {
            "draft_text": draft_text,
            "extracted_fields": extracted_fields,
            "generated_sections": generated_sections
        }

    def generate_docx(self, draft_text: str, filename: str) -> str:
        # Create a docx from the draft text
        doc = Document()
        for line in draft_text.split('\n'):
            doc.add_paragraph(line)
        
        # Save to a temporary or public path
        # Assuming we save to a local static/drafts directory
        save_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'drafts')
        os.makedirs(save_dir, exist_ok=True)
        filepath = os.path.join(save_dir, filename)
        doc.save(filepath)
        return filepath

    async def improve_draft(self, draft_text: str, feedback: str) -> str:
        model = get_gemini_model()
        prompt = f"""
        You are a senior Indian advocate. Review the following drafted legal document and revise it based on the client's feedback.
        
        Draft:
        {draft_text}
        
        Feedback:
        {feedback}
        
        Provide only the revised draft text.
        """
        try:
            res = model.generate_content(prompt)
            return res.text.strip()
        except Exception as e:
            logger.error(f"Failed to improve draft: {e}")
            return draft_text

    async def translate_draft(self, draft_text: str, target_language: str) -> str:
        model = get_gemini_model()
        prompt = f"""
        You are an expert legal translator. Translate the following legal document from English to {target_language}.
        Ensure that the legal terminology is accurate for Indian courts.
        
        Document:
        {draft_text}
        
        Provide ONLY the translated text.
        """
        try:
            res = model.generate_content(prompt)
            return res.text.strip()
        except Exception as e:
            logger.error(f"Failed to translate draft: {e}")
            return draft_text

drafting_service = DraftingService()
