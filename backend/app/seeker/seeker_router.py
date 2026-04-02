from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.deps import get_seeker
from app.models import User, JobSeeker

router = APIRouter(prefix="/seeker", tags=["seeker"])


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    religion: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    marital_status: Optional[str] = None
    education: Optional[str] = None
    degree_classification: Optional[str] = None
    tech_stack: Optional[list[str]] = None
    skills: Optional[list[str]] = None
    soft_skills: Optional[list[str]] = None
    certifications: Optional[list[str]] = None
    licenses: Optional[list[str]] = None
    work_experience: Optional[list[dict]] = None
    work_mode: Optional[str] = None
    available: Optional[bool] = None


REQUIRED_FOR_COMPLETE = ["name", "city", "state", "gender", "age", "education", "skills"]


def _check_complete(seeker: JobSeeker) -> bool:
    return all(getattr(seeker, f) for f in REQUIRED_FOR_COMPLETE)


@router.get("/profile")
async def get_profile(
    user: User = Depends(get_seeker),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
    seeker = result.scalar_one_or_none()
    if not seeker:
        raise HTTPException(status_code=404, detail="Profile not found")
    return _seeker_response(seeker, user)


@router.put("/profile")
async def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_seeker),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
    seeker = result.scalar_one_or_none()
    if not seeker:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(seeker, field, value)

    seeker.profile_complete = _check_complete(seeker)
    await db.commit()
    await db.refresh(seeker)
    return _seeker_response(seeker, user)


def _seeker_response(seeker: JobSeeker, user: User) -> dict:
    return {
        "id": str(seeker.id),
        "email": user.email,
        "name": seeker.name,
        "phone": seeker.phone,
        "address": seeker.address,
        "street": seeker.street,
        "city": seeker.city,
        "state": seeker.state,
        "religion": seeker.religion,
        "gender": seeker.gender,
        "age": seeker.age,
        "marital_status": seeker.marital_status,
        "education": seeker.education,
        "degree_classification": seeker.degree_classification,
        "tech_stack": seeker.tech_stack or [],
        "skills": seeker.skills or [],
        "soft_skills": seeker.soft_skills or [],
        "certifications": seeker.certifications or [],
        "licenses": seeker.licenses or [],
        "work_experience": seeker.work_experience or [],
        "work_mode": seeker.work_mode,
        "available": seeker.available,
        "profile_complete": seeker.profile_complete,
        "free_matches_used": seeker.free_matches_used,
        "cv_url": seeker.cv_url,
        "avatar_url": seeker.avatar_url,
    }