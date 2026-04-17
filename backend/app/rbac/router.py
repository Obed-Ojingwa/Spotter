# C:\Users\Melody\Documents\Spotter\backend\app\rbac\router.py
"""
Role & Permission Management API
Endpoints for Super Admin and Executive Admin to manage the RBAC system.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from app.database import get_db
from app.models import User
from app.rbac.deps import require_permission, get_current_user
from app.rbac.resolver import (
    resolve_permission, get_user_permissions, get_user_primary_role,
)
from app.rbac.deps import assert_higher_than
from app.rbac.models import (
    Role, Permission, RolePermission, UserRole,
    UserPermissionOverride, PermissionDelegation, PermissionExpiry,
)

router = APIRouter(prefix="/rbac", tags=["rbac"])

SUPER_ADMIN_SLUG = "super_admin"
EXECUTIVE_ADMIN_SLUG = "executive_admin"


async def _user_has_role(user_id: str, role_slug: str, db: AsyncSession) -> bool:
    """True if user has the role assigned (primary or secondary)."""
    result = await db.execute(
        select(UserRole)
        .join(Role, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id, Role.slug == role_slug)
    )
    return result.scalar_one_or_none() is not None


async def _assert_can_modify_target(actor: User, target_user_id: str, db: AsyncSession) -> None:
    """
    Extra hardening on top of hierarchy rules:
    - Only Super Admin may modify any user with super_admin role.
    - Executive Admin may not modify any user with super_admin or executive_admin role.
    """
    actor_is_super_admin = await _user_has_role(str(actor.id), SUPER_ADMIN_SLUG, db)
    if actor_is_super_admin:
        return

    # Nobody else can touch Super Admins
    if await _user_has_role(target_user_id, SUPER_ADMIN_SLUG, db):
        raise HTTPException(status_code=403, detail="You cannot modify a Super Admin user")

    actor_primary = await get_user_primary_role(str(actor.id), db)
    if actor_primary and actor_primary.slug == EXECUTIVE_ADMIN_SLUG:
        if await _user_has_role(target_user_id, EXECUTIVE_ADMIN_SLUG, db):
            raise HTTPException(status_code=403, detail="You cannot modify an Executive Admin user")


# ═══════════════════════════════════════════════════════════════════════════
# ROLE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

class RoleCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    hierarchy_level: int


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    hierarchy_level: Optional[int] = None


@router.get("/roles")
async def list_roles(db: AsyncSession = Depends(get_db)):
    """List all roles ordered by hierarchy."""
    result = await db.execute(select(Role).order_by(Role.hierarchy_level))
    roles = result.scalars().all()
    return [
        {
            "id": r.id, "name": r.name, "slug": r.slug,
            "description": r.description,
            "hierarchy_level": r.hierarchy_level,
            "is_system": r.is_system,
        }
        for r in roles
    ]


@router.post("/roles", status_code=201)
async def create_role(
    body: RoleCreate,
    user: User = Depends(require_permission("create_role")),
    db: AsyncSession = Depends(get_db),
):
    # Slug must be unique
    existing = await db.execute(select(Role).where(Role.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Role slug '{body.slug}' already exists")

    role = Role(**body.model_dump(), is_system=False)
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return {"id": role.id, "name": role.name, "slug": role.slug}


@router.patch("/roles/{role_id}")
async def update_role(
    role_id: int,
    body: RoleUpdate,
    user: User = Depends(require_permission("edit_role")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(role, field, value)
    await db.commit()
    return {"id": role.id, "name": role.name, "updated": True}


@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int,
    user: User = Depends(require_permission("delete_role")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_system:
        raise HTTPException(status_code=403, detail="System roles cannot be deleted")

    await db.execute(delete(Role).where(Role.id == role_id))
    await db.commit()
    return {"message": f"Role '{role.name}' deleted"}


# ═══════════════════════════════════════════════════════════════════════════
# PERMISSION MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

class PermCreate(BaseModel):
    name: str
    slug: str
    resource: str
    action: str
    description: Optional[str] = None


@router.get("/permissions")
async def list_permissions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Permission).order_by(Permission.resource, Permission.action))
    perms = result.scalars().all()
    return [
        {"id": p.id, "name": p.name, "slug": p.slug,
         "resource": p.resource, "action": p.action, "description": p.description}
        for p in perms
    ]


@router.post("/permissions", status_code=201)
async def create_permission(
    body: PermCreate,
    user: User = Depends(require_permission("manage_permissions")),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Permission).where(Permission.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Permission '{body.slug}' already exists")

    perm = Permission(**body.model_dump())
    db.add(perm)
    await db.commit()
    await db.refresh(perm)
    return {"id": perm.id, "slug": perm.slug}


@router.post("/roles/{role_id}/permissions/{permission_slug}")
async def add_permission_to_role(
    role_id: int,
    permission_slug: str,
    user: User = Depends(require_permission("manage_permissions")),
    db: AsyncSession = Depends(get_db),
):
    role = (await db.execute(select(Role).where(Role.id == role_id))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    perm = (await db.execute(select(Permission).where(Permission.slug == permission_slug))).scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail=f"Permission '{permission_slug}' not found")

    exists = (await db.execute(
        select(RolePermission).where(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == perm.id,
        )
    )).scalar_one_or_none()
    if exists:
        return {"message": "Already assigned"}

    db.add(RolePermission(role_id=role_id, permission_id=perm.id))
    await db.commit()
    return {"message": f"Permission '{permission_slug}' added to role '{role.name}'"}


@router.delete("/roles/{role_id}/permissions/{permission_slug}")
async def remove_permission_from_role(
    role_id: int,
    permission_slug: str,
    user: User = Depends(require_permission("manage_permissions")),
    db: AsyncSession = Depends(get_db),
):
    perm = (await db.execute(select(Permission).where(Permission.slug == permission_slug))).scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")

    await db.execute(
        delete(RolePermission).where(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == perm.id,
        )
    )
    await db.commit()
    return {"message": f"Permission '{permission_slug}' removed from role {role_id}"}


# ═══════════════════════════════════════════════════════════════════════════
# USER ROLE ASSIGNMENT
# ═══════════════════════════════════════════════════════════════════════════

class AssignRoleBody(BaseModel):
    role_slug: str
    is_primary: bool = False


class TempRoleBody(BaseModel):
    role_slug: str
    duration_hours: Optional[int] = None   # None = permanent
    is_permanent: bool = False
    note: Optional[str] = None


@router.post("/users/{user_id}/assign-role")
async def assign_role_to_user(
    user_id: str,
    body: AssignRoleBody,
    actor: User = Depends(require_permission("assign_role")),
    db: AsyncSession = Depends(get_db),
):
    await _assert_can_modify_target(actor, user_id, db)
    await assert_higher_than(actor, user_id, db)

    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    role = (await db.execute(select(Role).where(Role.slug == body.role_slug))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail=f"Role '{body.role_slug}' not found")

    # Only Super Admin can assign Super Admin
    if body.role_slug == SUPER_ADMIN_SLUG:
        actor_is_super_admin = await _user_has_role(str(actor.id), SUPER_ADMIN_SLUG, db)
        if not actor_is_super_admin:
            raise HTTPException(status_code=403, detail="Only Super Admin can assign the Super Admin role")

    # Specific role assignment checks
    specific_perm_map = {
        "admin":          "assign_admin_role",
        "executive_admin":"assign_executive_role",
        "agent":          "assign_agent_role",
        "spotter":        "assign_spotter_role",
    }
    if body.role_slug in specific_perm_map:
        specific_perm = specific_perm_map[body.role_slug]
        has_perm = await resolve_permission(str(actor.id), specific_perm, db)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail=f"You need '{specific_perm}' to assign the {role.name} role",
            )

    # Check if already assigned
    existing = (await db.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role.id,
        )
    )).scalar_one_or_none()
    if existing:
        # Allow switching primary role even if already assigned
        if body.is_primary and not existing.is_primary:
            existing_primary = (await db.execute(
                select(UserRole).where(
                    UserRole.user_id == user_id,
                    UserRole.is_primary == True,
                )
            )).scalar_one_or_none()
            if existing_primary:
                existing_primary.is_primary = False
            existing.is_primary = True
            await db.commit()
            return {"message": f"Role '{role.name}' set as primary", "user_id": user_id}
        return {"message": "Role already assigned"}

    # If setting as primary, clear previous primary
    if body.is_primary:
        existing_primary = (await db.execute(
            select(UserRole).where(
                UserRole.user_id == user_id,
                UserRole.is_primary == True,
            )
        )).scalar_one_or_none()
        if existing_primary:
            existing_primary.is_primary = False

    user_role = UserRole(
        user_id=user_id,
        role_id=role.id,
        is_primary=body.is_primary,
        assigned_by=actor.id,
    )
    db.add(user_role)
    await db.commit()
    return {"message": f"Role '{role.name}' assigned to user", "user_id": user_id}


@router.post("/users/{user_id}/remove-role")
async def remove_role_from_user(
    user_id: str,
    body: AssignRoleBody,
    actor: User = Depends(require_permission("remove_role")),
    db: AsyncSession = Depends(get_db),
):
    await _assert_can_modify_target(actor, user_id, db)
    await assert_higher_than(actor, user_id, db)

    role = (await db.execute(select(Role).where(Role.slug == body.role_slug))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Only Super Admin can remove Super Admin
    if body.role_slug == SUPER_ADMIN_SLUG:
        actor_is_super_admin = await _user_has_role(str(actor.id), SUPER_ADMIN_SLUG, db)
        if not actor_is_super_admin:
            raise HTTPException(status_code=403, detail="Only Super Admin can remove the Super Admin role")

    await db.execute(
        delete(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role.id,
        )
    )
    await db.commit()
    return {"message": f"Role '{role.name}' removed from user"}


@router.post("/users/{user_id}/temporary-role")
async def assign_temporary_role(
    user_id: str,
    body: TempRoleBody,
    actor: User = Depends(require_permission("assign_temp_role")),
    db: AsyncSession = Depends(get_db),
):
    await assert_higher_than(actor, user_id, db)

    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    role = (await db.execute(select(Role).where(Role.slug == body.role_slug))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Create the UserRole assignment
    user_role = UserRole(
        user_id=user_id,
        role_id=role.id,
        is_primary=False,
        assigned_by=actor.id,
    )
    db.add(user_role)
    await db.flush()

    # Create the expiry record
    expires_at = None
    if not body.is_permanent and body.duration_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=body.duration_hours)

    expiry = PermissionExpiry(
        user_id=user_id,
        user_role_id=user_role.id,
        expires_at=expires_at,
        is_permanent=body.is_permanent,
        granted_by=actor.id,
        note=body.note,
    )
    db.add(expiry)
    await db.commit()

    return {
        "message": f"Temporary role '{role.name}' assigned",
        "user_id": user_id,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "is_permanent": body.is_permanent,
    }


# ═══════════════════════════════════════════════════════════════════════════
# PERMISSION OVERRIDES
# ═══════════════════════════════════════════════════════════════════════════

class PermissionOverrideBody(BaseModel):
    permission_slug: str
    reason: Optional[str] = None
    duration_hours: Optional[int] = None
    is_permanent: bool = False


@router.post("/users/{user_id}/grant-permission")
async def grant_permission_to_user(
    user_id: str,
    body: PermissionOverrideBody,
    actor: User = Depends(require_permission("grant_permission")),
    db: AsyncSession = Depends(get_db),
):
    await assert_higher_than(actor, user_id, db)

    perm = (await db.execute(
        select(Permission).where(Permission.slug == body.permission_slug)
    )).scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail=f"Permission '{body.permission_slug}' not found")

    # Upsert override
    existing = (await db.execute(
        select(UserPermissionOverride).where(
            UserPermissionOverride.user_id == user_id,
            UserPermissionOverride.permission_id == perm.id,
        )
    )).scalar_one_or_none()

    if existing:
        existing.granted = True
        existing.reason = body.reason
        existing.granted_by = actor.id
        override = existing
    else:
        override = UserPermissionOverride(
            user_id=user_id,
            permission_id=perm.id,
            granted=True,
            reason=body.reason,
            granted_by=actor.id,
        )
        db.add(override)

    await db.flush()

    # Attach expiry if time-limited
    if not body.is_permanent and body.duration_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=body.duration_hours)
        expiry = PermissionExpiry(
            user_id=user_id,
            override_id=override.id,
            expires_at=expires_at,
            is_permanent=False,
            granted_by=actor.id,
        )
        db.add(expiry)

    await db.commit()
    return {
        "message": f"Permission '{body.permission_slug}' granted to user {user_id}",
        "is_permanent": body.is_permanent,
        "duration_hours": body.duration_hours,
    }


@router.post("/users/{user_id}/revoke-permission")
async def revoke_permission_from_user(
    user_id: str,
    body: PermissionOverrideBody,
    actor: User = Depends(require_permission("revoke_permission")),
    db: AsyncSession = Depends(get_db),
):
    await assert_higher_than(actor, user_id, db)

    perm = (await db.execute(
        select(Permission).where(Permission.slug == body.permission_slug)
    )).scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")

    existing = (await db.execute(
        select(UserPermissionOverride).where(
            UserPermissionOverride.user_id == user_id,
            UserPermissionOverride.permission_id == perm.id,
        )
    )).scalar_one_or_none()

    if existing:
        existing.granted = False
        existing.reason = body.reason
        existing.granted_by = actor.id
    else:
        override = UserPermissionOverride(
            user_id=user_id,
            permission_id=perm.id,
            granted=False,
            reason=body.reason,
            granted_by=actor.id,
        )
        db.add(override)

    await db.commit()
    return {"message": f"Permission '{body.permission_slug}' revoked from user {user_id}"}


# ═══════════════════════════════════════════════════════════════════════════
# DELEGATION
# ═══════════════════════════════════════════════════════════════════════════

class DelegateBody(BaseModel):
    delegatee_id: str
    permission_slug: str
    can_redelegate: bool = False


@router.post("/users/{user_id}/delegate-permission")
async def delegate_permission(
    user_id: str,
    body: DelegateBody,
    actor: User = Depends(require_permission("delegate_permission")),
    db: AsyncSession = Depends(get_db),
):
    # Actor must themselves have the permission they want to delegate
    has_perm = await resolve_permission(str(actor.id), body.permission_slug, db)
    if not has_perm:
        raise HTTPException(
            status_code=403,
            detail=f"You cannot delegate a permission you don't have: '{body.permission_slug}'",
        )

    perm = (await db.execute(
        select(Permission).where(Permission.slug == body.permission_slug)
    )).scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")

    delegation = PermissionDelegation(
        delegator_id=actor.id,
        delegatee_id=body.delegatee_id,
        permission_id=perm.id,
        can_redelegate=body.can_redelegate,
    )
    db.add(delegation)
    await db.commit()
    return {"message": f"Permission '{body.permission_slug}' delegated to user {body.delegatee_id}"}


# ═══════════════════════════════════════════════════════════════════════════
# USER PERMISSION INTROSPECTION
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/users/{user_id}/permissions")
async def get_user_perms(
    user_id: str,
    actor: User = Depends(require_permission("read_user")),
    db: AsyncSession = Depends(get_db),
):
    """Return all permissions the user currently holds (for UI capability checks)."""
    perms = await get_user_permissions(user_id, db)
    primary_role = await get_user_primary_role(user_id, db)
    return {
        "user_id": user_id,
        "primary_role": primary_role.slug if primary_role else None,
        "permissions": perms,
    }


@router.get("/users/{user_id}/roles")
async def get_user_roles(
    user_id: str,
    actor: User = Depends(require_permission("read_user")),
    db: AsyncSession = Depends(get_db),
):
    """Return all roles assigned to a user including temp ones."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(UserRole, Role)
        .join(Role, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    )
    rows = result.all()

    output = []
    for ur, role in rows:
        # Check expiry
        expiry_result = await db.execute(
            select(PermissionExpiry).where(PermissionExpiry.user_role_id == ur.id)
        )
        expiry = expiry_result.scalar_one_or_none()
        is_expired = (
            expiry is not None
            and not expiry.is_permanent
            and expiry.expires_at
            and expiry.expires_at < now
        )
        output.append({
            "role_id":    role.id,
            "role_name":  role.name,
            "role_slug":  role.slug,
            "is_primary": ur.is_primary,
            "is_temp":    expiry is not None,
            "is_permanent": expiry.is_permanent if expiry else True,
            "expires_at": expiry.expires_at.isoformat() if expiry and expiry.expires_at else None,
            "is_expired": is_expired,
            "assigned_at": ur.assigned_at.isoformat(),
        })
    return {"user_id": user_id, "roles": output}


@router.get("/me/permissions")
async def my_permissions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Any logged-in user can check their own permissions."""
    perms = await get_user_permissions(str(user.id), db)
    primary_role = await get_user_primary_role(str(user.id), db)
    return {
        "user_id": str(user.id),
        "email": user.email,
        "legacy_role": user.role.value,
        "primary_role": primary_role.slug if primary_role else user.role.value,
        "permissions": perms,
    }
