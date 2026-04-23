from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import logging
from app.database import get_db
from app.deps import get_seeker, get_org, get_current_user
from app.models import (
    User, UserRole, JobSeeker, Organization, Job, Application, ApplicationStatus,
    Match, MatchStatus
)
from app.matching.engine import run_match

router = APIRouter(prefix="/applications", tags=["applications"])
logger = logging.getLogger(__name__)


class ApplyRequest(BaseModel):
    job_id: str
    cover_letter: Optional[str] = None


async def _trigger_matching_on_application(
    seeker: JobSeeker,
    job: Job,
    db: AsyncSession,
) -> Optional[str]:
    """
    Trigger matching algorithm when seeker applies for a job.
    Returns match_id if successful, None if error occurred.
    
    This is non-blocking - any errors are logged but don't prevent application creation.
    """
    try:
        # Check if a match already exists for this seeker-job pair
        result = await db.execute(
            select(Match).where(Match.job_id == job.id, Match.seeker_id == seeker.id)
        )
        if result.scalar_one_or_none():
            logger.info(f"Match already exists for seeker {seeker.id} and job {job.id}")
            return None

        # Get matching weights from database (or use defaults)
        from app.matching.engine import DEFAULT_WEIGHTS
        from app.models import MatchingWeight
        
        result = await db.execute(select(MatchingWeight))
        weights_rows = result.scalars().all()
        weights = {w.criterion: w.weight for w in weights_rows} if weights_rows else {}

        # Run the matching engine
        match_result = run_match(seeker, job, weights or None)

        # Create match record with PENDING_SPOTTER status
        # This will be visible to admins and spotters for review
        match = Match(
            job_id=job.id,
            seeker_id=seeker.id,
            score=match_result.score,
            score_breakdown=match_result.breakdown,
            status=MatchStatus.PENDING_SPOTTER,
            triggered_by="seeker",
        )
        db.add(match)
        await db.flush()
        
        logger.info(
            f"Match created for seeker {seeker.id} and job {job.id} "
            f"with score {match_result.score}"
        )
        return str(match.id)

    except Exception as e:
        # Log error but don't raise - application should still succeed
        logger.error(
            f"Error triggering match for seeker {seeker.id} and job {job.id}: {str(e)}",
            exc_info=True
        )
        return None


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
    
    # Trigger matching algorithm automatically on application
    match_id = await _trigger_matching_on_application(seeker, job, db)
    
    await db.commit()
    await db.refresh(application)

    response = {
        "application_id": str(application.id),
        "job_id": str(job.id),
        "job_title": job.title,
        "status": application.status.value,
        "applied_at": application.applied_at.isoformat(),
    }
    
    # Include match info if match was created
    if match_id:
        response["match_id"] = match_id
        response["match_status"] = "pending_review"
    
    return response


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
    if not org:
        raise HTTPException(status_code=404, detail="Organization profile not found")

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
                "cv_url": s.cv_url,
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
