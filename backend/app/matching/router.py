from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, String
from pydantic import BaseModel
from app.database import get_db
from app.deps import get_current_user, get_seeker, get_org, get_admin
from app.models import (
    User, JobSeeker, Job, Match, MatchStatus, MatchingWeight,
    Payment, PaymentStatus, PaymentPurpose, Organization,
)
from app.matching.engine import run_match
import uuid

router = APIRouter(prefix="/matching", tags=["matching"])


class TriggerMatchRequest(BaseModel):
    job_id: str


class MatchResponse(BaseModel):
    id: str
    job_id: str
    seeker_id: str
    score: float
    breakdown: dict
    status: str
    is_premium: bool
    blurred: bool = False  # True for org viewing high-score candidates without payment


async def _get_weights(db: AsyncSession) -> dict:
    result = await db.execute(select(MatchingWeight))
    weights_rows = result.scalars().all()
    if not weights_rows:
        return {}
    return {w.criterion: w.weight for w in weights_rows}


# ── Seeker: trigger match for a job ────────────────────────────────────────

@router.post("/trigger")
async def trigger_match(
    body: TriggerMatchRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_seeker),
    db: AsyncSession = Depends(get_db),
):
    """
    Seeker triggers matching for a specific job.
    First match is free; subsequent ones require payment.
    """
    # Load seeker profile
    result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
    seeker = result.scalar_one_or_none()
    if not seeker:
        raise HTTPException(status_code=404, detail="Seeker profile not found")

    if not seeker.profile_complete:
        raise HTTPException(status_code=400, detail="Please complete your profile before requesting matches")

    # Load job
    result = await db.execute(select(Job).where(Job.id == body.job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check for existing match
    result = await db.execute(
        select(Match).where(Match.job_id == job.id, Match.seeker_id == seeker.id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Match already exists for this job")

    # Free match check (first one is free)
    requires_payment = seeker.free_matches_used >= 1
    if requires_payment:
        # Check if seeker has paid for this match
        result = await db.execute(
            select(Payment).where(
                Payment.payer_id == seeker.id,
                Payment.purpose == PaymentPurpose.SEEKER_MATCH,
                Payment.status == PaymentStatus.SUCCESS,
                cast(Payment.extra_data["job_id"], String) == str(job.id),
            )
        )
        paid = result.scalar_one_or_none()
        if not paid:
            raise HTTPException(
                status_code=402,
                detail={
                    "message": "Payment required for additional matches",
                    "amount": 50000,  # in kobo = ₦500
                    "purpose": "seeker_match",
                    "job_id": str(job.id),
                }
            )

    # Run the matching engine
    weights = await _get_weights(db)
    match_result = run_match(seeker, job, weights)

    # Create match record (goes to Spotter queue)
    match = Match(
        job_id=job.id,
        seeker_id=seeker.id,
        score=match_result.score,
        score_breakdown=match_result.breakdown,
        status=MatchStatus.PENDING_SPOTTER,
        triggered_by="seeker",
    )
    db.add(match)

    # Increment free_matches_used
    seeker.free_matches_used += 1
    await db.commit()
    await db.refresh(match)

    return {
        "match_id": str(match.id),
        "score": match_result.score,
        "status": "pending_spotter",
        "message": "Match submitted for Spotter review. You'll be notified once approved.",
    }


# ── Seeker: view their matches ──────────────────────────────────────────────

@router.get("/my-matches")
async def get_my_matches(
    user: User = Depends(get_seeker),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
    seeker = result.scalar_one_or_none()
    if not seeker:
        raise HTTPException(status_code=404, detail="Profile not found")

    result = await db.execute(
        select(Match)
        .where(Match.seeker_id == seeker.id, Match.status == MatchStatus.REVEALED)
        .order_by(Match.score.desc())
    )
    matches = result.scalars().all()

    return [
        {
            "id": str(m.id),
            "job_id": str(m.job_id),
            "score": m.score,
            "breakdown": m.score_breakdown,
            "status": m.status.value,
            "certificate_issued": m.certificate_issued,
            "matched_at": m.matched_at.isoformat(),
        }
        for m in matches
    ]


# ── Org: view candidates matched to their job ──────────────────────────────

@router.get("/job/{job_id}/candidates")
async def get_job_candidates(
    job_id: str,
    user: User = Depends(get_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns matched candidates for an org's job.
    - Score < 90%: full details visible (max 2 shown for free orgs)
    - Score >= 90%: first 2 fully visible, rest blurred until payment
    """
    result = await db.execute(select(Organization).where(Organization.user_id == user.id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Verify job belongs to org
    result = await db.execute(select(Job).where(Job.id == job_id, Job.org_id == org.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get approved matches sorted by score
    result = await db.execute(
        select(Match, JobSeeker)
        .join(JobSeeker, Match.seeker_id == JobSeeker.id)
        .where(Match.job_id == job.id, Match.status == MatchStatus.REVEALED)
        .order_by(Match.score.desc())
    )
    rows = result.all()

    # Check if org has paid to unlock premium candidates
    paid_unlock = await db.execute(
        select(Payment).where(
            Payment.payer_id == org.id,
            Payment.purpose == PaymentPurpose.ORG_UNLOCK,
            Payment.status == PaymentStatus.SUCCESS,
            cast(Payment.extra_data["job_id"], String) == job_id,
        )
    )
    has_unlocked = paid_unlock.scalar_one_or_none() is not None

    # Check free matches quota
    has_free = org.free_matches_left > 0

    candidates = []
    premium_count = 0

    for i, (match, seeker) in enumerate(rows):
        is_premium_match = match.score >= 90.0
        if is_premium_match:
            premium_count += 1

        should_blur = (
            is_premium_match
            and not has_unlocked
            and premium_count > 2
        )

        if should_blur:
            candidates.append({
                "match_id": str(match.id),
                "score": match.score,
                "blurred": True,
                "name": "••••••",
                "city": seeker.city,
                "state": seeker.state,
                "available": seeker.available,
            })
        else:
            candidates.append({
                "match_id": str(match.id),
                "score": match.score,
                "blurred": False,
                "breakdown": match.score_breakdown,
                "seeker": {
                    "id": str(seeker.id),
                    "name": seeker.name,
                    "city": seeker.city,
                    "state": seeker.state,
                    "education": seeker.education,
                    "skills": seeker.skills,
                    "tech_stack": seeker.tech_stack,
                    "available": seeker.available,
                    "cv_url": seeker.cv_url,
                },
            })

    return {
        "job_id": job_id,
        "total": len(candidates),
        "premium_count": premium_count,
        "unlocked": has_unlocked,
        "unlock_required": premium_count > 2 and not has_unlocked,
        "candidates": candidates,
    }


@router.get("/org/job-match-counts")
async def org_job_match_counts(
    user: User = Depends(get_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns count of revealed (Spotter-approved) matches per job for this organisation.
    Used for org dashboard badges.
    """
    result = await db.execute(select(Organization).where(Organization.user_id == user.id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    result = await db.execute(
        select(Match.job_id, func.count(Match.id))
        .join(Job, Job.id == Match.job_id)
        .where(
            Job.org_id == org.id,
            Match.status == MatchStatus.REVEALED,
        )
        .group_by(Match.job_id)
    )
    rows = result.all()
    return {
        "counts": {str(jid): count for jid, count in rows},
    }


# ── Admin: update matching weights ─────────────────────────────────────────

@router.put("/weights")
async def update_weights(
    weights: dict[str, float],
    user: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    for criterion, weight in weights.items():
        result = await db.execute(select(MatchingWeight).where(MatchingWeight.criterion == criterion))
        row = result.scalar_one_or_none()
        if row:
            row.weight = weight
        else:
            db.add(MatchingWeight(criterion=criterion, weight=weight))
    await db.commit()
    return {"message": "Weights updated", "weights": weights}


@router.get("/weights")
async def get_weights(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MatchingWeight))
    rows = result.scalars().all()
    return {r.criterion: r.weight for r in rows}
