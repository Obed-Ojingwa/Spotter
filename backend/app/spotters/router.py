# C:\Users\Melody\Desktop\spotter_dashboards\spotter\backend\app\spotters\router.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.deps import get_spotter
from app.models import User, Spotter, Match, MatchStatus, JobSeeker, Job, Organization
from app.tasks.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/spotter", tags=["spotter"])


class ReviewDecision(BaseModel):
    approved: bool
    notes: Optional[str] = None


@router.get("/queue")
async def get_review_queue(
    user: User = Depends(get_spotter),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
):
    """Return matches pending Spotter review."""
    result = await db.execute(
        select(Match, JobSeeker, Job)
        .join(JobSeeker, Match.seeker_id == JobSeeker.id)
        .join(Job, Match.job_id == Job.id)
        .where(Match.status == MatchStatus.PENDING_SPOTTER)
        .order_by(Match.matched_at.asc())
        .limit(limit)
    )
    rows = result.all()

    return [
        {
            "match_id": str(m.id),
            "score": m.score,
            "breakdown": m.score_breakdown,
            "submitted_at": m.matched_at.isoformat(),
            "is_premium": m.score >= 90,
            "seeker": {
                "id": str(s.id),
                "name": s.name,
                "city": s.city,
                "state": s.state,
                "skills": s.skills,
                "education": s.education,
                "available": s.available,
            },
            "job": {
                "id": str(j.id),
                "title": j.title,
                "city": j.city,
                "state": j.state,
                "required_skills": j.required_skills,
            },
        }
        for m, s, j in rows
    ]


@router.post("/review/{match_id}")
async def review_match(
    match_id: str,
    body: ReviewDecision,
    user: User = Depends(get_spotter),
    db: AsyncSession = Depends(get_db),
):
    """Approve or reject a match. Approval reveals it to both parties and fires notifications."""
    result = await db.execute(select(Spotter).where(Spotter.user_id == user.id))
    spotter = result.scalar_one_or_none()
    if not spotter:
        raise HTTPException(status_code=404, detail="Spotter profile not found")

    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.status != MatchStatus.PENDING_SPOTTER:
        raise HTTPException(status_code=400, detail="Match has already been reviewed")

    # Load seeker + job for notifications
    seeker_result = await db.execute(
        select(JobSeeker, User)
        .join(User, JobSeeker.user_id == User.id)
        .where(JobSeeker.id == match.seeker_id)
    )
    seeker_row = seeker_result.first()
    seeker, seeker_user = (seeker_row[0], seeker_row[1]) if seeker_row else (None, None)

    job_result = await db.execute(select(Job).where(Job.id == match.job_id))
    job = job_result.scalar_one_or_none()

    match.spotter_id    = spotter.id
    match.spotter_notes = body.notes
    # match.approved_at   = datetime.now(timezone.utc)  # Set in admin router to ensure consistent timezone handling
    # I will use def upgrade() -> None: op.alter_column('matches', 'approved_at', type_=sa.DateTime(timezone=True), existing_type=sa.DateTime(), nullable=True ) to upgrade my alembic migration to ensure the approved_at column is timezone-aware, and then use datetime.utcnow() here for consistency.
    match.approved_at   = datetime.utcnow()

    if body.approved:
        match.status = MatchStatus.REVEALED
        spotter.total_approved += 1

        # ── Fire notifications (non-blocking) ─────────────────────────────
        try:
            from app.notifications.service import (
                notify_match_approved, notify_match_rejected
            )
            if seeker_user and job:
                notify_match_approved(
                    seeker_email=seeker_user.email,
                    seeker_name=seeker.name if seeker else "Candidate",
                    job_title=job.title,
                    score=match.score,
                )
        except Exception as e:
            logger.warning(f"Notification failed (non-blocking): {e}")

        # ── Notify org that a new candidate is available ───────────────────
        try:
            if job and job.org_id:
                org_result = await db.execute(
                    select(Organization, User)
                    .join(User, Organization.user_id == User.id)
                    .where(Organization.id == job.org_id)
                )
                org_row = org_result.first()
                if org_row:
                    from app.notifications.service import notify_org_new_match
                    notify_org_new_match(
                        org_email=org_row[1].email,
                        org_name=org_row[0].name,
                        job_title=job.title,
                        candidate_count=1,
                    )
        except Exception as e:
            logger.warning(f"Org notification failed (non-blocking): {e}")

        # ── Generate certificate (Celery or synchronous fallback) ──────────
        if match.score >= 70:
            try:
                celery_app.send_task(
                    "app.tasks.matching_tasks.generate_certificate",
                    args=[str(match.id)],
                )
            except Exception:
                # Celery not running — generate synchronously
                try:
                    from app.tasks.matching_tasks import _generate_certificate_async
                    import asyncio
                    asyncio.create_task(_generate_certificate_async(str(match.id)))
                except Exception as e:
                    logger.warning(f"Certificate generation failed: {e}")

        # ── Award agent points if match was triggered by an agent ──────────
        try:
            if match.triggered_by == "agent" and job and job.agent_id:
                from app.models import Agent, AgentPoint
                agent_result = await db.execute(
                    select(Agent).where(Agent.id == job.agent_id)
                )
                agent = agent_result.scalar_one_or_none()
                if agent:
                    agent.points += 5.0
                    db.add(AgentPoint(
                        agent_id=agent.id,
                        delta=5.0,
                        reason="successful_match",
                        reference_id=match.id,
                    ))
                    # Propagate referral points via Celery
                    try:
                        celery_app.send_task(
                            "app.tasks.matching_tasks.propagate_referral_points",
                            args=[str(agent.id), 5.0, "referral_match", str(match.id)],
                        )
                    except Exception:
                        pass
        except Exception as e:
            logger.warning(f"Agent points award failed: {e}")

    else:
        match.status = MatchStatus.SPOTTER_REJECTED
        spotter.total_rejected += 1

        # Notify seeker of rejection
        try:
            from app.notifications.service import notify_match_rejected
            if seeker_user and job:
                notify_match_rejected(
                    seeker_email=seeker_user.email,
                    seeker_name=seeker.name if seeker else "Candidate",
                    job_title=job.title,
                )
        except Exception as e:
            logger.warning(f"Rejection notification failed: {e}")

    await db.commit()
    return {
        "match_id": match_id,
        "decision": "approved" if body.approved else "rejected",
        "score": match.score,
    }


