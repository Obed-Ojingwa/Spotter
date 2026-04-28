import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Boolean, Integer, Float, DateTime, Text,
    ForeignKey, Enum as SAEnum, JSON, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


# ── Enums ──────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    SEEKER = "seeker"
    ORG = "org"
    AGENT = "agent"
    SPOTTER = "spotter"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class JobStatus(str, enum.Enum):
    ACTIVE = "active"
    CLOSED = "closed"
    EXPIRED = "expired"
    DRAFT = "draft"


class MatchStatus(str, enum.Enum):
    PENDING_SPOTTER = "pending_spotter"
    SPOTTER_APPROVED = "spotter_approved"
    SPOTTER_REJECTED = "spotter_rejected"
    REVEALED = "revealed"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentPurpose(str, enum.Enum):
    SEEKER_MATCH = "seeker_match"
    ORG_UNLOCK = "org_unlock"
    ORG_JOB_POST = "org_job_post"
    AGENT_SUBSCRIPTION = "agent_subscription"
    POINTS_PAYOUT = "points_payout"


class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    VIEWED = "viewed"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"


# ── Models ─────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    seeker_profile: Mapped[Optional["JobSeeker"]] = relationship(back_populates="user", uselist=False)
    org_profile: Mapped[Optional["Organization"]] = relationship(back_populates="user", uselist=False)
    agent_profile: Mapped[Optional["Agent"]] = relationship(back_populates="user", uselist=False)
    spotter_profile: Mapped[Optional["Spotter"]] = relationship(back_populates="user", uselist=False)


class JobSeeker(Base):
    __tablename__ = "job_seekers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    address: Mapped[Optional[str]] = mapped_column(String(500))
    street: Mapped[Optional[str]] = mapped_column(String(255))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(100))
    religion: Mapped[Optional[str]] = mapped_column(String(50))
    gender: Mapped[Optional[str]] = mapped_column(String(20))
    age: Mapped[Optional[int]] = mapped_column(Integer)
    marital_status: Mapped[Optional[str]] = mapped_column(String(30))
    education: Mapped[Optional[str]] = mapped_column(String(100))
    degree_classification: Mapped[Optional[str]] = mapped_column(String(50))
    tech_stack: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    skills: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    soft_skills: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    certifications: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    licenses: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    work_experience: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    work_mode: Mapped[Optional[str]] = mapped_column(String(30))
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    free_matches_used: Mapped[int] = mapped_column(Integer, default=0)
    profile_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    cv_url: Mapped[Optional[str]] = mapped_column(String(500))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # ── 27 extended matching attributes (all optional) ──────────────────────
    desired_job: Mapped[Optional[str]] = mapped_column(String(255))
    nysc_status: Mapped[Optional[str]] = mapped_column(String(50))    # completed / exempted / ongoing / not_applicable
    state_of_origin: Mapped[Optional[str]] = mapped_column(String(100))
    tribe: Mapped[Optional[str]] = mapped_column(String(100))
    languages_spoken: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    skin_complexion: Mapped[Optional[str]] = mapped_column(String(50))
    physical_attributes: Mapped[Optional[str]] = mapped_column(Text)
    professional_qualification: Mapped[Optional[str]] = mapped_column(String(255))
    school_attended: Mapped[Optional[str]] = mapped_column(String(255))
    course_studied: Mapped[Optional[str]] = mapped_column(String(255))
    # Skills ratings (1-5 scale stored as int, or free text)
    writing_skill: Mapped[Optional[str]] = mapped_column(String(20))
    speaking_skill: Mapped[Optional[str]] = mapped_column(String(20))
    communication_skill: Mapped[Optional[str]] = mapped_column(String(20))
    work_attitude: Mapped[Optional[str]] = mapped_column(String(20))
    reliability_consistency: Mapped[Optional[str]] = mapped_column(String(20))
    emotional_intelligence: Mapped[Optional[str]] = mapped_column(String(20))
    learning_ability: Mapped[Optional[str]] = mapped_column(String(20))
    # Personality / presentation
    charisma: Mapped[Optional[str]] = mapped_column(String(20))
    dress_sense: Mapped[Optional[str]] = mapped_column(String(20))
    motivational_drive: Mapped[Optional[str]] = mapped_column(String(20))
    # Location preferences
    location: Mapped[Optional[str]] = mapped_column(String(255))       # preferred work location
    proximity: Mapped[Optional[str]] = mapped_column(String(100))      # willing to commute / relocate
    track_record: Mapped[Optional[str]] = mapped_column(Text)          # brief track record summary

    user: Mapped["User"] = relationship(back_populates="seeker_profile")
    applications: Mapped[list["Application"]] = relationship(back_populates="seeker")
    matches: Mapped[list["Match"]] = relationship(back_populates="seeker")


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    industry: Mapped[Optional[str]] = mapped_column(String(100))
    website: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    address: Mapped[Optional[str]] = mapped_column(String(500))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(100))
    logo_url: Mapped[Optional[str]] = mapped_column(String(500))
    free_posts_left: Mapped[int] = mapped_column(Integer, default=2)
    free_matches_left: Mapped[int] = mapped_column(Integer, default=4)  # Free trial: 4 matches
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="org_profile")
    jobs: Mapped[list["Job"]] = relationship(back_populates="organization", foreign_keys="Job.org_id")


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    referrer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("agents.id"))
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    points: Mapped[float] = mapped_column(Float, default=0.0)
    plan: Mapped[str] = mapped_column(String(20), default="basic")
    referral_code: Mapped[str] = mapped_column(String(20), unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="agent_profile")
    point_entries: Mapped[list["AgentPoint"]] = relationship(back_populates="agent")
    referrals_made: Mapped[list["Referral"]] = relationship(back_populates="referrer", foreign_keys="Referral.referrer_id")


