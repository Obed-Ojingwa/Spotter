# C:\Users\Melody\Documents\Spotter\backend\app\rbac\resolver.py
"""
Permission resolution engine.

Resolution order (checked in this sequence, first match wins):
1. Super Admin override  → always granted, skip all checks
2. User is inactive      → always denied
3. UserPermissionOverride (explicit deny)  → denied immediately
4. UserPermissionOverride (explicit grant) → granted immediately
5. Temporary roles       → check if any unexpired temp role grants it
6. Permanent roles       → check if any of the user's roles grant it
7. PermissionDelegations → check if the permission was delegated to this user
8. Default               → denied
"""
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.rbac.models import (
    Role, Permission, RolePermission, UserRole,
    UserPermissionOverride, PermissionDelegation, PermissionExpiry,
)

logger = logging.getLogger(__name__)

# Slug of the role that bypasses all checks
SUPER_ADMIN_SLUG = "super_admin"


async def resolve_permission(
    user_id: str,
    permission_slug: str,
    db: AsyncSession,
) -> bool:
    """
    Returns True if the user has the given permission, False otherwise.
    This is the single source of truth for all authorization checks.
    """
    now = datetime.now(timezone.utc)

    # ── Step 1: Super Admin bypass ─────────────────────────────────────────
    sa_check = await db.execute(
        select(UserRole)
        .join(Role, UserRole.role_id == Role.id)
        .where(
            UserRole.user_id == user_id,
            Role.slug == SUPER_ADMIN_SLUG,
        )
    )
    if sa_check.scalar_one_or_none():
        return True  # Super Admin can do everything, full stop

    # ── Resolve the permission record ──────────────────────────────────────
    perm_result = await db.execute(
        select(Permission).where(Permission.slug == permission_slug)
    )
    permission = perm_result.scalar_one_or_none()
    if not permission:
        logger.warning(f"Permission slug '{permission_slug}' not found in DB")
        return False

    # ── Step 2: Explicit deny override ────────────────────────────────────
    deny_check = await db.execute(
        select(UserPermissionOverride).where(
            UserPermissionOverride.user_id == user_id,
            UserPermissionOverride.permission_id == permission.id,
            UserPermissionOverride.granted == False,
        )
    )
    if deny_check.scalar_one_or_none():
        return False  # Explicitly denied — stop here

    # ── Step 3: Explicit grant override ───────────────────────────────────
    grant_override = await db.execute(
        select(UserPermissionOverride).where(
            UserPermissionOverride.user_id == user_id,
            UserPermissionOverride.permission_id == permission.id,
            UserPermissionOverride.granted == True,
        )
    )
    override = grant_override.scalar_one_or_none()
    if override:
        # Check if this override has an expiry
        expiry = await _get_expiry_for_override(override.id, db, now)
        if expiry is None or expiry:  # no expiry record OR not expired
            return True

    # ── Step 4: Check all user roles (including temp ones) ─────────────────
    user_roles_result = await db.execute(
        select(UserRole).where(UserRole.user_id == user_id)
    )
    user_roles = user_roles_result.scalars().all()

    for user_role in user_roles:
        # Check if this user_role assignment is still valid (time-based)
        role_valid = await _is_user_role_valid(user_role.id, db, now)
        if not role_valid:
            continue

        # Check if this role has the permission
        rp_check = await db.execute(
            select(RolePermission).where(
                RolePermission.role_id == user_role.role_id,
                RolePermission.permission_id == permission.id,
            )
        )
        if rp_check.scalar_one_or_none():
            return True

    # ── Step 5: Check delegated permissions ───────────────────────────────
    delegation_check = await db.execute(
        select(PermissionDelegation).where(
            PermissionDelegation.delegatee_id == user_id,
            PermissionDelegation.permission_id == permission.id,
        )
    )
    if delegation_check.scalar_one_or_none():
        return True

    return False


