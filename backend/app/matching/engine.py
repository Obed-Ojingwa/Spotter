# C:\Users\Melody\Desktop\spotter_dashboards\spotter\backend\app\matching\engine.py
"""
SPOTTER Matching Engine
-----------------------
Compares a JobSeeker profile against a Job's requirements
and returns a weighted score from 0–100.

Each criterion scorer returns a float 0.0–1.0.
The weighted average × 100 = final match percentage.

Skills/tech use a recall-heavy blend (so meeting all stated requirements scores
high); certifications and licenses fold into the skills criterion when set on the job. Remote and hybrid jobs
adjust location scoring; education averages only dimensions the job specifies.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from app.models import JobSeeker, Job


# ── Default weights (overridden by DB values in production) ───────────────

DEFAULT_WEIGHTS: dict[str, float] = {
    "skills":          30.0,
    "tech_stack":      20.0,
    "experience":      15.0,
    "location":        12.0,
    "education":        8.0,
    "work_mode":        5.0,
    "availability":     5.0,
    "demographics":     5.0,
}


@dataclass
class MatchResult:
    score: float                        # 0–100
    breakdown: dict[str, float] = field(default_factory=dict)
    is_premium: bool = False            # True when score >= 90
    # is_silver: bool = False              # Reserved for future use (e.g. 80–89.9)
    # is_bronze: bool = False              # Reserved for future use (e.g. 70–79.9)


# ── Criterion scorers ─────────────────────────────────────────────────────

def _normalise_list(items: list | None) -> set[str]:
    """Lowercase and strip all items in a list for comparison."""
    if not items:
        return set()
    return {str(i).lower().strip() for i in items if i}


def _recall_jaccard_blend(required: set[str], seeker_has: set[str]) -> float:
    """
    Blend recall (coverage of requirements) with Jaccard so candidates who
    match all required items score high, while pure Jaccard alone over-penalises
    seekers with extra skills.
    """
    if not required:
        return 1.0
    intersection = required & seeker_has
    recall = len(intersection) / len(required)
    union = required | seeker_has
    jaccard = len(intersection) / len(union) if union else 0.0
    return 0.65 * recall + 0.35 * jaccard


def score_skills(seeker: JobSeeker, job: Job) -> float:
    """
    Skills + soft skills vs required skills (recall-weighted blend).
    Also scores certifications_required / licenses_required against seeker lists when the job specifies them (same criterion weight as skills).
    """
    seeker_skills = _normalise_list(seeker.skills) | _normalise_list(seeker.soft_skills)
    required = _normalise_list(job.required_skills)
    cert_req = _normalise_list(job.certifications_required)
    lic_req = _normalise_list(job.licenses_required)

    parts: list[float] = []

    if required:
        parts.append(_recall_jaccard_blend(required, seeker_skills))

    seeker_creds = _normalise_list(seeker.certifications)
    if cert_req:
        parts.append(_recall_jaccard_blend(cert_req, seeker_creds))

    seeker_lic = _normalise_list(seeker.licenses)
    if lic_req:
        parts.append(_recall_jaccard_blend(lic_req, seeker_lic))

    if not parts:
        return 1.0
    return sum(parts) / len(parts)


def score_tech_stack(seeker: JobSeeker, job: Job) -> float:
    """
    Tech stack vs job requirements. Seeker skills often list tools here too,
    so we union tech_stack with skills for matching.
    """
    required = _normalise_list(job.required_tech_stack)
    if not required:
        return 1.0
    seeker_stack = _normalise_list(seeker.tech_stack) | _normalise_list(seeker.skills)
    return _recall_jaccard_blend(required, seeker_stack)


def score_experience(seeker: JobSeeker, job: Job) -> float:
    """
    Compare years of experience.
    If seeker meets or exceeds requirement → 1.0
    If less → proportional score (e.g. 2 of 4 required = 0.5)
    """
    if not job.required_experience_years:
        return 1.0

    # Calculate total years from seeker's work_experience list
    total_years = 0.0
    if seeker.work_experience:
        for exp in seeker.work_experience:
            if isinstance(exp, dict):
                total_years += float(exp.get("years", 0) or 0)

    required = float(job.required_experience_years)
    if total_years >= required:
        return 1.0
    ratio = total_years / required
    # Some profiles list roles without per-role "years"; don't treat as zero signal.
    if ratio == 0.0 and seeker.work_experience and isinstance(seeker.work_experience, list):
        if any(isinstance(x, dict) and x for x in seeker.work_experience):
            return min(0.55, 0.35 + 0.05 * len(seeker.work_experience))

    return ratio


def score_location(seeker: JobSeeker, job: Job) -> float:
    """
    Tiered location matching:
    City match   → 0.85
    State match  → 0.6
    No match     → 0.0

    Remote roles: no geography penalty. Unspecified job location: neutral.
    """
    wm = (job.work_mode or "").lower().strip()
    if wm == "remote":
        return 1.0

    if not job.city and not job.state:
        return 1.0

    seeker_city = (seeker.city or "").lower().strip()
    seeker_state = (seeker.state or "").lower().strip()
    job_city = (job.city or "").lower().strip()
    job_state = (job.state or "").lower().strip()

    tier = 0.0
    if seeker_city and job_city and seeker_city == job_city:
        tier = 0.85
    elif seeker_state and job_state and seeker_state == job_state:
        tier = 0.6    # Hybrid roles tolerate more geographic spread than fully onsite.
    if wm == "hybrid":
        if tier > 0:
            return min(1.0, tier + 0.1)
        return 0.5

    return tier


def _education_rank_key(label: str) -> str:
    """Normalise free-text education labels from forms / profiles."""
    s = label.lower().strip()
    aliases = {
        "b.sc": "bsc",
        "bachelor": "bsc",
        "bachelors": "bsc",
        "bs": "bsc",
        "ba": "bsc",
        "beng": "bsc",
        "msc": "masters",
        "m.sc": "masters",
        "m.s": "masters",
        "ms": "masters",
        "mba": "masters",
        "ma": "masters",
        "ph.d": "phd",
        "doctorate": "phd",
        "dphil": "phd",
    }
    return aliases.get(s, s)


def _exact_match(job_value: Optional[str], seeker_value: Optional[str]) -> float:
    if not job_value:
        return 1.0
    if not seeker_value:
        return 0.0
    return 1.0 if seeker_value.strip().lower() == job_value.strip().lower() else 0.0


def _contains_match(job_value: Optional[str], seeker_value: Optional[str]) -> float:
    if not job_value:
        return 1.0
    if not seeker_value:
        return 0.0
    seeker_text = seeker_value.strip().lower()
    return 1.0 if job_value.strip().lower() in seeker_text else 0.0


def score_education(seeker: JobSeeker, job: Job) -> float:
    """
    Education level and degree classification — only criteria the job specifies
    are averaged (unspecified dimensions are not treated as automatic full marks).
    """
    EDUCATION_RANK = {
        "phd": 5, "masters": 4, "pgd": 3,
        "bsc": 2, "hnd": 2, "ond": 1, "ssce": 0,
    }
    DEGREE_CLASS_RANK = {
        "first class": 4, "second class upper": 3,
        "second class lower": 2, "third class": 1, "pass": 0,
        "2:1": 3, "2:2": 2, "2.1": 3, "2.2": 2,
    }

    parts: list[float] = []

    if job.required_education:
        req_key = _education_rank_key(job.required_education)
        seek_key = _education_rank_key(seeker.education or "")
        required_rank = EDUCATION_RANK.get(req_key, 0)
        seeker_rank = EDUCATION_RANK.get(seek_key, 0)
        parts.append(
            1.0 if seeker_rank >= required_rank else seeker_rank / max(required_rank, 1)
        )

    if job.required_degree_class:
        required_rank = DEGREE_CLASS_RANK.get(job.required_degree_class.lower(), 0)
        seeker_rank = DEGREE_CLASS_RANK.get((seeker.degree_classification or "").lower(), 0)
        parts.append(
            1.0 if seeker_rank >= required_rank else seeker_rank / max(required_rank, 1)
        )

    if not parts:
        return 1.0
    return sum(parts) / len(parts)


def score_work_mode(seeker: JobSeeker, job: Job) -> float:
    """Exact match or 'hybrid' compatibility."""
    if not job.work_mode:
        return 1.0
    if not seeker.work_mode:
        return 0.5  # partial — unknown preference

    j = job.work_mode.lower()
    s = seeker.work_mode.lower()

    if s == j:
        return 1.0
    if s == "hybrid" or j == "hybrid":
        return 0.7  # hybrid is partially compatible with either
    return 0.0


def score_availability(seeker: JobSeeker, job: Job) -> float:
    return 1.0 if seeker.available else 0.0


def score_demographics(seeker: JobSeeker, job: Job) -> float:
    """
    Optional demographic and extended matching requirements.
    Only scored when job specifies them. Average across all specified criteria.
    """
    checks: list[float] = []

    if job.preferred_gender:
        checks.append(_exact_match(job.preferred_gender, seeker.gender))
    if job.preferred_religion:
        checks.append(_exact_match(job.preferred_religion, seeker.religion))
    if job.preferred_marital_status:
        checks.append(_exact_match(job.preferred_marital_status, seeker.marital_status))
    if job.preferred_age_min or job.preferred_age_max:
        if seeker.age is not None:
            min_age = job.preferred_age_min or 0
            max_age = job.preferred_age_max or 999
            checks.append(1.0 if min_age <= seeker.age <= max_age else 0.0)

    if job.required_desired_job:
        checks.append(_contains_match(job.required_desired_job, seeker.desired_job))
    if job.required_nysc_status:
        checks.append(_exact_match(job.required_nysc_status, seeker.nysc_status))
    if job.required_state_of_origin:
        checks.append(_exact_match(job.required_state_of_origin, seeker.state_of_origin))
    if job.required_tribe:
        checks.append(_exact_match(job.required_tribe, seeker.tribe))
    if job.required_languages_spoken:
        checks.append(_recall_jaccard_blend(
            _normalise_list(job.required_languages_spoken),
            _normalise_list(seeker.languages_spoken)
        ))
    if job.required_skin_complexion:
        checks.append(_exact_match(job.required_skin_complexion, seeker.skin_complexion))
    if job.required_physical_attributes:
        checks.append(_contains_match(job.required_physical_attributes, seeker.physical_attributes))
    if job.required_professional_qualification:
        checks.append(_exact_match(job.required_professional_qualification, seeker.professional_qualification))
    if job.required_school_attended:
        checks.append(_contains_match(job.required_school_attended, seeker.school_attended))
    if job.required_course_studied:
        checks.append(_contains_match(job.required_course_studied, seeker.course_studied))
    if job.required_writing_skill:
        checks.append(_exact_match(job.required_writing_skill, seeker.writing_skill))
    if job.required_speaking_skill:
        checks.append(_exact_match(job.required_speaking_skill, seeker.speaking_skill))
    if job.required_communication_skill:
        checks.append(_exact_match(job.required_communication_skill, seeker.communication_skill))
    if job.required_work_attitude:
        checks.append(_exact_match(job.required_work_attitude, seeker.work_attitude))
    if job.required_reliability_consistency:
        checks.append(_exact_match(job.required_reliability_consistency, seeker.reliability_consistency))
    if job.required_emotional_intelligence:
        checks.append(_exact_match(job.required_emotional_intelligence, seeker.emotional_intelligence))
    if job.required_learning_ability:
        checks.append(_exact_match(job.required_learning_ability, seeker.learning_ability))
    if job.required_charisma:
        checks.append(_exact_match(job.required_charisma, seeker.charisma))
    if job.required_dress_sense:
        checks.append(_exact_match(job.required_dress_sense, seeker.dress_sense))
    if job.required_motivational_drive:
        checks.append(_exact_match(job.required_motivational_drive, seeker.motivational_drive))
    if job.required_location:
        checks.append(_contains_match(job.required_location, seeker.location))
    if job.required_proximity:
        checks.append(_exact_match(job.required_proximity, seeker.proximity))
    if job.required_track_record:
        checks.append(_contains_match(job.required_track_record, seeker.track_record))

    return sum(checks) / len(checks) if checks else 1.0


# ── Main engine ───────────────────────────────────────────────────────────

SCORERS = {
    "skills":       score_skills,
    "tech_stack":   score_tech_stack,
    "experience":   score_experience,
    "location":     score_location,
    "education":    score_education,
    "work_mode":    score_work_mode,
    "availability": score_availability,
    "demographics": score_demographics,
}


def run_match(
    seeker: JobSeeker,
    job: Job,
    weights: Optional[dict[str, float]] = None,
) -> MatchResult:
    """
    Run all scorers and return a MatchResult with score and breakdown.

    Args:
        seeker:  JobSeeker ORM instance (with all profile fields loaded)
        job:     Job ORM instance (with all requirement fields loaded)
        weights: Optional dict overriding DEFAULT_WEIGHTS (e.g. from DB)

    Returns:
        MatchResult with score 0–100 and per-criterion breakdown
    """
    active_weights = {**DEFAULT_WEIGHTS, **(weights or {})}

    total_weight = 0.0
    weighted_sum = 0.0
    breakdown: dict[str, float] = {}

    for criterion, scorer in SCORERS.items():
        w = active_weights.get(criterion, 0.0)
        if w == 0:
            continue
        raw_score = scorer(seeker, job)
        breakdown[criterion] = round(raw_score * 100, 1)
        weighted_sum += raw_score * w
        total_weight += w

    final_score = (weighted_sum / total_weight * 100) if total_weight > 0 else 0.0
    final_score = round(min(max(final_score, 0), 100), 2)

    return MatchResult(
        score=final_score,
        breakdown=breakdown,
        is_premium=final_score >= 90.0,
    )