class Spotter(Base):
    __tablename__ = "spotters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    total_approved: Mapped[int] = mapped_column(Integer, default=0)
    total_rejected: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="spotter_profile")
    reviewed_matches: Mapped[list["Match"]] = relationship(back_populates="spotter")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text)
    org_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("agents.id"))
    poster_type: Mapped[str] = mapped_column(String(20))  # org | agent
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(100))
    work_mode: Mapped[Optional[str]] = mapped_column(String(30))
    employment_type: Mapped[Optional[str]] = mapped_column(String(50))
    salary_min: Mapped[Optional[float]] = mapped_column(Float)
    salary_max: Mapped[Optional[float]] = mapped_column(Float)
    # Requirements stored as JSON for flexible matching
    required_skills: Mapped[list] = mapped_column(JSON, default=list)
    required_tech_stack: Mapped[list] = mapped_column(JSON, default=list)
    required_experience_years: Mapped[Optional[int]] = mapped_column(Integer)
    required_education: Mapped[Optional[str]] = mapped_column(String(100))
    required_degree_class: Mapped[Optional[str]] = mapped_column(String(50))
    preferred_gender: Mapped[Optional[str]] = mapped_column(String(20))
    preferred_religion: Mapped[Optional[str]] = mapped_column(String(50))
    preferred_age_min: Mapped[Optional[int]] = mapped_column(Integer)
    preferred_age_max: Mapped[Optional[int]] = mapped_column(Integer)
    preferred_marital_status: Mapped[Optional[str]] = mapped_column(String(30))

    required_desired_job: Mapped[Optional[str]] = mapped_column(String(255))
    required_nysc_status: Mapped[Optional[str]] = mapped_column(String(50))
    required_state_of_origin: Mapped[Optional[str]] = mapped_column(String(100))
    required_tribe: Mapped[Optional[str]] = mapped_column(String(100))
    required_languages_spoken: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    required_skin_complexion: Mapped[Optional[str]] = mapped_column(String(50))
    required_physical_attributes: Mapped[Optional[str]] = mapped_column(Text)
    required_professional_qualification: Mapped[Optional[str]] = mapped_column(String(255))
    required_school_attended: Mapped[Optional[str]] = mapped_column(String(255))
    required_course_studied: Mapped[Optional[str]] = mapped_column(String(255))
    required_writing_skill: Mapped[Optional[str]] = mapped_column(String(20))
    required_speaking_skill: Mapped[Optional[str]] = mapped_column(String(20))
    required_communication_skill: Mapped[Optional[str]] = mapped_column(String(20))
    required_work_attitude: Mapped[Optional[str]] = mapped_column(String(20))
    required_reliability_consistency: Mapped[Optional[str]] = mapped_column(String(20))
    required_emotional_intelligence: Mapped[Optional[str]] = mapped_column(String(20))
    required_learning_ability: Mapped[Optional[str]] = mapped_column(String(20))
    required_charisma: Mapped[Optional[str]] = mapped_column(String(20))
    required_dress_sense: Mapped[Optional[str]] = mapped_column(String(20))
    required_motivational_drive: Mapped[Optional[str]] = mapped_column(String(20))
    required_location: Mapped[Optional[str]] = mapped_column(String(255))
    required_proximity: Mapped[Optional[str]] = mapped_column(String(100))
    required_track_record: Mapped[Optional[str]] = mapped_column(Text)

    certifications_required: Mapped[list] = mapped_column(JSON, default=list)
    licenses_required: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[JobStatus] = mapped_column(SAEnum(JobStatus), default=JobStatus.ACTIVE)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    organization: Mapped[Optional["Organization"]] = relationship(back_populates="jobs", foreign_keys=[org_id])
    applications: Mapped[list["Application"]] = relationship(back_populates="job")
    matches: Mapped[list["Match"]] = relationship(back_populates="job")


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"))
    seeker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_seekers.id"))
    status: Mapped[ApplicationStatus] = mapped_column(SAEnum(ApplicationStatus), default=ApplicationStatus.APPLIED)
    cover_letter: Mapped[Optional[str]] = mapped_column(Text)
    applied_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    job: Mapped["Job"] = relationship(back_populates="applications")
    seeker: Mapped["JobSeeker"] = relationship(back_populates="applications")


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"))
    seeker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_seekers.id"))
    score: Mapped[float] = mapped_column(Float)
    score_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[MatchStatus] = mapped_column(SAEnum(MatchStatus), default=MatchStatus.PENDING_SPOTTER)
    spotter_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("spotters.id"))
    spotter_notes: Mapped[Optional[str]] = mapped_column(Text)
    certificate_issued: Mapped[bool] = mapped_column(Boolean, default=False)
    triggered_by: Mapped[Optional[str]] = mapped_column(String(20))  # seeker | org | agent
    matched_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    job: Mapped["Job"] = relationship(back_populates="matches")
    seeker: Mapped["JobSeeker"] = relationship(back_populates="matches")
    spotter: Mapped[Optional["Spotter"]] = relationship(back_populates="reviewed_matches")
    certificate: Mapped[Optional["Certificate"]] = relationship(back_populates="match", uselist=False)


