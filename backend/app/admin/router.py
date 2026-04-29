# C:\Users\Melody\Desktop\spotter_dashboards\spotter\backend\app\admin\router.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.deps import get_admin, get_super_admin, get_job_approver
from app.models import (
    User, UserRole, JobSeeker, Organization, Agent, Spotter,
    Job, JobStatus, Match, MatchStatus, Payment, PaymentStatus, AgentPoint
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def platform_stats(
    user: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    """Dashboard stats for admin."""

    async def count(model, condition=None):
        stmt = select(func.count(model.id))
        if condition is not None:
            stmt = stmt.where(condition)
        result = await db.execute(stmt)
        return result.scalar() or 0

    seekers = await count(JobSeeker)
    orgs = await count(Organization)
    agents = await count(Agent)
    spotters = await count(Spotter)
    active_jobs = await count(Job, Job.status == "active")
    total_matches = await count(Match)
    approved_matches = await count(Match, Match.status == MatchStatus.REVEALED)
    pending_matches = await count(Match, Match.status == MatchStatus.PENDING_SPOTTER)

    # Revenue
    revenue_result = await db.execute(
        select(func.sum(Payment.amount)).where(Payment.status == PaymentStatus.SUCCESS)
    )
    total_revenue_kobo = revenue_result.scalar() or 0
    total_revenue_naira = total_revenue_kobo / 100

    return {
        "users": {
            "seekers": seekers,
            "organizations": orgs,
            "agents": agents,
            "spotters": spotters,
        },
        "jobs": {"active": active_jobs},
        "matches": {
            "total": total_matches,
            "approved": approved_matches,
            "pending_review": pending_matches,
        },
        "revenue": {
            "total_naira": total_revenue_naira,
        },
    }


@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    user: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    users = result.scalars().all()

    return [
        {
            "id": str(u.id),
            "email": u.email,
            "role": u.role.value,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


class UserStatusUpdate(BaseModel):
    is_active: bool


@router.put("/users/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    body: UserStatusUpdate,
    admin: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Super admin required to modify admins
    if target.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN) and admin.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin required")

    target.is_active = body.is_active
    await db.commit()
    return {"user_id": user_id, "is_active": body.is_active}


class RoleUpdate(BaseModel):
    role: UserRole


@router.put("/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    body: RoleUpdate,
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.role = body.role
    await db.commit()
    return {"user_id": user_id, "new_role": body.role.value}


class BonusPointsRequest(BaseModel):
    agent_id: Optional[str] = None  # None = all agents
    points: float
    reason: str = "admin_bonus"


@router.post("/promotions/bonus-points")
async def grant_bonus_points(
    body: BonusPointsRequest,
    admin: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    """Grant bonus points to one or all agents (weekly promotions)."""
    if body.agent_id:
        result = await db.execute(select(Agent).where(Agent.id == body.agent_id))
        agents = [result.scalar_one_or_none()]
        if not agents[0]:
            raise HTTPException(status_code=404, detail="Agent not found")
    else:
        result = await db.execute(select(Agent).where(Agent.is_active == True))
        agents = result.scalars().all()

    for agent in agents:
        agent.points += body.points
        db.add(AgentPoint(
            agent_id=agent.id,
            delta=body.points,
            reason=body.reason,
        ))

    await db.commit()
    return {"message": f"Granted {body.points} points to {len(agents)} agent(s)"}


@router.get("/payments")
async def list_payments(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    admin: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Payment)
    if status:
        stmt = stmt.where(Payment.status == status)
    stmt = stmt.order_by(Payment.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    payments = result.scalars().all()

    return [
        {
            "id": str(p.id),
            "payer_type": p.payer_type,
            "purpose": p.purpose.value,
            "amount_naira": p.amount / 100,
            "status": p.status.value,
            "reference": p.reference,
            "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            "created_at": p.created_at.isoformat(),
        }
        for p in payments
    ]


@router.post("/payments/{payment_id}/approve-payout")
async def approve_payout(
    payment_id: str,
    admin: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve an agent points payout request."""
    from datetime import datetime, timezone
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    payment.status = PaymentStatus.SUCCESS
    payment.paid_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Payout approved", "reference": payment.reference}


# ── Analytics endpoint ────────────────────────────────────────────────────

@router.get("/analytics")
async def platform_analytics(
    user: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns time-series growth data for charts.
    Covers the last 8 weeks, grouped by week.
    Also returns "new this week" counts for each entity type.
    """
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import and_

    now = datetime.now(timezone.utc)

    # ── Helper: count rows created in a time window ────────────────────────
    async def count_in_range(model, start, end):
        result = await db.execute(
            select(func.count(model.id)).where(
                and_(model.created_at >= start, model.created_at < end)
            )
        )
        return result.scalar() or 0

    async def count_matches_in_range(start, end):
        result = await db.execute(
            select(func.count(Match.id)).where(
                and_(Match.matched_at >= start, Match.matched_at < end)
            )
        )
        return result.scalar() or 0

    # ── Build 8-week history ───────────────────────────────────────────────
    weeks = []
    for i in range(7, -1, -1):          # 7 weeks ago → current week
        week_start = now - timedelta(weeks=i + 1)
        week_end   = now - timedelta(weeks=i)
        label = week_start.strftime("%-d %b") if i > 0 else "This week"

        seekers_w  = await count_in_range(JobSeeker,    week_start, week_end)
        orgs_w     = await count_in_range(Organization, week_start, week_end)
        agents_w   = await count_in_range(Agent,        week_start, week_end)
        matches_w  = await count_matches_in_range(week_start, week_end)

        weeks.append({
            "week":          label,
            "seekers":       seekers_w,
            "organizations": orgs_w,
            "agents":        agents_w,
            "matches":       matches_w,
        })

    # ── "New this week" snapshot ───────────────────────────────────────────
    week_ago = now - timedelta(weeks=1)
    new_seekers  = await count_in_range(JobSeeker,    week_ago, now)
    new_orgs     = await count_in_range(Organization, week_ago, now)
    new_agents   = await count_in_range(Agent,        week_ago, now)
    new_matches  = await count_matches_in_range(week_ago, now)

    # ── All-time totals (for the summary cards) ────────────────────────────
    async def total(model):
        result = await db.execute(select(func.count(model.id)))
        return result.scalar() or 0

    total_seekers  = await total(JobSeeker)
    total_orgs     = await total(Organization)
    total_agents   = await total(Agent)
    total_matches_all = await db.execute(select(func.count(Match.id)))
    total_matches_count = total_matches_all.scalar() or 0

    # ── Match status breakdown for donut chart ─────────────────────────────
    approved_count = await db.execute(
        select(func.count(Match.id)).where(Match.status == MatchStatus.REVEALED)
    )
    pending_count = await db.execute(
        select(func.count(Match.id)).where(Match.status == MatchStatus.PENDING_SPOTTER)
    )
    rejected_count = await db.execute(
        select(func.count(Match.id)).where(Match.status == MatchStatus.SPOTTER_REJECTED)
    )

    match_breakdown = [
        {"name": "Approved",       "value": approved_count.scalar() or 0,  "color": "#16a34a"},
        {"name": "Pending Review", "value": pending_count.scalar() or 0,   "color": "#d97706"},
        {"name": "Rejected",       "value": rejected_count.scalar() or 0,  "color": "#dc2626"},
    ]

    return {
        "summary": {
            "seekers":  {"total": total_seekers,       "new_this_week": new_seekers},
            "orgs":     {"total": total_orgs,          "new_this_week": new_orgs},
            "agents":   {"total": total_agents,        "new_this_week": new_agents},
            "matches":  {"total": total_matches_count, "new_this_week": new_matches},
        },
        "weekly_growth": weeks,
        "match_breakdown": match_breakdown,
    }



# Additional admin endpoints (e.g. manual match approval, content moderation) ------------- As I add 

# ── Match management (Admin / Executive Admin / Super Admin) ──────────────

@router.get("/matches")
async def list_all_matches(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    admin: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    List all matches across the platform with seeker + job details.
    Filterable by status: pending_spotter | spotter_approved | revealed | spotter_rejected
    """
    from app.models import JobSeeker, Job, Organization

    stmt = (
        select(Match, JobSeeker, Job)
        .join(JobSeeker, Match.seeker_id == JobSeeker.id)
        .join(Job, Match.job_id == Job.id)
        .order_by(Match.matched_at.desc())
    )
    if status:
        stmt = stmt.where(Match.status == status)

    stmt = stmt.offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()

    # Total count for pagination
    count_stmt = select(func.count(Match.id))
    if status:
        count_stmt = count_stmt.where(Match.status == status)
    total = (await db.execute(count_stmt)).scalar() or 0

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "matches": [
            {
                "id": str(match.id),
                "score": match.score,
                "breakdown": match.score_breakdown,
                "status": match.status.value,
                "triggered_by": match.triggered_by,
                "certificate_issued": match.certificate_issued,
                "matched_at": match.matched_at.isoformat(),
                "approved_at": match.approved_at.isoformat() if match.approved_at else None,
                "spotter_notes": match.spotter_notes,
                "seeker": {
                    "id": str(seeker.id),
                    "name": seeker.name,
                    "email": None,   # loaded separately if needed
                    "city": seeker.city,
                    "state": seeker.state,
                    "education": seeker.education,
                    "skills": seeker.skills or [],
                    "available": seeker.available,
                    "cv_url": seeker.cv_url,
                    "desired_job": seeker.desired_job,
                    "nysc_status": seeker.nysc_status,
                    "school_attended": seeker.school_attended,
                    "course_studied": seeker.course_studied,
                },
                "job": {
                    "id": str(job.id),
                    "title": job.title,
                    "city": job.city,
                    "state": job.state,
                    "work_mode": job.work_mode,
                    "status": job.status.value,
                },
            }
            for match, seeker, job in rows
        ],
    }


class MatchDecisionBody(BaseModel):
    notes: Optional[str] = None


@router.post("/matches/{match_id}/approve")
async def admin_approve_match(
    match_id: str,
    body: MatchDecisionBody,
    admin: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin approves a match → status becomes REVEALED.
    Triggers certificate generation as a background task.
    """
    from datetime import datetime, timezone
    from app.tasks.matching_tasks import generate_certificate

    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.status == MatchStatus.REVEALED:
        raise HTTPException(status_code=409, detail="Match already approved")

    match.status = MatchStatus.REVEALED
    # match.approved_at = datetime.now(timezone.utc)
    match.approved_at = datetime.utcnow()
    if body.notes:
        match.spotter_notes = body.notes

    await db.commit()

    # Fire certificate generation in background (non-blocking)
    try:
        generate_certificate.delay(str(match.id))
    except Exception:
        pass  # Celery might not be running in dev — don't block approval

    return {
        "match_id": match_id,
        "status": "revealed",
        "approved_at": match.approved_at.isoformat(),
        "message": "Match approved and revealed to organisation.",
    }


@router.post("/matches/{match_id}/reject")
async def admin_reject_match(
    match_id: str,
    body: MatchDecisionBody,
    admin: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin rejects a match → status becomes SPOTTER_REJECTED."""
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.status == MatchStatus.REVEALED:
        raise HTTPException(status_code=409, detail="Cannot reject an already approved match")

    match.status = MatchStatus.SPOTTER_REJECTED
    if body.notes:
        match.spotter_notes = body.notes

    await db.commit()

    return {
        "match_id": match_id,
        "status": "spotter_rejected",
        "message": "Match rejected.",
    }


# ── Job Approval Workflow ──────────────────────────────────────────────────

# I go revert if e no work asap

@router.get("/jobs/pending")
async def list_pending_jobs(
    admin: User = Depends(get_job_approver),
    db: AsyncSession = Depends(get_db),
):
    """List all jobs pending approval. Only admins, super admins, and spotters can view."""
    result = await db.execute(
        select(Job)
        .where(Job.status == JobStatus.PENDING_APPROVAL)
        .order_by(Job.created_at.desc())
    )
    pending_jobs = result.scalars().all()

    return {
        "count": len(pending_jobs),
        "jobs": [
            {
                "id": str(job.id),
                "title": job.title,
                "description": job.description[:200] + "..." if len(job.description) > 200 else job.description,
                "org_id": str(job.org_id) if job.org_id else None,
                "agent_id": str(job.agent_id) if job.agent_id else None,
                "poster_type": job.poster_type,
                "city": job.city,
                "state": job.state,
                "employment_type": job.employment_type,
                "salary_min": job.salary_min,
                "salary_max": job.salary_max,
                "created_at": job.created_at.isoformat() if job.created_at else None,
            }
            for job in pending_jobs
        ],
    }


class JobApprovalBody(BaseModel):
    """Request body for job approval/rejection."""
    notes: Optional[str] = None


@router.post("/jobs/{job_id}/approve")
async def admin_approve_job(
    job_id: str,
    body: JobApprovalBody,
    admin: User = Depends(get_job_approver),
    db: AsyncSession = Depends(get_db),
):
    """Admin approves a job → status becomes ACTIVE. Triggers auto-matching."""
    from app.tasks.matching_tasks import auto_match_job

    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.PENDING_APPROVAL:
        raise HTTPException(status_code=409, detail="Job is not pending approval")

    job.status = JobStatus.ACTIVE
    job.approved_by = admin.id
    job.approved_at = datetime.utcnow()

    await db.commit()

    # Index in Meilisearch (non-blocking — fails silently if unavailable)
    try:
        from app.jobs.search import index_job
        index_job(job)
    except Exception:
        pass  # Non-blocking failure

    # Auto-trigger matching for org jobs
    if job.org_id:
        try:
            auto_match_job.delay(str(job.id))
        except Exception:
            pass  # Celery might not be running — don't block approval

    return {
        "job_id": job_id,
        "status": "active",
        "approved_at": job.approved_at.isoformat(),
        "message": "Job approved and published.",
    }


@router.post("/jobs/{job_id}/reject")
async def admin_reject_job(
    job_id: str,
    body: JobApprovalBody,
    admin: User = Depends(get_job_approver),
    db: AsyncSession = Depends(get_db),
):
    """Admin rejects a job → status remains PENDING_APPROVAL but marked as rejected."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.PENDING_APPROVAL:
        raise HTTPException(status_code=409, detail="Job is not pending approval")

    job.rejected_by = admin.id
    job.rejection_reason = body.notes
    # Keep status as PENDING_APPROVAL or mark as DRAFT?
    # For now, keep as PENDING_APPROVAL so it shows in the pending list

    await db.commit()

    return {
        "job_id": job_id,
        "status": "pending_approval",
        "rejected_at": datetime.utcnow().isoformat(),
        "message": "Job rejected.",
    }


class JobEditBody(BaseModel):
    """Request body for editing pending jobs."""
    title: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    required_skills: Optional[list] = None
    required_tech_stack: Optional[list] = None
    required_experience_years: Optional[int] = None
    required_education: Optional[str] = None


@router.put("/jobs/{job_id}/edit")
async def admin_edit_job(
    job_id: str,
    body: JobEditBody,
    admin: User = Depends(get_job_approver),
    db: AsyncSession = Depends(get_db),
):
    """Admin edits a pending job before approval."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.PENDING_APPROVAL:
        raise HTTPException(status_code=409, detail="Can only edit jobs pending approval")

    # Update only provided fields
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(job, field, value)

    await db.commit()

    return {
        "job_id": job_id,
        "message": "Job updated successfully.",
        "job": {
            "title": job.title,
            "description": job.description[:200] + "..." if len(job.description) > 200 else job.description,
            "city": job.city,
            "state": job.state,
        }
    }

