"""
SPOTTER Matching Engine
-----------------------
Compares a JobSeeker profile against a Job's requirements
and returns a weighted score from 0–100.

Each criterion scorer returns a float 0.0–1.0.
The weighted average × 100 = final match percentage.
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


# ── Criterion scorers ─────────────────────────────────────────────────────

def _normalise_list(items: list | None) -> set[str]:
    """Lowercase and strip all items in a list for comparison."""
    if not items:
        return set()
    return {str(i).lower().strip() for i in items if i}


def score_skills(seeker: JobSeeker, job: Job) -> float:
    """Jaccard similarity between seeker skills and required skills."""
    required = _normalise_list(job.required_skills)
    if not required:
        return 1.0  # job has no skill requirement → full score
    seeker_skills = _normalise_list(seeker.skills) | _normalise_list(seeker.soft_skills)
    intersection = required & seeker_skills
    union = required | seeker_skills
    return len(intersection) / len(union) if union else 0.0


def score_tech_stack(seeker: JobSeeker, job: Job) -> float:
    """Jaccard similarity for tech stack."""
    required = _normalise_list(job.required_tech_stack)
    if not required:
        return 1.0
    seeker_stack = _normalise_list(seeker.tech_stack)
    intersection = required & seeker_stack
    union = required | seeker_stack
    return len(intersection) / len(union) if union else 0.0


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
    return total_years / required


def score_location(seeker: JobSeeker, job: Job) -> float:
    """
    Tiered location matching:
    Street match → 1.0
    City match   → 0.85
    State match  → 0.6
    No match     → 0.0
    """
    if not job.city and not job.state:
        return 1.0  # remote/no location preference

    seeker_city = (seeker.city or "").lower().strip()
    seeker_state = (seeker.state or "").lower().strip()
    job_city = (job.city or "").lower().strip()
    job_state = (job.state or "").lower().strip()

    if seeker_city and job_city and seeker_city == job_city:
        return 0.85
    if seeker_state and job_state and seeker_state == job_state:
        return 0.6
    return 0.0


def score_education(seeker: JobSeeker, job: Job) -> float:
    """
    Education level + degree classification.
    Returns average of two sub-scores.
    """
    EDUCATION_RANK = {
        "phd": 5, "masters": 4, "pgd": 3,
        "bsc": 2, "hnd": 2, "ond": 1, "ssce": 0,
    }
    DEGREE_CLASS_RANK = {
        "first class": 4, "second class upper": 3,
        "second class lower": 2, "third class": 1, "pass": 0,
    }

    edu_score = 1.0
    if job.required_education:
        required_rank = EDUCATION_RANK.get(job.required_education.lower(), 0)
        seeker_rank = EDUCATION_RANK.get((seeker.education or "").lower(), 0)
        edu_score = 1.0 if seeker_rank >= required_rank else seeker_rank / max(required_rank, 1)

    class_score = 1.0
    if job.required_degree_class:
        required_rank = DEGREE_CLASS_RANK.get(job.required_degree_class.lower(), 0)
        seeker_rank = DEGREE_CLASS_RANK.get((seeker.degree_classification or "").lower(), 0)
        class_score = 1.0 if seeker_rank >= required_rank else seeker_rank / max(required_rank, 1)

    return (edu_score + class_score) / 2


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
    Optional demographic requirements. Only scored when job specifies them.
    Average across all specified demographic criteria.
    """
    checks: list[float] = []

    if job.preferred_gender:
        checks.append(
            1.0 if (seeker.gender or "").lower() == job.preferred_gender.lower() else 0.0
        )
    if job.preferred_religion:
        checks.append(
            1.0 if (seeker.religion or "").lower() == job.preferred_religion.lower() else 0.0
        )
    if job.preferred_marital_status:
        checks.append(
            1.0 if (seeker.marital_status or "").lower() == job.preferred_marital_status.lower() else 0.0
        )
    if job.preferred_age_min or job.preferred_age_max:
        age = seeker.age or 0
        min_age = job.preferred_age_min or 0
        max_age = job.preferred_age_max or 999
        checks.append(1.0 if min_age <= age <= max_age else 0.0)

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