@router.get("/stats")
async def spotter_stats(
    user: User = Depends(get_spotter),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Spotter).where(Spotter.user_id == user.id))
    spotter = result.scalar_one_or_none()

    pending_result = await db.execute(
        select(Match).where(Match.status == MatchStatus.PENDING_SPOTTER)
    )
    pending = len(pending_result.scalars().all())

    return {
        "total_approved": spotter.total_approved,
        "total_rejected": spotter.total_rejected,
        "pending_in_queue": pending,
    }



@router.get("/history")
async def spotter_history(
    user: User = Depends(get_spotter),
    db: AsyncSession = Depends(get_db),
    page: int = 1,
    limit: int = 20,
    decision: Optional[str] = None,  # "approved" | "rejected"
):
    """All matches this spotter has reviewed, paginated."""
    result = await db.execute(select(Spotter).where(Spotter.user_id == user.id))
    spotter = result.scalar_one_or_none()
    if not spotter:
        raise HTTPException(status_code=404, detail="Spotter profile not found")

    stmt = (
        select(Match, JobSeeker, Job)
        .join(JobSeeker, Match.seeker_id == JobSeeker.id)
        .join(Job, Match.job_id == Job.id)
        .where(Match.spotter_id == spotter.id)
        .order_by(Match.approved_at.desc())
    )
    if decision == "approved":
        stmt = stmt.where(Match.status == MatchStatus.REVEALED)
    elif decision == "rejected":
        stmt = stmt.where(Match.status == MatchStatus.SPOTTER_REJECTED)

    count_stmt = select(func.count(Match.id)).where(Match.spotter_id == spotter.id)
    if decision == "approved":
        count_stmt = count_stmt.where(Match.status == MatchStatus.REVEALED)
    elif decision == "rejected":
        count_stmt = count_stmt.where(Match.status == MatchStatus.SPOTTER_REJECTED)

    total = (await db.execute(count_stmt)).scalar() or 0
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()

    return {
        "total": total,
        "page": page,
        "matches": [
            {
                "match_id": str(match.id),
                "score": match.score,
                "status": match.status.value,
                "is_premium": match.score >= 90,
                "spotter_notes": match.spotter_notes,
                "approved_at": match.approved_at.isoformat() if match.approved_at else None,
                "seeker": {
                    "name": seeker.name,
                    "city": seeker.city,
                    "state": seeker.state,
                },
                "job": {"title": job.title},
            }
            for match, seeker, job in rows
        ],
    }