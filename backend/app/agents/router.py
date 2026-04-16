from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.database import get_db
from app.deps import get_agent
from app.models import User, Agent, AgentPoint, Referral, Job, Payment, PaymentPurpose, PaymentStatus
from app.config import settings

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/dashboard")
async def agent_dashboard(
    user: User = Depends(get_agent),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Agent).where(Agent.user_id == user.id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent profile not found")

    # Jobs posted by this agent
    jobs_result = await db.execute(
        select(func.count(Job.id)).where(Job.agent_id == agent.id)
    )
    total_jobs = jobs_result.scalar() or 0

    # Total referrals made
    ref_result = await db.execute(
        select(func.count(Referral.id)).where(Referral.referrer_id == agent.id, Referral.level == 1)
    )
    total_referrals = ref_result.scalar() or 0

    # Naira value of points
    naira_value = agent.points * settings.POINTS_TO_NAIRA

    return {
        "name": agent.name,
        "referral_code": agent.referral_code,
        "points": agent.points,
        "naira_value": naira_value,
        "plan": agent.plan,
        "total_jobs_posted": total_jobs,
        "total_referrals": total_referrals,
    }


@router.get("/points/history")
async def points_history(
    user: User = Depends(get_agent),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Agent).where(Agent.user_id == user.id))
    agent = result.scalar_one_or_none()

    result = await db.execute(
        select(AgentPoint)
        .where(AgentPoint.agent_id == agent.id)
        .order_by(AgentPoint.created_at.desc())
        .limit(50)
    )
    entries = result.scalars().all()

    return [
        {
            "delta": e.delta,
            "reason": e.reason,
            "created_at": e.created_at.isoformat(),
        }
        for e in entries
    ]


class ConvertPointsRequest(BaseModel):
    points_to_convert: float
    bank_account_name: str
    bank_account_number: str
    bank_name: str


@router.post("/points/convert")
async def convert_points(
    body: ConvertPointsRequest,
    user: User = Depends(get_agent),
    db: AsyncSession = Depends(get_db),
):
    """Request conversion of points to naira (admin approves payout)."""
    result = await db.execute(select(Agent).where(Agent.user_id == user.id))
    agent = result.scalar_one_or_none()

    if body.points_to_convert < 10:
        raise HTTPException(status_code=400, detail="Minimum conversion is 10 points (₦20,000)")

    if agent.points < body.points_to_convert:
        raise HTTPException(status_code=400, detail=f"Insufficient points. You have {agent.points} points.")

    naira_amount = body.points_to_convert * settings.POINTS_TO_NAIRA

    # Deduct points and create payment record for admin to approve
    agent.points -= body.points_to_convert
    import uuid
    payment = Payment(
        payer_id=agent.id,
        payer_type="agent",
        purpose=PaymentPurpose.POINTS_PAYOUT,
        amount=int(naira_amount * 100),  # in kobo
        reference=f"PAYOUT-{uuid.uuid4().hex[:12].upper()}",
        metadata={
            "bank_account_name": body.bank_account_name,
            "bank_account_number": body.bank_account_number,
            "bank_name": body.bank_name,
            "points_converted": body.points_to_convert,
        }
    )
    db.add(payment)

    # Log the deduction
    point_entry = AgentPoint(
        agent_id=agent.id,
        delta=-body.points_to_convert,
        reason="points_conversion_request",
    )
    db.add(point_entry)
    await db.commit()

    return {
        "message": "Payout request submitted. Admin will process within 2 business days.",
        "points_deducted": body.points_to_convert,
        "naira_amount": naira_amount,
        "reference": payment.reference,
    }


@router.get("/referrals")
async def get_referrals(
    user: User = Depends(get_agent),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Agent).where(Agent.user_id == user.id))
    agent = result.scalar_one_or_none()

    # Direct referrals (level 1)
    result = await db.execute(
        select(Referral, Agent)
        .join(Agent, Referral.referee_id == Agent.id)
        .where(Referral.referrer_id == agent.id, Referral.level == 1)
        .order_by(Referral.created_at.desc())
    )
    rows = result.all()

    return {
        "total_direct_referrals": len(rows),
        "referral_code": agent.referral_code,
        "referrals": [
            {
                "name": a.name,
                "plan": a.plan,
                "joined_at": r.created_at.isoformat(),
            }
            for r, a in rows
        ]
    }
