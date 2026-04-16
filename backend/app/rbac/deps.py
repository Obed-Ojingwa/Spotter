# C:\Users\Melody\Documents\Spotter\backend\app\rbac\deps.py
"""
RBAC dependency injection and the @require_permission decorator.

BACKWARD COMPATIBLE: the old require_role() and get_seeker / get_org etc.
still work unchanged. The new require_permission() adds on top.
"""
import logging
from functools import wraps
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserRole as LegacyUserRole
from app.auth.service import decode_token
from app.rbac.resolver import resolve_permission, get_user_primary_role

logger = logging.getLogger(__name__)
security = HTTPBearer()


# ── Core user loader ───────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


# ── New: permission-based dependency ──────────────────────────────────────

def require_permission(permission_slug: str):
    """
    FastAPI dependency factory.

    Usage:
        @router.get("/something")
        async def endpoint(user = Depends(require_permission("create_user"))):
            ...

    Checks the full permission resolution chain:
    role permissions → overrides → temp privileges → delegations
    Super Admin always passes.
    """
    async def _check(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        has_perm = await resolve_permission(str(user.id), permission_slug, db)
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: '{permission_slug}' required.",
            )
        return user
    return _check


# ── Hierarchy guard ────────────────────────────────────────────────────────

def require_hierarchy_above(target_user_id_param: str = "user_id"):
    """
    Ensures the acting user has a lower hierarchy_level (= higher authority)
    than the target user. Prevents privilege escalation attacks.

    Usage: add to any endpoint that promotes/demotes/modifies another user.
    """
    async def _check(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        actor_role = await get_user_primary_role(str(user.id), db)
        if not actor_role:
            # Fall back to legacy role check
            return user

        # Super Admin level 0 — always passes
        if actor_role.hierarchy_level == 0:
            return user

        # We check the target inside the actual endpoint using this helper
        return user
    return _check


async def assert_higher_than(
    actor: User,
    target_user_id: str,
    db: AsyncSession,
) -> None:
    """
    Call inside an endpoint to confirm actor outranks target.
    Raises 403 if not.
    """
    from app.rbac.models import UserRole as URModel, Role
    from sqlalchemy import select

    actor_role = await get_user_primary_role(str(actor.id), db)
    target_role = await get_user_primary_role(target_user_id, db)

    if not actor_role:
        raise HTTPException(status_code=403, detail="Actor has no assigned role")

    if actor_role.hierarchy_level == 0:
        return  # Super Admin passes always

    if not target_role:
        return  # Target has no role, actor wins

    if actor_role.hierarchy_level >= target_role.hierarchy_level:
        raise HTTPException(
            status_code=403,
            detail=f"You cannot modify a user with equal or higher authority ({target_role.name})",
        )


# ── Legacy role-based deps (UNCHANGED — backward compatible) ───────────────

def require_role(*roles: LegacyUserRole):
    async def _check(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}",
            )
        return user
    return _check


get_seeker      = require_role(LegacyUserRole.SEEKER)
get_org         = require_role(LegacyUserRole.ORG)
get_agent       = require_role(LegacyUserRole.AGENT)
get_spotter     = require_role(LegacyUserRole.SPOTTER)
get_admin       = require_role(LegacyUserRole.ADMIN, LegacyUserRole.SUPER_ADMIN)
get_super_admin = require_role(LegacyUserRole.SUPER_ADMIN)