class AgentPoint(Base):
    __tablename__ = "agent_points"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agents.id"))
    delta: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(String(100))
    reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    agent: Mapped["Agent"] = relationship(back_populates="point_entries")


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referrer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agents.id"))
    referee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agents.id"))
    level: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    referrer: Mapped["Agent"] = relationship(back_populates="referrals_made", foreign_keys=[referrer_id])


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("matches.id"), unique=True)
    url: Mapped[str] = mapped_column(String(500))
    issued_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    match: Mapped["Match"] = relationship(back_populates="certificate")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    payer_type: Mapped[str] = mapped_column(String(20))
    purpose: Mapped[PaymentPurpose] = mapped_column(SAEnum(PaymentPurpose))
    amount: Mapped[int] = mapped_column(Integer)  # in kobo
    currency: Mapped[str] = mapped_column(String(5), default="NGN")
    provider: Mapped[str] = mapped_column(String(20), default="paystack")
    provider_ref: Mapped[Optional[str]] = mapped_column(String(255))
    reference: Mapped[str] = mapped_column(String(100), unique=True)
    status: Mapped[PaymentStatus] = mapped_column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class MatchingWeight(Base):
    __tablename__ = "matching_weights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    criterion: Mapped[str] = mapped_column(String(50), unique=True)
    weight: Mapped[float] = mapped_column(Float)
    description: Mapped[Optional[str]] = mapped_column(String(255))
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    action: Mapped[str] = mapped_column(String(100))
    resource_type: Mapped[str] = mapped_column(String(50))
    resource_id: Mapped[Optional[str]] = mapped_column(String(100))
    ip_address: Mapped[Optional[str]] = mapped_column(String(50))
    details: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# import uuid
# from datetime import datetime
# from typing import Optional
# from sqlalchemy import (
#     String, Boolean, Integer, Float, DateTime, Text,
#     ForeignKey, Enum as SAEnum, JSON, func
# )
# from sqlalchemy.dialects.postgresql import UUID
# from sqlalchemy.orm import Mapped, mapped_column, relationship
# from app.database import Base
# import enum


