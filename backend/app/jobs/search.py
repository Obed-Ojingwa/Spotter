# C:\Users\Melody\Documents\Spotter\backend\app\jobs\search.py
"""
Meilisearch integration for job search.

Jobs are indexed when created or updated.
Falls back gracefully to database search if Meilisearch is unavailable.
"""
import logging
from typing import Optional
import meilisearch
from app.config import settings

logger = logging.getLogger(__name__)

INDEX_NAME = "jobs"

# ── Client singleton ───────────────────────────────────────────────────────

def get_client() -> Optional[meilisearch.Client]:
    """Return a Meilisearch client, or None if unavailable."""
    try:
        client = meilisearch.Client(settings.MEILI_URL, settings.MEILI_MASTER_KEY)
        # Quick health check
        client.health()
        return client
    except Exception:
        return None


def get_index():
    """Get (or create) the jobs index with correct settings."""
    client = get_client()
    if not client:
        return None
    try:
        index = client.index(INDEX_NAME)
        # Configure searchable and filterable attributes (idempotent)
        index.update_searchable_attributes([
            "title", "description", "required_skills",
            "required_tech_stack", "city", "state",
        ])
        index.update_filterable_attributes([
            "status", "work_mode", "employment_type",
            "state", "city", "poster_type",
        ])
        index.update_sortable_attributes(["created_at"])
        return index
    except Exception as e:
        logger.warning(f"Meilisearch index setup failed: {e}")
        return None


# ── Index operations ───────────────────────────────────────────────────────

def index_job(job) -> bool:
    """
    Add or update a single job in the search index.
    Called after job creation or status change.
    Returns True on success, False on failure (non-blocking).
    """
    index = get_index()
    if not index:
        logger.debug("Meilisearch unavailable — skipping index for job %s", job.id)
        return False
    try:
        doc = {
            "id":                      str(job.id),
            "title":                   job.title,
            "description":             job.description or "",
            "city":                    job.city or "",
            "state":                   job.state or "",
            "work_mode":               job.work_mode or "",
            "employment_type":         job.employment_type or "",
            "salary_min":              job.salary_min,
            "salary_max":              job.salary_max,
            "required_skills":         job.required_skills or [],
            "required_tech_stack":     job.required_tech_stack or [],
            "required_experience_years": job.required_experience_years,
            "required_education":      job.required_education or "",
            "status":                  job.status.value if hasattr(job.status, "value") else job.status,
            "poster_type":             job.poster_type or "",
            "created_at":              job.created_at.isoformat() if job.created_at else "",
        }
        index.add_documents([doc], primary_key="id")
        return True
    except Exception as e:
        logger.warning(f"Failed to index job {job.id}: {e}")
        return False


def remove_job(job_id: str) -> bool:
    """Remove a job from the search index when closed or deleted."""
    index = get_index()
    if not index:
        return False
    try:
        index.delete_document(job_id)
        return True
    except Exception as e:
        logger.warning(f"Failed to remove job {job_id} from index: {e}")
        return False


def search_jobs(
    query: str = "",
    filters: Optional[dict] = None,
    page: int = 1,
    limit: int = 20,
) -> Optional[dict]:
    """
    Search jobs in Meilisearch.
    Returns None if Meilisearch is unavailable (caller falls back to DB).

    Args:
        query:   Full-text search string
        filters: Dict of field → value pairs (e.g. {"state": "Lagos", "work_mode": "remote"})
        page:    1-based page number
        limit:   Results per page

    Returns:
        Dict with "hits" list and "totalHits" count, or None on failure.
    """
    index = get_index()
    if not index:
        return None

    try:
        # Build Meilisearch filter string
        filter_parts: list[str] = ['status = "active"']
        if filters:
            for field, value in filters.items():
                if value:
                    filter_parts.append(f'{field} = "{value}"')

        result = index.search(
            query,
            {
                "filter":       " AND ".join(filter_parts),
                "offset":       (page - 1) * limit,
                "limit":        limit,
                "sort":         ["created_at:desc"],
                "attributesToRetrieve": [
                    "id", "title", "description", "city", "state", "work_mode",
                    "employment_type", "salary_min", "salary_max",
                    "required_skills", "status", "created_at",
                ],
            },
        )
        return result
    except Exception as e:
        logger.warning(f"Meilisearch search failed: {e}")
        return None


def reindex_all(jobs: list) -> int:
    """
    Bulk-reindex all jobs. Call this from an admin endpoint or CLI.
    Returns count of successfully indexed jobs.
    """
    index = get_index()
    if not index:
        logger.warning("Meilisearch unavailable — reindex skipped")
        return 0

    docs = []
    for job in jobs:
        try:
            docs.append({
                "id":              str(job.id),
                "title":           job.title,
                "description":     job.description or "",
                "city":            job.city or "",
                "state":           job.state or "",
                "work_mode":       job.work_mode or "",
                "employment_type": job.employment_type or "",
                "salary_min":      job.salary_min,
                "salary_max":      job.salary_max,
                "required_skills": job.required_skills or [],
                "status":          job.status.value if hasattr(job.status, "value") else job.status,
                "poster_type":     job.poster_type or "",
                "created_at":      job.created_at.isoformat() if job.created_at else "",
            })
        except Exception:
            continue

    if docs:
        try:
            index.add_documents(docs, primary_key="id")
            logger.info(f"Reindexed {len(docs)} jobs")
        except Exception as e:
            logger.error(f"Bulk reindex failed: {e}")
            return 0

    return len(docs)
