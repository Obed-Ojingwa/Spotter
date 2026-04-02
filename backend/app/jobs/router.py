from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.deps import get_current_user, get_org, get_agent, get_admin
from app.models import User, UserRole, Job, JobStatus, Organization, Agent, Payment, PaymentStatus, PaymentPurpose

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobCreate(BaseModel):
    title: str
    description: str
    city: Optional[str] = None
    state: Optional[str] = None
    work_mode: Optional[str] = None
    employment_type: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    required_skills: list[str] = []
    required_tech_stack: list[str] = []
    required_experience_years: Optional[int] = None
    required_education: Optional[str] = None
    required_degree_class: Optional[str] = None
    preferred_gender: Optional[str] = None
    preferred_religion: Optional[str] = None
    preferred_age_min: Optional[int] = None
    preferred_age_max: Optional[int] = None
    preferred_marital_status: Optional[str] = None
    certifications_required: list[str] = []
    licenses_required: list[str] = []


@router.get("")
async def list_jobs(
    q: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    work_mode: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Public job listing with filters."""
    stmt = select(Job).where(Job.status == JobStatus.ACTIVE)

    if city:
        stmt = stmt.where(Job.city.ilike(f"%{city}%"))
    if state:
        stmt = stmt.where(Job.state.ilike(f"%{state}%"))
    if work_mode:
        stmt = stmt.where(Job.work_mode == work_mode)
    if q:
        stmt = stmt.where(
            or_(
                Job.title.ilike(f"%{q}%"),
                Job.description.ilike(f"%{q}%"),
            )
        )

    stmt = stmt.order_by(Job.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    jobs = result.scalars().all()

    return {
        "page": page,
        "limit": limit,
        "jobs": [_job_summary(j) for j in jobs],
    }


@router.get("/{job_id}")
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_detail(job)


@router.post("", status_code=201)
async def create_job(
    body: JobCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Org or Agent can post a job. Free quota or requires payment."""
    if user.role not in (UserRole.ORG, UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Only organizations and agents can post jobs")

    org_id = None
    agent_id = None
    poster_type = user.role.value

    if user.role == UserRole.ORG:
        result = await db.execute(select(Organization).where(Organization.user_id == user.id))
        org = result.scalar_one_or_none()
        if not org:
            raise HTTPException(status_code=404, detail="Organization profile not found")

        # Check free posts quota or payment
        if org.free_posts_left > 0:
            org.free_posts_left -= 1
        else:
            # Verify payment
            result = await db.execute(
                select(Payment).where(
                    Payment.payer_id == org.id,
                    Payment.purpose == PaymentPurpose.ORG_JOB_POST,
                    Payment.status == PaymentStatus.SUCCESS,
                ).order_by(Payment.created_at.desc())
            )
            paid = result.first()
            if not paid:
                raise HTTPException(
                    status_code=402,
                    detail={"message": "Payment required to post more jobs", "amount": 500000, "purpose": "org_job_post"}
                )
        org_id = org.id

    elif user.role == UserRole.AGENT:
        result = await db.execute(select(Agent).where(Agent.user_id == user.id))
        agent = result.scalar_one_or_none()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent profile not found")
        agent_id = agent.id

    job = Job(
        **body.model_dump(),
        org_id=org_id,
        agent_id=agent_id,
        poster_type=poster_type,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # TODO: Index in Meilisearch
    return _job_detail(job)


@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Only poster or admin can delete
    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        pass
    elif user.role == UserRole.ORG:
        result = await db.execute(select(Organization).where(Organization.user_id == user.id))
        org = result.scalar_one_or_none()
        if not org or job.org_id != org.id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    job.status = JobStatus.CLOSED
    await db.commit()
    return {"message": "Job closed"}


def _job_summary(job: Job) -> dict:
    return {
        "id": str(job.id),
        "title": job.title,
        "city": job.city,
        "state": job.state,
        "work_mode": job.work_mode,
        "employment_type": job.employment_type,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "required_skills": job.required_skills,
        "status": job.status.value,
        "created_at": job.created_at.isoformat(),
    }


def _job_detail(job: Job) -> dict:
    return {
        **_job_summary(job),
        "description": job.description,
        "required_tech_stack": job.required_tech_stack,
        "required_experience_years": job.required_experience_years,
        "required_education": job.required_education,
        "required_degree_class": job.required_degree_class,
        "certifications_required": job.certifications_required,
        "licenses_required": job.licenses_required,
        "expires_at": job.expires_at.isoformat() if job.expires_at else None,
    }