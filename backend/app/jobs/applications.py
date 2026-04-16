from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.deps import get_seeker, get_org, get_current_user
from app.models import User, UserRole, JobSeeker, Organization, Job, Application, ApplicationStatus

router = APIRouter(prefix="/applications", tags=["applications"])


class ApplyRequest(BaseModel):
    job_id: str
    cover_letter: Optional[str] = None


@router.post("", status_code=201)
async def apply_to_job(
    body: ApplyRequest,
    user: User = Depends(get_seeker),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
    seeker = result.scalar_one_or_none()
    if not seeker:
        raise HTTPException(status_code=404, detail="Seeker profile not found")

    result = await db.execute(select(Job).where(Job.id == body.job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Prevent duplicate applications
    result = await db.execute(
        select(Application).where(
            Application.job_id == job.id,
            Application.seeker_id == seeker.id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You have already applied to this job")

    application = Application(
        job_id=job.id,
        seeker_id=seeker.id,
        cover_letter=body.cover_letter,
        status=ApplicationStatus.APPLIED,
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)

    return {
        "application_id": str(application.id),
        "job_id": str(job.id),
        "job_title": job.title,
        "status": application.status.value,
        "applied_at": application.applied_at.isoformat(),
    }


@router.get("/mine")
async def get_my_applications(
    user: User = Depends(get_seeker),
    db: AsyncSession = Depends(get_db),
):
    """Seeker views their own applications."""
    result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
    seeker = result.scalar_one_or_none()

    result = await db.execute(
        select(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .where(Application.seeker_id == seeker.id)
        .order_by(Application.applied_at.desc())
    )
    rows = result.all()

    return [
        {
            "application_id": str(a.id),
            "status": a.status.value,
            "applied_at": a.applied_at.isoformat(),
            "job": {
                "id": str(j.id),
                "title": j.title,
                "city": j.city,
                "state": j.state,
                "work_mode": j.work_mode,
            },
        }
        for a, j in rows
    ]


@router.get("/job/{job_id}")
async def get_job_applications(
    job_id: str,
    user: User = Depends(get_org),
    db: AsyncSession = Depends(get_db),
):
    """Org views applicants for one of their jobs."""
    result = await db.execute(select(Organization).where(Organization.user_id == user.id))
    org = result.scalar_one_or_none()

    result = await db.execute(select(Job).where(Job.id == job_id, Job.org_id == org.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not yours")

    result = await db.execute(
        select(Application, JobSeeker)
        .join(JobSeeker, Application.seeker_id == JobSeeker.id)
        .where(Application.job_id == job.id)
        .order_by(Application.applied_at.desc())
    )
    rows = result.all()

    return [
        {
            "application_id": str(a.id),
            "status": a.status.value,
            "applied_at": a.applied_at.isoformat(),
            "cover_letter": a.cover_letter,
            "seeker": {
                "id": str(s.id),
                "name": s.name,
                "city": s.city,
                "state": s.state,
                "education": s.education,
                "skills": s.skills,
                "available": s.available,
            },
        }
        for a, s in rows
    ]


@router.put("/{application_id}/status")
async def update_application_status(
    application_id: str,
    status: ApplicationStatus,
    user: User = Depends(get_org),
    db: AsyncSession = Depends(get_db),
):
    """Org shortlists or rejects an applicant."""
    result = await db.execute(select(Application).where(Application.id == application_id))
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    application.status = status
    await db.commit()
    return {"application_id": application_id, "new_status": status.value}