# # ── Enums ──────────────────────────────────────────────────────────────────

# class UserRole(str, enum.Enum):
#     SEEKER = "seeker"
#     ORG = "org"
#     AGENT = "agent"
#     SPOTTER = "spotter"
#     ADMIN = "admin"
#     SUPER_ADMIN = "super_admin"


# class JobStatus(str, enum.Enum):
#     ACTIVE = "active"
#     CLOSED = "closed"
#     EXPIRED = "expired"
#     DRAFT = "draft"


# class MatchStatus(str, enum.Enum):
#     PENDING_SPOTTER = "pending_spotter"
#     SPOTTER_APPROVED = "spotter_approved"
#     SPOTTER_REJECTED = "spotter_rejected"
#     REVEALED = "revealed"


# class PaymentStatus(str, enum.Enum):
#     PENDING = "pending"
#     SUCCESS = "success"
#     FAILED = "failed"
#     REFUNDED = "refunded"


# class PaymentPurpose(str, enum.Enum):
#     SEEKER_MATCH = "seeker_match"
#     ORG_UNLOCK = "org_unlock"
#     ORG_JOB_POST = "org_job_post"
#     AGENT_SUBSCRIPTION = "agent_subscription"
#     POINTS_PAYOUT = "points_payout"


# class ApplicationStatus(str, enum.Enum):
#     APPLIED = "applied"
#     VIEWED = "viewed"
#     SHORTLISTED = "shortlisted"
#     REJECTED = "rejected"


# # ── Models ─────────────────────────────────────────────────────────────────

# class User(Base):
#     __tablename__ = "users"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
#     password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
#     role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)
#     is_active: Mapped[bool] = mapped_column(Boolean, default=True)
#     is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
#     created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
#     updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

#     seeker_profile: Mapped[Optional["JobSeeker"]] = relationship(back_populates="user", uselist=False)
#     org_profile: Mapped[Optional["Organization"]] = relationship(back_populates="user", uselist=False)
#     agent_profile: Mapped[Optional["Agent"]] = relationship(back_populates="user", uselist=False)
#     spotter_profile: Mapped[Optional["Spotter"]] = relationship(back_populates="user", uselist=False)


# class JobSeeker(Base):
#     __tablename__ = "job_seekers"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
#     name: Mapped[str] = mapped_column(String(255))
#     phone: Mapped[Optional[str]] = mapped_column(String(20))
#     address: Mapped[Optional[str]] = mapped_column(String(500))
#     street: Mapped[Optional[str]] = mapped_column(String(255))
#     city: Mapped[Optional[str]] = mapped_column(String(100))
#     state: Mapped[Optional[str]] = mapped_column(String(100))
#     religion: Mapped[Optional[str]] = mapped_column(String(50))
#     gender: Mapped[Optional[str]] = mapped_column(String(20))
#     age: Mapped[Optional[int]] = mapped_column(Integer)
#     marital_status: Mapped[Optional[str]] = mapped_column(String(30))
#     education: Mapped[Optional[str]] = mapped_column(String(100))
#     degree_classification: Mapped[Optional[str]] = mapped_column(String(50))
#     tech_stack: Mapped[Optional[list]] = mapped_column(JSON, default=list)
#     skills: Mapped[Optional[list]] = mapped_column(JSON, default=list)
#     soft_skills: Mapped[Optional[list]] = mapped_column(JSON, default=list)
#     certifications: Mapped[Optional[list]] = mapped_column(JSON, default=list)
#     licenses: Mapped[Optional[list]] = mapped_column(JSON, default=list)
#     work_experience: Mapped[Optional[list]] = mapped_column(JSON, default=list)
#     work_mode: Mapped[Optional[str]] = mapped_column(String(30))
#     available: Mapped[bool] = mapped_column(Boolean, default=True)
#     free_matches_used: Mapped[int] = mapped_column(Integer, default=0)
#     profile_complete: Mapped[bool] = mapped_column(Boolean, default=False)
#     cv_url: Mapped[Optional[str]] = mapped_column(String(500))
#     avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
#     created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

#     user: Mapped["User"] = relationship(back_populates="seeker_profile")
#     applications: Mapped[list["Application"]] = relationship(back_populates="seeker")
#     matches: Mapped[list["Match"]] = relationship(back_populates="seeker")


