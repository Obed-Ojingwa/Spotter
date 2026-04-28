# C:\Users\Melody\Documents\Spotter\backend\app\jobs\router.py

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from app.timeutil import utc_plus_days_naive
from app.database import get_db
from app.deps import get_current_user, get_org, get_agent, get_admin
from app.models import User, UserRole, Job, JobStatus, Organization, Agent, Payment, PaymentStatus, PaymentPurpose
from app.jobs.search import index_job, remove_job, search_jobs
from app.matching.auto_match import generate_auto_matches_for_job

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobCreate(BaseModel):
    title: str
    description: str
    # When an Agent posts a job on behalf of an organisation,
    # they must provide the organisation id here.
    org_id: Optional[str] = None
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
    required_desired_job: Optional[str] = None
    required_nysc_status: Optional[str] = None
    required_state_of_origin: Optional[str] = None
    required_tribe: Optional[str] = None
    required_languages_spoken: list[str] = []
    required_skin_complexion: Optional[str] = None
    required_physical_attributes: Optional[str] = None
    required_professional_qualification: Optional[str] = None
    required_school_attended: Optional[str] = None
    required_course_studied: Optional[str] = None
    required_writing_skill: Optional[str] = None
    required_speaking_skill: Optional[str] = None
    required_communication_skill: Optional[str] = None
    required_work_attitude: Optional[str] = None
    required_reliability_consistency: Optional[str] = None
    required_emotional_intelligence: Optional[str] = None
    required_learning_ability: Optional[str] = None
    required_charisma: Optional[str] = None
    required_dress_sense: Optional[str] = None
    required_motivational_drive: Optional[str] = None
    required_location: Optional[str] = None
    required_proximity: Optional[str] = None
    required_track_record: Optional[str] = None
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
    """
    Public job listing with filters.
    Tries Meilisearch first for fast full-text search,
    falls back to database LIKE queries if Meilisearch is unavailable.
    """
    # ── Try Meilisearch first ──────────────────────────────────────────────
    meili_result = search_jobs(
        query=q or "",
        filters={"state": state, "work_mode": work_mode, "city": city},
        page=page,
        limit=limit,
    )

    if meili_result is not None:
        # Meilisearch available — return its results directly
        hits = meili_result.get("hits", [])

        # Truncate description to avoid huge payloads for cards.
        for hit in hits:
            desc = hit.get("description") if isinstance(hit, dict) else None
            if isinstance(desc, str) and desc:
                hit["description"] = desc[:200] + ("..." if len(desc) > 200 else "")

        return {
            "page": page,
            "limit": limit,
            "source": "search",
            "jobs": hits,
        }

    # ── Fall back to database ──────────────────────────────────────────────
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
        "source": "database",
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
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Org or Agent can post a job. Free quota or requires payment. Auto-triggers matching."""
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

        if org.free_posts_left > 0:
            org.free_posts_left -= 1
        else:
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

        # Agent must attach a target organisation for the job.
        if not body.org_id:
            raise HTTPException(status_code=400, detail="org_id is required when an agent posts a job")
        org = (await db.execute(select(Organization).where(Organization.id == body.org_id))).scalar_one_or_none()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        org_id = org.id

        # Award agent 2 points for posting a job
        from app.models import AgentPoint
        agent.points += 2.0
        db.add(AgentPoint(
            agent_id=agent.id,
            delta=2.0,
            reason="job_posted",
        ))

    job = Job(
        **body.model_dump(exclude={"org_id"}),
        org_id=org_id,
        agent_id=agent_id,
        poster_type=poster_type,
        expires_at=utc_plus_days_naive(30),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Index in Meilisearch (non-blocking — fails silently if unavailable)
    index_job(job)

    # Auto-trigger matching in background for org jobs
    if org_id:
        background_tasks.add_task(generate_auto_matches_for_job, job, db)

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

    # Remove from search index
    remove_job(job_id)

    return {"message": "Job closed"}


@router.post("/admin/reindex", tags=["admin"])
async def reindex_all_jobs(
    user: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: reindex all active jobs in Meilisearch."""
    from app.jobs.search import reindex_all
    result = await db.execute(select(Job).where(Job.status == JobStatus.ACTIVE))
    jobs = result.scalars().all()
    count = reindex_all(jobs)
    return {"message": f"Reindexed {count} jobs"}


