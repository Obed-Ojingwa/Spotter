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
    # ── Existing fields (unchanged) ────────────────────────────────────────
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

    # ── 27 extended matching attributes (all optional) ─────────────────────
    desired_job: Optional[str] = None
    nysc_status: Optional[str] = None
    state_of_origin: Optional[str] = None
    tribe: Optional[str] = None
    languages_spoken: Optional[list[str]] = None
    skin_complexion: Optional[str] = None
    physical_attributes: Optional[str] = None
    professional_qualification: Optional[str] = None
    school_attended: Optional[str] = None
    course_studied: Optional[str] = None
    writing_skill: Optional[str] = None
    speaking_skill: Optional[str] = None
    communication_skill: Optional[str] = None
    work_attitude: Optional[str] = None
    reliability_consistency: Optional[str] = None
    emotional_intelligence: Optional[str] = None
    learning_ability: Optional[str] = None
    charisma: Optional[str] = None
    dress_sense: Optional[str] = None
    motivational_drive: Optional[str] = None
    location: Optional[str] = None
    proximity: Optional[str] = None
    track_record: Optional[str] = None


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
        # Extended matching attributes
        "desired_job": seeker.desired_job,
        "nysc_status": seeker.nysc_status,
        "state_of_origin": seeker.state_of_origin,
        "tribe": seeker.tribe,
        "languages_spoken": seeker.languages_spoken or [],
        "skin_complexion": seeker.skin_complexion,
        "physical_attributes": seeker.physical_attributes,
        "professional_qualification": seeker.professional_qualification,
        "school_attended": seeker.school_attended,
        "course_studied": seeker.course_studied,
        "writing_skill": seeker.writing_skill,
        "speaking_skill": seeker.speaking_skill,
        "communication_skill": seeker.communication_skill,
        "work_attitude": seeker.work_attitude,
        "reliability_consistency": seeker.reliability_consistency,
        "emotional_intelligence": seeker.emotional_intelligence,
        "learning_ability": seeker.learning_ability,
        "charisma": seeker.charisma,
        "dress_sense": seeker.dress_sense,
        "motivational_drive": seeker.motivational_drive,
        "location": seeker.location,
        "proximity": seeker.proximity,
        "track_record": seeker.track_record,
    }


# ── CV / Avatar upload ────────────────────────────────────────────────────

import os
import uuid as uuid_lib
from fastapi import UploadFile, File

ALLOWED_CV_TYPES = {"application/pdf", "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALLOWED_IMG_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_CV_MB   = 5
MAX_IMG_MB  = 2


@router.post("/upload-cv")
async def upload_cv(
    file: UploadFile = File(...),
    user: User = Depends(get_seeker),
    db: AsyncSession = Depends(get_db),
):
    """Upload a CV (PDF or Word). Max 5 MB."""
    from app.config import settings

    if file.content_type not in ALLOWED_CV_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF and Word documents are accepted.")

    contents = await file.read()
    if len(contents) > MAX_CV_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_CV_MB} MB.")

    # Save to local uploads directory
    ext = os.path.splitext(file.filename or "cv.pdf")[1] or ".pdf"
    filename = f"cv_{user.id}{ext}"
    filepath = os.path.join(settings.LOCAL_STORAGE_PATH, filename)

    os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(contents)

    url = f"/uploads/{filename}"

    # Update seeker profile
    result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
    seeker = result.scalar_one_or_none()
    if seeker:
        seeker.cv_url = url
        await db.commit()

    return {"cv_url": url, "filename": file.filename, "size_kb": len(contents) // 1024}


@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_seeker),
    db: AsyncSession = Depends(get_db),
):
    """Upload a profile photo. Max 2 MB."""
    from app.config import settings

    if file.content_type not in ALLOWED_IMG_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WebP images are accepted.")

    contents = await file.read()
    if len(contents) > MAX_IMG_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_IMG_MB} MB.")

    ext = os.path.splitext(file.filename or "avatar.jpg")[1] or ".jpg"
    filename = f"avatar_{user.id}{ext}"
    filepath = os.path.join(settings.LOCAL_STORAGE_PATH, filename)

    os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(contents)

    url = f"/uploads/{filename}"

    result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
    seeker = result.scalar_one_or_none()
    if seeker:
        seeker.avatar_url = url
        await db.commit()

    return {"avatar_url": url, "filename": file.filename}



# from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy import select
# from pydantic import BaseModel
# from typing import Optional
# from app.database import get_db
# from app.deps import get_seeker
# from app.models import User, JobSeeker
# import os
# import uuid as uuid_lib
# from fastapi import UploadFile, File


# router = APIRouter(prefix="/seeker", tags=["seeker"])


# ALLOWED_CV_TYPES = {"application/pdf", "application/msword",
#                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
# ALLOWED_IMG_TYPES = {"image/jpeg", "image/png", "image/webp"}
# MAX_CV_MB   = 5
# MAX_IMG_MB  = 2


# @router.post("/upload-cv")
# async def upload_cv(
#     file: UploadFile = File(...),
#     user: User = Depends(get_seeker),
#     db: AsyncSession = Depends(get_db),
# ):
#     """Upload a CV (PDF or Word). Max 5 MB."""
#     from app.config import settings

