from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.deps import get_spotter
from app.models import User, Spotter, Match, MatchStatus, JobSeeker, Job, Certificate
from app.tasks.celery_app import celery_app

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
    """Approve or reject a match. Approval reveals it to both parties."""
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

    match.spotter_id = spotter.id
    match.spotter_notes = body.notes
    match.approved_at = datetime.now(timezone.utc)

    if body.approved:
        match.status = MatchStatus.REVEALED
        spotter.total_approved += 1

        # Generate certificate for high-score matches
        if match.score >= 70:
            celery_app.send_task(
                "app.tasks.matching_tasks.generate_certificate",
                args=[str(match.id)]
            )
    else:
        match.status = MatchStatus.SPOTTER_REJECTED
        spotter.total_rejected += 1

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

    pending_count_result = await db.execute(
        select(Match).where(Match.status == MatchStatus.PENDING_SPOTTER)
    )
    pending = len(pending_count_result.scalars().all())

    return {
        "total_approved": spotter.total_approved,
        "total_rejected": spotter.total_rejected,
        "pending_in_queue": pending,
    }