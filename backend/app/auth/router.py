import random
import string
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserRole, Agent, JobSeeker, Organization, Spotter, Referral
from app.auth.schemas import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest
from app.auth.service import hash_password, verify_password, create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])


def generate_referral_code(length: int = 8) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    await db.flush()  # get user.id before creating profile

    # Create role-specific profile
    if body.role == UserRole.SEEKER:
        profile = JobSeeker(user_id=user.id, name=body.email.split("@")[0])
        db.add(profile)

    elif body.role == UserRole.ORG:
        profile = Organization(user_id=user.id, name="My Organization")
        db.add(profile)

    elif body.role == UserRole.AGENT:
        referrer_agent = None
        if body.referral_code:
            result = await db.execute(select(Agent).where(Agent.referral_code == body.referral_code))
            referrer_agent = result.scalar_one_or_none()

        agent = Agent(
            user_id=user.id,
            name=body.email.split("@")[0],
            referral_code=generate_referral_code(),
            referrer_id=referrer_agent.id if referrer_agent else None,
        )
        db.add(agent)
        await db.flush()

        # Record referral chain (up to 5 levels)
        if referrer_agent:
            current = referrer_agent
            for level in range(1, 6):
                ref = Referral(referrer_id=current.id, referee_id=agent.id, level=level)
                db.add(ref)
                if not current.referrer_id:
                    break
                result = await db.execute(select(Agent).where(Agent.id == current.referrer_id))
                current = result.scalar_one_or_none()
                if not current:
                    break

    elif body.role == UserRole.SPOTTER:
        spotter = Spotter(user_id=user.id, name=body.email.split("@")[0])
        db.add(spotter)

    await db.commit()

    token_data = {"sub": str(user.id), "role": user.role.value}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        role=user.role.value,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token_data = {"sub": str(user.id), "role": user.role.value}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        role=user.role.value,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    token_data = {"sub": str(user.id), "role": user.role.value}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        role=user.role.value,
    )
