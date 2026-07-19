"""Pydantic schemas for the case strength prediction API endpoints."""

from pydantic import BaseModel, Field
from typing import List, Optional


class OutcomeProbability(BaseModel):
    """Probabilities for different case outcomes (must sum to 100)."""
    success: int = Field(..., description="Probability of success (0-100)")
    partial_success: int = Field(..., description="Probability of partial success (0-100)")
    failure: int = Field(..., description="Probability of failure (0-100)")

class PredictionFactors(BaseModel):
    """Individual scoring factors contributing to case strength."""
    evidence_strength: int
    legal_provisions_match: int
    precedent_support: int
    procedural_compliance: int
    witness_credibility: int

class CaseStrengthScore(BaseModel):
    """Complete case strength assessment with scores, factors, and suggestions."""
    overall_score: int = Field(..., description="0-100 score")
    confidence: str = Field(..., description="low/medium/high")
    factors: PredictionFactors
    risk_factors: List[str]
    positive_factors: List[str]
    outcome_probability: OutcomeProbability
    strategy_suggestions: List[str]

class PredictionRequest(BaseModel):
    """Request payload for case strength prediction."""
    case_description: str
    case_type: Optional[str] = "unknown"
    court_level: Optional[str] = "unknown"
    user_id: Optional[str] = None

class DashboardResponse(BaseModel):
    """Aggregated analytics data for the prediction dashboard."""
    total_cases_analyzed: int
    avg_strength_score: float
    common_case_types: dict
    court_wise_success_rates: dict