async def _is_user_role_valid(
    user_role_id: str,
    db: AsyncSession,
    now: datetime,
) -> bool:
    """Returns False if the role assignment has an expired PermissionExpiry record."""
    expiry_result = await db.execute(
        select(PermissionExpiry).where(
            PermissionExpiry.user_role_id == user_role_id
        )
    )
    expiry = expiry_result.scalar_one_or_none()

    if not expiry:
        return True  # No expiry = permanent
    if expiry.is_permanent:
        return True
    if expiry.expires_at and expiry.expires_at < now:
        return False  # Expired
    return True


async def _get_expiry_for_override(
    override_id: str,
    db: AsyncSession,
    now: datetime,
) -> bool | None:
    """
    Returns:
      None  → no expiry record (treat as valid)
      True  → expiry record exists and has NOT expired (valid)
      False → expiry record exists and HAS expired (invalid)
    """
    expiry_result = await db.execute(
        select(PermissionExpiry).where(
            PermissionExpiry.override_id == override_id
        )
    )
    expiry = expiry_result.scalar_one_or_none()

    if not expiry:
        return None
    if expiry.is_permanent:
        return True
    if expiry.expires_at and expiry.expires_at < now:
        return False
    return True


async def get_user_permissions(
    user_id: str,
    db: AsyncSession,
) -> list[str]:
    """
    Return all permission slugs the user currently has.
    Used for frontend capability checks.
    """
    now = datetime.now(timezone.utc)

    # Super Admin gets everything
    sa_check = await db.execute(
        select(UserRole)
        .join(Role, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id, Role.slug == SUPER_ADMIN_SLUG)
    )
    if sa_check.scalar_one_or_none():
        all_perms = await db.execute(select(Permission))
        return [p.slug for p in all_perms.scalars().all()]

    slugs: set[str] = set()

    # From roles
    user_roles_result = await db.execute(
        select(UserRole).where(UserRole.user_id == user_id)
    )
    for user_role in user_roles_result.scalars().all():
        if not await _is_user_role_valid(user_role.id, db, now):
            continue
        rp_result = await db.execute(
            select(Permission)
            .join(RolePermission, Permission.id == RolePermission.permission_id)
            .where(RolePermission.role_id == user_role.role_id)
        )
        for p in rp_result.scalars().all():
            slugs.add(p.slug)

    # Grant overrides
    grant_result = await db.execute(
        select(UserPermissionOverride, Permission)
        .join(Permission, UserPermissionOverride.permission_id == Permission.id)
        .where(
            UserPermissionOverride.user_id == user_id,
            UserPermissionOverride.granted == True,
        )
    )
    for override, perm in grant_result.all():
        exp = await _get_expiry_for_override(override.id, db, now)
        if exp is None or exp:
            slugs.add(perm.slug)

    # Deny overrides — remove from set
    deny_result = await db.execute(
        select(UserPermissionOverride, Permission)
        .join(Permission, UserPermissionOverride.permission_id == Permission.id)
        .where(
            UserPermissionOverride.user_id == user_id,
            UserPermissionOverride.granted == False,
        )
    )
    for _, perm in deny_result.all():
        slugs.discard(perm.slug)

    # Delegations
    del_result = await db.execute(
        select(Permission)
        .join(PermissionDelegation, Permission.id == PermissionDelegation.permission_id)
        .where(PermissionDelegation.delegatee_id == user_id)
    )
    for p in del_result.scalars().all():
        slugs.add(p.slug)

    return sorted(slugs)


async def get_user_primary_role(
    user_id: str,
    db: AsyncSession,
) -> Role | None:
    """Return the primary role of a user (the one marked is_primary=True)."""
    result = await db.execute(
        select(Role)
        .join(UserRole, Role.id == UserRole.role_id)
        .where(
            UserRole.user_id == user_id,
            UserRole.is_primary == True,
        )
    )
    return result.scalar_one_or_none()