# class Organization(Base):
#     __tablename__ = "organizations"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
#     name: Mapped[str] = mapped_column(String(255))
#     description: Mapped[Optional[str]] = mapped_column(Text)
#     industry: Mapped[Optional[str]] = mapped_column(String(100))
#     website: Mapped[Optional[str]] = mapped_column(String(255))
#     phone: Mapped[Optional[str]] = mapped_column(String(20))
#     address: Mapped[Optional[str]] = mapped_column(String(500))
#     city: Mapped[Optional[str]] = mapped_column(String(100))
#     state: Mapped[Optional[str]] = mapped_column(String(100))
#     logo_url: Mapped[Optional[str]] = mapped_column(String(500))
#     free_posts_left: Mapped[int] = mapped_column(Integer, default=2)
#     free_matches_left: Mapped[int] = mapped_column(Integer, default=2)
#     is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
#     created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

#     user: Mapped["User"] = relationship(back_populates="org_profile")
#     jobs: Mapped[list["Job"]] = relationship(back_populates="organization", foreign_keys="Job.org_id")


# class Agent(Base):
#     __tablename__ = "agents"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
#     referrer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("agents.id"))
#     name: Mapped[str] = mapped_column(String(255))
#     phone: Mapped[Optional[str]] = mapped_column(String(20))
#     points: Mapped[float] = mapped_column(Float, default=0.0)
#     plan: Mapped[str] = mapped_column(String(20), default="basic")
#     referral_code: Mapped[str] = mapped_column(String(20), unique=True)
#     is_active: Mapped[bool] = mapped_column(Boolean, default=True)
#     created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

#     user: Mapped["User"] = relationship(back_populates="agent_profile")
#     point_entries: Mapped[list["AgentPoint"]] = relationship(back_populates="agent")
#     referrals_made: Mapped[list["Referral"]] = relationship(back_populates="referrer", foreign_keys="Referral.referrer_id")


# class Spotter(Base):
#     __tablename__ = "spotters"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
#     name: Mapped[str] = mapped_column(String(255))
#     total_approved: Mapped[int] = mapped_column(Integer, default=0)
#     total_rejected: Mapped[int] = mapped_column(Integer, default=0)
#     created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

#     user: Mapped["User"] = relationship(back_populates="spotter_profile")
#     reviewed_matches: Mapped[list["Match"]] = relationship(back_populates="spotter")


# class Job(Base):
#     __tablename__ = "jobs"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     title: Mapped[str] = mapped_column(String(255), nullable=False)
#     description: Mapped[str] = mapped_column(Text)
#     org_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
#     agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("agents.id"))
#     poster_type: Mapped[str] = mapped_column(String(20))  # org | agent
#     city: Mapped[Optional[str]] = mapped_column(String(100))
#     state: Mapped[Optional[str]] = mapped_column(String(100))
#     work_mode: Mapped[Optional[str]] = mapped_column(String(30))
#     employment_type: Mapped[Optional[str]] = mapped_column(String(50))
#     salary_min: Mapped[Optional[float]] = mapped_column(Float)
#     salary_max: Mapped[Optional[float]] = mapped_column(Float)
#     # Requirements stored as JSON for flexible matching
#     required_skills: Mapped[list] = mapped_column(JSON, default=list)
#     required_tech_stack: Mapped[list] = mapped_column(JSON, default=list)
#     required_experience_years: Mapped[Optional[int]] = mapped_column(Integer)
#     required_education: Mapped[Optional[str]] = mapped_column(String(100))
#     required_degree_class: Mapped[Optional[str]] = mapped_column(String(50))
#     preferred_gender: Mapped[Optional[str]] = mapped_column(String(20))
#     preferred_religion: Mapped[Optional[str]] = mapped_column(String(50))
#     preferred_age_min: Mapped[Optional[int]] = mapped_column(Integer)
#     preferred_age_max: Mapped[Optional[int]] = mapped_column(Integer)
#     preferred_marital_status: Mapped[Optional[str]] = mapped_column(String(30))
#     certifications_required: Mapped[list] = mapped_column(JSON, default=list)
#     licenses_required: Mapped[list] = mapped_column(JSON, default=list)
#     status: Mapped[JobStatus] = mapped_column(SAEnum(JobStatus), default=JobStatus.ACTIVE)
#     expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
#     created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

