import uuid, re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, desc
from models.cases import Case, Message


def _generate_title(first_message: str, domain: str) -> str:
    """Generate a clean case title from the user's first message."""
    # Clean the message
    clean = first_message.strip().rstrip("?!.")
    # Capitalize first letter
    clean = clean[:1].upper() + clean[1:] if clean else "Legal Query"
    # Truncate to 60 chars at word boundary
    if len(clean) > 60:
        clean = clean[:60].rsplit(" ", 1)[0] + "..."
    return clean


async def get_or_create_case(
    db: AsyncSession,
    session_id: str,
    user_message: str,
    domain: str,
) -> Case:
    """
    Get the active case for this session, or create a new one.
    One session = one case (matches ChatGPT/Claude conversation model).
    """
    # Look for existing active case in this session
    result = await db.execute(
        select(Case)
        .where(Case.session_id == session_id)
        .order_by(desc(Case.created_at))
        .limit(1)
    )
    case = result.scalar_one_or_none()

    if case is None:
        # First message in this session — create new case
        case = Case(
            id=uuid.uuid4(),
            session_id=session_id,
            title=_generate_title(user_message, domain),
            domain=domain,
            status="active",
            first_message=user_message,
            message_count=0,
        )
        db.add(case)
        await db.flush()

    return case


async def save_message(
    db: AsyncSession,
    case: Case,
    session_id: str,
    role: str,
    content: str,
    analysis: dict | None = None,
    domain: str | None = None,
) -> Message:
    """Save a single message and update the case metadata."""
    msg = Message(
        id=uuid.uuid4(),
        case_id=case.id,
        session_id=session_id,
        role=role,
        content=content,
        analysis=analysis,
        domain=domain or case.domain,
    )
    db.add(msg)

    # Update case metadata
    case.message_count += 1
    case.updated_at = func.now()

    # If this is an assistant message with analysis, update case fields
    if role == "assistant" and analysis:
        case.summary = content[:400] if content else None
        case.domain = analysis.get("domain", case.domain)
        if analysis.get("applicable_laws"):
            case.applicable_laws = analysis["applicable_laws"][:3]  # Store top 3
        # Extract strength score if present
        score = analysis.get("strength_score") or analysis.get("case_strength")
        if isinstance(score, (int, float)):
            case.strength_score = int(score)

    await db.flush()
    return msg


async def get_cases_for_session(
    db: AsyncSession,
    session_id: str,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Case], int]:
    """Fetch all cases for a session with total count."""
    # Total count
    count_result = await db.execute(
        select(func.count(Case.id)).where(Case.session_id == session_id)
    )
    total = count_result.scalar() or 0

    # Fetch cases newest first
    result = await db.execute(
        select(Case)
        .where(Case.session_id == session_id)
        .order_by(desc(Case.created_at))
        .limit(limit)
        .offset(offset)
    )
    cases = result.scalars().all()
    return list(cases), total


async def get_case_messages(
    db: AsyncSession,
    case_id: uuid.UUID,
    session_id: str,
) -> list[Message]:
    """Get all messages for a case (validates session ownership)."""
    result = await db.execute(
        select(Message)
        .join(Case)
        .where(
            Message.case_id == case_id,
            Case.session_id == session_id,   # Security: only own cases
        )
        .order_by(Message.created_at)
    )
    return list(result.scalars().all())


async def get_case_stats(
    db: AsyncSession,
    session_id: str,
) -> dict:
    """Aggregate stats for the session dashboard."""
    result = await db.execute(
        select(
            func.count(Case.id).label("total"),
            func.count(Case.id).filter(Case.status == "active").label("active"),
            func.avg(Case.strength_score).filter(Case.strength_score.isnot(None)).label("avg_strength"),
        )
        .where(Case.session_id == session_id)
    )
    row = result.one()
    return {
        "total_cases": row.total or 0,
        "active_cases": row.active or 0,
        "avg_strength": round(row.avg_strength) if row.avg_strength else None,
    }


async def update_case_status(
    db: AsyncSession,
    case_id: uuid.UUID,
    session_id: str,
    status: str,
) -> bool:
    """Update case status. Returns True if updated."""
    result = await db.execute(
        update(Case)
        .where(Case.id == case_id, Case.session_id == session_id)
        .values(status=status)
        .returning(Case.id)
    )
    return result.scalar_one_or_none() is not None
