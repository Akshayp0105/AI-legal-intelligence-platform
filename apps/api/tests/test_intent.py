import pytest
from unittest.mock import AsyncMock, patch, MagicMock


class TestClassifiedIntent:
    def test_default_values(self):
        from core.intent_classifier import ClassifiedIntent
        intent = ClassifiedIntent()
        assert intent.legal_domain == "general"
        assert intent.query_type == "question"
        assert intent.is_legal_query is True
        assert intent.confidence == 1.0

    def test_criminal_domain(self):
        from core.intent_classifier import ClassifiedIntent
        intent = ClassifiedIntent(legal_domain="criminal", query_type="question")
        assert intent.legal_domain == "criminal"

    def test_entities_defaults(self):
        from core.intent_classifier import Entities
        entities = Entities()
        assert entities.party_names == []
        assert entities.locations == []
        assert entities.dates == []
        assert entities.amounts == []


class TestDomainKeywords:
    def test_criminal_keywords(self):
        from core.intent_classifier import DOMAIN_MAP
        assert "murder" in DOMAIN_MAP["criminal"]
        assert "FIR" in DOMAIN_MAP["criminal"]
        assert "bail" in DOMAIN_MAP["criminal"]

    def test_all_domains_present(self):
        from core.intent_classifier import DOMAIN_MAP
        expected = ["criminal", "corporate", "property", "family", "consumer",
                     "labour", "constitutional", "cyber", "contract", "general"]
        for domain in expected:
            assert domain in DOMAIN_MAP
