from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.deps import get_org
from app.models import User, Organization, Job

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



    # ── Training request ───────────────────────────────────────────────────────

class TrainingRequest(BaseModel):
    title: str
    description: str
    skills_needed: list[str] = []
    participant_count: Optional[int] = None
    preferred_date: Optional[str] = None


@router.post("/training-request")
async def request_training(
    body: TrainingRequest,
    user: User = Depends(get_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Organisation requests employee training.
    Creates a special job posting flagged as training type.
    """
    from app.models import Job, JobStatus
    from datetime import datetime, timezone, timedelta

    result = await db.execute(select(Organization).where(Organization.user_id == user.id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    # Store as a special job entry with employment_type=training
    job = Job(
        title=f"[Training] {body.title}",
        description=body.description,
        org_id=org.id,
        poster_type="org",
        employment_type="training",
        required_skills=body.skills_needed,
        required_tech_stack=[],
        status=JobStatus.DRAFT,   # draft — not public
        expires_at=datetime.now(timezone.utc) + timedelta(days=90),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    return {
        "message": "Training request submitted. Our team will be in touch.",
        "request_id": str(job.id),
        "title": body.title,
    }


@router.get("/jobs")
async def list_org_jobs(
    user: User = Depends(get_org),
    db: AsyncSession = Depends(get_db),
    page: int = 1,
    limit: int = 50,
):
    """Jobs posted by this organisation (dashboard / manage listings)."""
    result = await db.execute(select(Organization).where(Organization.user_id == user.id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    stmt = (
        select(Job)
        .where(Job.org_id == org.id)
        .order_by(Job.created_at.desc())
        .offset(max(0, (page - 1) * limit))
        .limit(min(limit, 100))
    )
    result = await db.execute(stmt)
    jobs = result.scalars().all()

    def _status(j: Job) -> str:
        s = j.status
        return s.value if hasattr(s, "value") else str(s)

    return {
        "page": page,
        "limit": limit,
        "jobs": [
            {
                "id": str(j.id),
                "title": j.title,
                "poster_type": j.poster_type,
                "agent_id": str(j.agent_id) if j.agent_id else None,
                "city": j.city,
                "state": j.state,
                "work_mode": j.work_mode,
                "employment_type": j.employment_type,
                "status": _status(j),
                "created_at": j.created_at.isoformat() if j.created_at else "",
            }
            for j in jobs
        ],
    }


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
