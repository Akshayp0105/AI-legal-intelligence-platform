import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from core.database import get_db_session
from services.case_service import (
    get_cases_for_session, get_case_messages,
    get_case_stats, update_case_status
)

router = APIRouter(prefix="/cases", tags=["Cases"])


# ── Pydantic response schemas ──────────────────────────────

class LawSectionOut(BaseModel):
    act: str
    section: str
    title: str

class CaseOut(BaseModel):
    id: str
    session_id: str
    title: str
    domain: str
    status: str
    strength_score: Optional[int]
    summary: Optional[str]
    first_message: str
    message_count: int
    applicable_laws: Optional[list]
    created_at: str
    updated_at: str

    @classmethod
    def from_orm(cls, case):
        return cls(
            id=str(case.id),
            session_id=case.session_id,
            title=case.title,
            domain=case.domain,
            status=case.status,
            strength_score=case.strength_score,
            summary=case.summary,
            first_message=case.first_message,
            message_count=case.message_count,
            applicable_laws=case.applicable_laws,
            created_at=case.created_at.isoformat(),
            updated_at=case.updated_at.isoformat(),
        )

class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    analysis: Optional[dict]
    domain: Optional[str]
    created_at: str

    @classmethod
    def from_orm(cls, msg):
        return cls(
            id=str(msg.id),
            role=msg.role,
            content=msg.content,
            analysis=msg.analysis,
            domain=msg.domain,
            created_at=msg.created_at.isoformat(),
        )

class CasesResponse(BaseModel):
    cases: list[CaseOut]
    total: int
    stats: dict

class StatusUpdate(BaseModel):
    status: str  # 'active' | 'under_review' | 'closed'


# ── Endpoints ──────────────────────────────────────────────

@router.get("", response_model=CasesResponse)
async def list_cases(
    session_id: str = Query(..., description="Browser session ID"),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db_session),
):
    """Get all cases for a session (like Claude's conversation list)."""
    if not session_id or len(session_id) < 3:
        raise HTTPException(400, "Invalid session_id")

    cases, total = await get_cases_for_session(db, session_id, limit, offset)
    stats = await get_case_stats(db, session_id)

    return CasesResponse(
        cases=[CaseOut.from_orm(c) for c in cases],
        total=total,
        stats=stats,
    )


@router.get("/{case_id}/messages")
async def get_messages(
    case_id: str,
    session_id: str = Query(...),
    db: AsyncSession = Depends(get_db_session),
):
    """Get full conversation history for a case."""
    try:
        cid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(400, "Invalid case_id format")

    messages = await get_case_messages(db, cid, session_id)
    if not messages:
        raise HTTPException(404, "Case not found or access denied")

    return {"messages": [MessageOut.from_orm(m) for m in messages]}


@router.patch("/{case_id}/status")
async def update_status(
    case_id: str,
    body: StatusUpdate,
    session_id: str = Query(...),
    db: AsyncSession = Depends(get_db_session),
):
    """Update case status (active → under_review → closed)."""
    valid = {"active", "under_review", "closed"}
    if body.status not in valid:
        raise HTTPException(400, f"Status must be one of: {valid}")

    try:
        cid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(400, "Invalid case_id")

    updated = await update_case_status(db, cid, session_id, body.status)
    if not updated:
        raise HTTPException(404, "Case not found or access denied")

    await db.commit()
    return {"success": True, "status": body.status}
