import uuid
import hmac
import hashlib
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.deps import get_current_user
from app.models import (
    User, Payment, PaymentStatus, PaymentPurpose,
    Organization, JobSeeker, Agent
)
from app.config import settings

router = APIRouter(prefix="/payments", tags=["payments"])

PAYSTACK_BASE = "https://api.paystack.co"


async def paystack_initialize(email: str, amount: int, reference: str, metadata: dict) -> dict:
    """Call Paystack API to initialize a transaction."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{PAYSTACK_BASE}/transaction/initialize",
            # Configure this via `backend/.env`:
            #   PAYSTACK_SECRET_KEY=sk_live_...
            headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"},
            json={
                "email": email,
                "amount": amount,
                "reference": reference,
                "metadata": metadata,
                "callback_url": "https://spotter-web-app.vercel.app/payment/callback",
            },
        )
        data = resp.json()
        if not data.get("status"):
            raise HTTPException(status_code=400, detail=data.get("message", "Payment init failed"))
        return data["data"]


async def paystack_verify(reference: str) -> dict:
    """Verify a Paystack transaction by reference."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{PAYSTACK_BASE}/transaction/verify/{reference}",
            # Configure this via `backend/.env`:
            #   PAYSTACK_SECRET_KEY=sk_live_...
            headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"},
        )
        return resp.json()


class InitiatePaymentRequest(BaseModel):
    purpose: PaymentPurpose
    metadata: Optional[dict] = None  # e.g. {"job_id": "..."} for org_unlock


@router.post("/initiate")
async def initiate_payment(
    body: InitiatePaymentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a payment record and return Paystack checkout URL."""
    amount_map = {
        PaymentPurpose.SEEKER_MATCH: settings.SEEKER_MATCH_PRICE,
        PaymentPurpose.ORG_UNLOCK: settings.ORG_UNLOCK_PRICE,
        PaymentPurpose.ORG_JOB_POST: settings.ORG_JOB_POST_PRICE,
        PaymentPurpose.AGENT_SUBSCRIPTION: settings.AGENT_PRO_MONTHLY,
    }

    amount = amount_map.get(body.purpose)
    if not amount:
        raise HTTPException(status_code=400, detail="Invalid payment purpose")

    # Determine payer profile ID
    payer_id = None
    payer_type = user.role.value

    if user.role.value == "seeker":
        result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
        profile = result.scalar_one_or_none()
        payer_id = profile.id if profile else None
    elif user.role.value == "org":
        result = await db.execute(select(Organization).where(Organization.user_id == user.id))
        profile = result.scalar_one_or_none()
        payer_id = profile.id if profile else None
    elif user.role.value == "agent":
        result = await db.execute(select(Agent).where(Agent.user_id == user.id))
        profile = result.scalar_one_or_none()
        payer_id = profile.id if profile else None

    reference = f"SPT-{uuid.uuid4().hex[:16].upper()}"
    metadata = body.metadata or {}
    metadata["user_id"] = str(user.id)
    metadata["purpose"] = body.purpose.value

    # Create pending payment record
    payment = Payment(
        payer_id=payer_id,
        payer_type=payer_type,
        purpose=body.purpose,
        amount=amount,
        reference=reference,
        extra_data=metadata,
    )
    db.add(payment)
    await db.commit()

    # For development without real Paystack keys, return mock
    if not settings.PAYSTACK_SECRET_KEY or settings.PAYSTACK_SECRET_KEY.startswith("sk_test_your"):
        return {
            "reference": reference,
            "amount": amount,
            "currency": "NGN",
            "authorization_url": f"http://localhost:3000/payment/mock?ref={reference}",
            "dev_mode": True,
        }

    ps_data = await paystack_initialize(user.email, amount, reference, metadata)
    return {
        "reference": reference,
        "amount": amount,
        "currency": "NGN",
        "authorization_url": ps_data["authorization_url"],
    }


@router.get("/verify/{reference}")
async def verify_payment(
    reference: str,
    db: AsyncSession = Depends(get_db),
):
    """Verify and activate a payment (called after redirect from Paystack)."""
    result = await db.execute(select(Payment).where(Payment.reference == reference))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.status == PaymentStatus.SUCCESS:
        return {"status": "success", "message": "Payment already verified"}

    # In dev mode (no real keys), auto-approve
    if not settings.PAYSTACK_SECRET_KEY or settings.PAYSTACK_SECRET_KEY.startswith("sk_test_your"):
        payment.status = PaymentStatus.SUCCESS
        payment.paid_at = datetime.now(timezone.utc)
        # Record a mock provider ref for audit/debug.
        payment.provider_ref = f"mock-{reference}"
        await db.commit()
        return {"status": "success", "message": "Payment verified (dev mode)"}

    ps_result = await paystack_verify(reference)
    if ps_result.get("data", {}).get("status") == "success":
        payment.status = PaymentStatus.SUCCESS
        payment.paid_at = datetime.now(timezone.utc)
        payment.provider_ref = ps_result["data"].get("id")
        await db.commit()
        return {"status": "success", "reference": reference}
    else:
        payment.status = PaymentStatus.FAILED
        await db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed")


@router.post("/webhook/paystack")
async def paystack_webhook(
    request: Request,
    x_paystack_signature: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Paystack webhook for async payment confirmation."""
    body = await request.body()

    # Verify signature
    if settings.PAYSTACK_SECRET_KEY and not settings.PAYSTACK_SECRET_KEY.startswith("sk_test_your"):
        expected = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode(),
            body,
            hashlib.sha512,
        ).hexdigest()
        if x_paystack_signature != expected:
            raise HTTPException(status_code=400, detail="Invalid signature")

    import json
    event = json.loads(body)

    if event.get("event") == "charge.success":
        reference = event["data"]["reference"]
        result = await db.execute(select(Payment).where(Payment.reference == reference))
        payment = result.scalar_one_or_none()
        if payment and payment.status == PaymentStatus.PENDING:
            payment.status = PaymentStatus.SUCCESS
            payment.paid_at = datetime.now(timezone.utc)
            await db.commit()

    return {"received": True}