def _job_summary(job) -> dict:
    status = job.status.value if hasattr(job.status, "value") else job.status
    description = (job.description or "") if hasattr(job, "description") else ""
    description = description[:200] + ("..." if len(description) > 200 else "")
    return {
        "id":               str(job["id"]) if isinstance(job, dict) else str(job.id),
        "title":            job.get("title") if isinstance(job, dict) else job.title,
        "org_id":           job.get("org_id") if isinstance(job, dict) else (str(job.org_id) if job.org_id else None),
        "agent_id":         job.get("agent_id") if isinstance(job, dict) else (str(job.agent_id) if job.agent_id else None),
        "poster_type":      job.get("poster_type") if isinstance(job, dict) else getattr(job, "poster_type", None),
        "city":             job.get("city") if isinstance(job, dict) else job.city,
        "state":            job.get("state") if isinstance(job, dict) else job.state,
        "work_mode":        job.get("work_mode") if isinstance(job, dict) else job.work_mode,
        "employment_type":  job.get("employment_type") if isinstance(job, dict) else job.employment_type,
        "salary_min":       job.get("salary_min") if isinstance(job, dict) else job.salary_min,
        "salary_max":       job.get("salary_max") if isinstance(job, dict) else job.salary_max,
        "required_skills":  job.get("required_skills", []) if isinstance(job, dict) else job.required_skills,
        "status":           job.get("status", "active") if isinstance(job, dict) else status,
        "created_at":       job.get("created_at", "") if isinstance(job, dict) else job.created_at.isoformat(),
        "description":      job.get("description") if isinstance(job, dict) else description,
    }


def _job_detail(job: Job) -> dict:
    return {
        **_job_summary(job),
        "description":                    job.description,
        "required_tech_stack":            job.required_tech_stack,
        "required_experience_years":      job.required_experience_years,
        "required_education":             job.required_education,
        "required_degree_class":          job.required_degree_class,
        "preferred_gender":               job.preferred_gender,
        "preferred_religion":              job.preferred_religion,
        "preferred_age_min":              job.preferred_age_min,
        "preferred_age_max":              job.preferred_age_max,
        "preferred_marital_status":       job.preferred_marital_status,
        "required_desired_job":            job.required_desired_job,
        "required_nysc_status":            job.required_nysc_status,
        "required_state_of_origin":        job.required_state_of_origin,
        "required_tribe":                  job.required_tribe,
        "required_languages_spoken":       job.required_languages_spoken,
        "required_skin_complexion":        job.required_skin_complexion,
        "required_physical_attributes":    job.required_physical_attributes,
        "required_professional_qualification": job.required_professional_qualification,
        "required_school_attended":        job.required_school_attended,
        "required_course_studied":         job.required_course_studied,
        "required_writing_skill":          job.required_writing_skill,
        "required_speaking_skill":         job.required_speaking_skill,
        "required_communication_skill":    job.required_communication_skill,
        "required_work_attitude":          job.required_work_attitude,
        "required_reliability_consistency": job.required_reliability_consistency,
        "required_emotional_intelligence": job.required_emotional_intelligence,
        "required_learning_ability":       job.required_learning_ability,
        "required_charisma":               job.required_charisma,
        "required_dress_sense":            job.required_dress_sense,
        "required_motivational_drive":     job.required_motivational_drive,
        "required_location":               job.required_location,
        "required_proximity":              job.required_proximity,
        "required_track_record":           job.required_track_record,
        "certifications_required":         job.certifications_required,
        "licenses_required":               job.licenses_required,
        "expires_at":                      job.expires_at.isoformat() if job.expires_at else None,
    }
