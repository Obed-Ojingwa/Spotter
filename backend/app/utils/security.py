"""
Rate limiting utilities using Redis.
Applied as FastAPI middleware or per-route dependency.
"""
import time
from fastapi import HTTPException, Request
from app.config import settings


async def get_redis():
    """Get a Redis connection. Lazy import to avoid startup failures."""
    import redis.asyncio as aioredis
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def rate_limit(request: Request, max_requests: int = 60, window_seconds: int = 60):
    """
    Dependency that rate-limits by IP address.
    Usage: Depends(rate_limit) or Depends(lambda r: rate_limit(r, 10, 60))
    """
    try:
        r = await get_redis()
        ip = request.client.host
        key = f"rl:{ip}:{int(time.time() // window_seconds)}"
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, window_seconds)
        await r.aclose()

        if count > max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Limit: {max_requests} per {window_seconds}s.",
                headers={"Retry-After": str(window_seconds)},
            )
    except HTTPException:
        raise
    except Exception:
        # If Redis is down, don't block the request — fail open
        pass
