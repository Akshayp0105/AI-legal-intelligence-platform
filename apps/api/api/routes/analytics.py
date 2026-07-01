import hashlib
import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from core.database import get_db_session
from schemas.prediction import PredictionRequest, CaseStrengthScore, DashboardResponse
from services.prediction_service import predict_case_strength
from models.prediction import CasePrediction

router = APIRouter(tags=["Analytics"])

@router.post("/analytics/predict", response_model=CaseStrengthScore)
async def predict_endpoint(
    request: PredictionRequest,
    db: AsyncSession = Depends(get_db_session)
):
    try:
        # 1. Run prediction pipeline
        prediction_dict = await predict_case_strength(request)
        
        # 2. Hash case description
        case_hash = hashlib.sha256(request.case_description.encode('utf-8')).hexdigest()
        
        parsed_user_id = uuid.UUID(request.user_id) if request.user_id else None
        
        # 3. Store in DB
        new_prediction = CasePrediction(
            user_id=parsed_user_id,
            case_description_hash=case_hash,
            case_type=request.case_type,
            court_level=request.court_level,
            score_json=prediction_dict
        )
        db.add(new_prediction)
        await db.commit()
        
        return CaseStrengthScore(**prediction_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/dashboard", response_model=DashboardResponse)
async def dashboard_endpoint(db: AsyncSession = Depends(get_db_session)):
    try:
        # Fetch all predictions
        result = await db.execute(select(CasePrediction))
        predictions = result.scalars().all()
        
        total_cases = len(predictions)
        if total_cases == 0:
            return DashboardResponse(
                total_cases_analyzed=0,
                avg_strength_score=0.0,
                common_case_types={},
                court_wise_success_rates={}
            )
            
        total_score = 0
        case_types = {}
        court_success = {}
        
        for p in predictions:
            score_data = p.score_json
            overall_score = score_data.get("overall_score", 0)
            total_score += overall_score
            
            # Count case types
            c_type = p.case_type or "unknown"
            case_types[c_type] = case_types.get(c_type, 0) + 1
            
            # Aggregate court success
            c_level = p.court_level or "unknown"
            if c_level not in court_success:
                court_success[c_level] = {"total": 0, "success_sum": 0}
                
            court_success[c_level]["total"] += 1
            # Average the 'success' probability from outcome_probability
            success_prob = score_data.get("outcome_probability", {}).get("success", 0)
            court_success[c_level]["success_sum"] += success_prob
            
        avg_score = total_score / total_cases
        
        # Calculate final court success rates
        final_court_success = {}
        for court, data in court_success.items():
            final_court_success[court] = data["success_sum"] / data["total"]
            
        return DashboardResponse(
            total_cases_analyzed=total_cases,
            avg_strength_score=round(avg_score, 2),
            common_case_types=case_types,
            court_wise_success_rates=final_court_success
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
