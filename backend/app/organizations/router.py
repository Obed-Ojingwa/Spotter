from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.deps import get_org
from app.models import User, Organization

router = APIRouter(prefix="/org", tags=["organization"])


class OrgProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class ContractStaffRequest(BaseModel):
    title: str
    description: str
    duration_months: int
    city: Optional[str] = None
    state: Optional[str] = None
    required_skills: list[str] = []


@router.get("/profile")
async def get_org_profile(
    user: User = Depends(get_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organization).where(Organization.user_id == user.id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return _org_response(org, user)


@router.put("/profile")
async def update_org_profile(
    body: OrgProfileUpdate,
    user: User = Depends(get_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organization).where(Organization.user_id == user.id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(org, field, value)

    await db.commit()
    await db.refresh(org)
    return _org_response(org, user)


@router.post("/contract-staff")
async def request_contract_staff(
    body: ContractStaffRequest,
    user: User = Depends(get_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Org requests contract staff — this creates a special job posting
    flagged as contract type. Matching engine runs against it normally.
    """
    from app.models import Job, JobStatus
    from datetime import datetime, timezone, timedelta

    result = await db.execute(select(Organization).where(Organization.user_id == user.id))
    org = result.scalar_one_or_none()

    job = Job(
        title=body.title,
        description=body.description,
        org_id=org.id,
        poster_type="org",
        city=body.city,
        state=body.state,
        work_mode="onsite",
        employment_type="contract",
        required_skills=body.required_skills,
        required_tech_stack=[],
        status=JobStatus.ACTIVE,
        expires_at=datetime.now(timezone.utc) + timedelta(days=body.duration_months * 30),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    return {
        "message": "Contract staff request posted as job listing",
        "job_id": str(job.id),
        "title": job.title,
    }


def _org_response(org: Organization, user: User) -> dict:
    return {
        "id": str(org.id),
        "email": user.email,
        "name": org.name,
        "description": org.description,
        "industry": org.industry,
        "website": org.website,
        "phone": org.phone,
        "address": org.address,
        "city": org.city,
        "state": org.state,
        "logo_url": org.logo_url,
        "free_posts_left": org.free_posts_left,
        "free_matches_left": org.free_matches_left,
        "is_verified": org.is_verified,
    }