#     if file.content_type not in ALLOWED_CV_TYPES:
#         raise HTTPException(status_code=400, detail="Only PDF and Word documents are accepted.")

#     contents = await file.read()
#     if len(contents) > MAX_CV_MB * 1024 * 1024:
#         raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_CV_MB} MB.")

#     # Save to local uploads directory
#     ext = os.path.splitext(file.filename or "cv.pdf")[1] or ".pdf"
#     filename = f"cv_{user.id}{ext}"
#     filepath = os.path.join(settings.LOCAL_STORAGE_PATH, filename)

#     os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
#     with open(filepath, "wb") as f:
#         f.write(contents)

#     url = f"/uploads/{filename}"

#     # Update seeker profile
#     result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
#     seeker = result.scalar_one_or_none()
#     if seeker:
#         seeker.cv_url = url
#         await db.commit()

#     return {"cv_url": url, "filename": file.filename, "size_kb": len(contents) // 1024}


# @router.post("/upload-avatar")
# async def upload_avatar(
#     file: UploadFile = File(...),
#     user: User = Depends(get_seeker),
#     db: AsyncSession = Depends(get_db),
# ):
#     """Upload a profile photo. Max 2 MB."""
#     from app.config import settings

#     if file.content_type not in ALLOWED_IMG_TYPES:
#         raise HTTPException(status_code=400, detail="Only JPG, PNG, and WebP images are accepted.")

#     contents = await file.read()
#     if len(contents) > MAX_IMG_MB * 1024 * 1024:
#         raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_IMG_MB} MB.")

#     ext = os.path.splitext(file.filename or "avatar.jpg")[1] or ".jpg"
#     filename = f"avatar_{user.id}{ext}"
#     filepath = os.path.join(settings.LOCAL_STORAGE_PATH, filename)

#     os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
#     with open(filepath, "wb") as f:
#         f.write(contents)

#     url = f"/uploads/{filename}"

#     result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
#     seeker = result.scalar_one_or_none()
#     if seeker:
#         seeker.avatar_url = url
#         await db.commit()

#     return {"avatar_url": url, "filename": file.filename}


# class ProfileUpdate(BaseModel):
#     name: Optional[str] = None
#     phone: Optional[str] = None
#     address: Optional[str] = None
#     street: Optional[str] = None
#     city: Optional[str] = None
#     state: Optional[str] = None
#     religion: Optional[str] = None
#     gender: Optional[str] = None
#     age: Optional[int] = None
#     marital_status: Optional[str] = None
#     education: Optional[str] = None
#     degree_classification: Optional[str] = None
#     tech_stack: Optional[list[str]] = None
#     skills: Optional[list[str]] = None
#     soft_skills: Optional[list[str]] = None
#     certifications: Optional[list[str]] = None
#     licenses: Optional[list[str]] = None
#     work_experience: Optional[list[dict]] = None
#     work_mode: Optional[str] = None
#     available: Optional[bool] = None


# REQUIRED_FOR_COMPLETE = ["name", "city", "state", "gender", "age", "education", "skills"]


# def _check_complete(seeker: JobSeeker) -> bool:
#     return all(getattr(seeker, f) for f in REQUIRED_FOR_COMPLETE)


# @router.get("/profile")
# async def get_profile(
#     user: User = Depends(get_seeker),
#     db: AsyncSession = Depends(get_db),
# ):
#     result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
#     seeker = result.scalar_one_or_none()
#     if not seeker:
#         raise HTTPException(status_code=404, detail="Profile not found")
#     return _seeker_response(seeker, user)


# @router.put("/profile")
# async def update_profile(
#     body: ProfileUpdate,
#     user: User = Depends(get_seeker),
#     db: AsyncSession = Depends(get_db),
# ):
#     result = await db.execute(select(JobSeeker).where(JobSeeker.user_id == user.id))
#     seeker = result.scalar_one_or_none()
#     if not seeker:
#         raise HTTPException(status_code=404, detail="Profile not found")

#     for field, value in body.model_dump(exclude_none=True).items():
#         setattr(seeker, field, value)

#     seeker.profile_complete = _check_complete(seeker)
#     await db.commit()
#     await db.refresh(seeker)
#     return _seeker_response(seeker, user)


# def _seeker_response(seeker: JobSeeker, user: User) -> dict:
#     return {
#         "id": str(seeker.id),
#         "email": user.email,
#         "name": seeker.name,
#         "phone": seeker.phone,
#         "address": seeker.address,
#         "street": seeker.street,
#         "city": seeker.city,
#         "state": seeker.state,
#         "religion": seeker.religion,
#         "gender": seeker.gender,
#         "age": seeker.age,
#         "marital_status": seeker.marital_status,
#         "education": seeker.education,
#         "degree_classification": seeker.degree_classification,
#         "tech_stack": seeker.tech_stack or [],
#         "skills": seeker.skills or [],
#         "soft_skills": seeker.soft_skills or [],
#         "certifications": seeker.certifications or [],
#         "licenses": seeker.licenses or [],
#         "work_experience": seeker.work_experience or [],
#         "work_mode": seeker.work_mode,
#         "available": seeker.available,
#         "profile_complete": seeker.profile_complete,
#         "free_matches_used": seeker.free_matches_used,
#         "cv_url": seeker.cv_url,
#         "avatar_url": seeker.avatar_url,
#     }
