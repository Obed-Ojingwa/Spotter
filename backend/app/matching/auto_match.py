"""
Auto-matching utility for when jobs are posted.
Generates matches between new jobs and existing seekers.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import JobSeeker, Job, Match, MatchStatus
from app.matching.engine import run_match


async def generate_auto_matches_for_job(
    job: Job,
    db: AsyncSession,
    limit: int = 10,
    min_score: float = 50.0,
) -> int:
    """
    Auto-generate matches for a newly posted job.
    
    Args:
        job: The newly posted Job
        db: Async database session
        limit: Maximum number of matches to generate
        min_score: Minimum match score (0-100) to create match
    
    Returns:
        Number of matches created
    """
    if not job.org_id:
        return 0
    
    # Get org to check free_matches_left
    from app.models import Organization
    org_result = await db.execute(
        select(Organization).where(Organization.id == job.org_id)
    )
    org = org_result.scalar_one_or_none()
    if not org or org.free_matches_left <= 0:
        return 0
    
    # Get all seekers
    seeker_result = await db.execute(select(JobSeeker))
    seekers = seeker_result.scalars().all()
    
    if not seekers:
        return 0
    
    # Score each seeker against the job
    matches_to_create: list[tuple[JobSeeker, float]] = []
    for seeker in seekers:
        match_result = run_match(seeker, job)
        if match_result.score >= min_score:
            matches_to_create.append((seeker, match_result.score, match_result.breakdown))
    
    # Sort by score descending
    matches_to_create.sort(key=lambda x: x[1], reverse=True)
    
    # Limit to org's free matches remaining
    limit = min(limit, org.free_matches_left)
    matches_to_create = matches_to_create[:limit]
    
    # Create match records
    created_count = 0
    for seeker, score, breakdown in matches_to_create:
        # Check if match already exists
        existing = await db.execute(
            select(Match).where(
                Match.job_id == job.id,
                Match.seeker_id == seeker.id,
            )
        )
        if existing.scalar_one_or_none():
            continue
        
        match = Match(
            job_id=job.id,
            seeker_id=seeker.id,
            score=score,
            score_breakdown=breakdown,
            status=MatchStatus.PENDING_SPOTTER,
            triggered_by="org",
        )
        db.add(match)
        created_count += 1
    
    if created_count > 0:
        # Decrement org's free matches
        org.free_matches_left = max(0, org.free_matches_left - created_count)
        await db.commit()
    
    return created_count