#     organization: Mapped[Optional["Organization"]] = relationship(back_populates="jobs", foreign_keys=[org_id])
#     applications: Mapped[list["Application"]] = relationship(back_populates="job")
#     matches: Mapped[list["Match"]] = relationship(back_populates="job")


# class Application(Base):
#     __tablename__ = "applications"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"))
#     seeker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_seekers.id"))
#     status: Mapped[ApplicationStatus] = mapped_column(SAEnum(ApplicationStatus), default=ApplicationStatus.APPLIED)
#     cover_letter: Mapped[Optional[str]] = mapped_column(Text)
#     applied_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

#     job: Mapped["Job"] = relationship(back_populates="applications")
#     seeker: Mapped["JobSeeker"] = relationship(back_populates="applications")


# class Match(Base):
#     __tablename__ = "matches"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"))
#     seeker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_seekers.id"))
#     score: Mapped[float] = mapped_column(Float)
#     score_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
#     status: Mapped[MatchStatus] = mapped_column(SAEnum(MatchStatus), default=MatchStatus.PENDING_SPOTTER)
#     spotter_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("spotters.id"))
#     spotter_notes: Mapped[Optional[str]] = mapped_column(Text)
#     certificate_issued: Mapped[bool] = mapped_column(Boolean, default=False)
#     triggered_by: Mapped[Optional[str]] = mapped_column(String(20))  # seeker | org | agent
#     matched_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
#     approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

#     job: Mapped["Job"] = relationship(back_populates="matches")
#     seeker: Mapped["JobSeeker"] = relationship(back_populates="matches")
#     spotter: Mapped[Optional["Spotter"]] = relationship(back_populates="reviewed_matches")
#     certificate: Mapped[Optional["Certificate"]] = relationship(back_populates="match", uselist=False)


# class AgentPoint(Base):
#     __tablename__ = "agent_points"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     agent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agents.id"))
#     delta: Mapped[float] = mapped_column(Float)
#     reason: Mapped[str] = mapped_column(String(100))
#     reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
#     created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

#     agent: Mapped["Agent"] = relationship(back_populates="point_entries")


# class Referral(Base):
#     __tablename__ = "referrals"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     referrer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agents.id"))
#     referee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agents.id"))
#     level: Mapped[int] = mapped_column(Integer)
#     created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

#     referrer: Mapped["Agent"] = relationship(back_populates="referrals_made", foreign_keys=[referrer_id])


# class Certificate(Base):
#     __tablename__ = "certificates"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     match_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("matches.id"), unique=True)
#     url: Mapped[str] = mapped_column(String(500))
#     issued_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

#     match: Mapped["Match"] = relationship(back_populates="certificate")


# class Payment(Base):
#     __tablename__ = "payments"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     payer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
#     payer_type: Mapped[str] = mapped_column(String(20))
#     purpose: Mapped[PaymentPurpose] = mapped_column(SAEnum(PaymentPurpose))
#     amount: Mapped[int] = mapped_column(Integer)  # in kobo
#     currency: Mapped[str] = mapped_column(String(5), default="NGN")
#     provider: Mapped[str] = mapped_column(String(20), default="paystack")
#     provider_ref: Mapped[Optional[str]] = mapped_column(String(255))
#     reference: Mapped[str] = mapped_column(String(100), unique=True)
#     status: Mapped[PaymentStatus] = mapped_column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
#     extra_data: Mapped[Optional[dict]] = mapped_column(JSON)
#     paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
#     created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# class MatchingWeight(Base):
#     __tablename__ = "matching_weights"

#     id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
#     criterion: Mapped[str] = mapped_column(String(50), unique=True)
#     weight: Mapped[float] = mapped_column(Float)
#     description: Mapped[Optional[str]] = mapped_column(String(255))
#     updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


# class AuditLog(Base):
#     __tablename__ = "audit_logs"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
#     action: Mapped[str] = mapped_column(String(100))
#     resource_type: Mapped[str] = mapped_column(String(50))
#     resource_id: Mapped[Optional[str]] = mapped_column(String(100))
#     ip_address: Mapped[Optional[str]] = mapped_column(String(50))
#     details: Mapped[Optional[dict]] = mapped_column(JSON)
#     created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
