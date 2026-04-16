from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.deps import get_admin, get_super_admin
from app.models import (
    User, UserRole, JobSeeker, Organization, Agent, Spotter,
    Job, Match, MatchStatus, Payment, PaymentStatus, AgentPoint
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
