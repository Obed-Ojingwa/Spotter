# C:\Users\Melody\Documents\Spotter\backend\app\rbac\models.py
"""
RBAC models — layered on top of the existing users table.
These 7 tables implement the full dynamic permission system
without touching existing models.
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Boolean, Integer, Text, DateTime,
    ForeignKey, UniqueConstraint, func, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


# ── 1. Roles ──────────────────────────────────────────────────────────────
class Role(Base):
    """
    DB-driven role definitions — no hardcoded enums.
    hierarchy_level: lower number = higher authority.
      0 = Super Admin (overrides everything)
      1 = Executive Admin
      2 = Admin
      3 = Agent
      4 = Spotter
      5 = Organization
      6 = Seeker
    """
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # e.g. "super_admin"
    description: Mapped[Optional[str]] = mapped_column(Text)
    hierarchy_level: Mapped[int] = mapped_column(Integer, nullable=False)  # 0 = top
    is_system: Mapped[bool] = mapped_column(Boolean, default=True)  # system roles can't be deleted
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    role_permissions: Mapped[list["RolePermission"]] = relationship(back_populates="role", cascade="all, delete-orphan")
    user_roles: Mapped[list["UserRole"]] = relationship(back_populates="role")


# ── 2. Permissions ─────────────────────────────────────────────────────────
class Permission(Base):
    """
    Granular permission definitions.
    resource: what the permission applies to (user, job, match, etc.)
    action:   what is allowed (create, read, update, delete, assign, etc.)
    """
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # e.g. "create_user"
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    resource: Mapped[str] = mapped_column(String(50), nullable=False)   # e.g. "user"
    action: Mapped[str] = mapped_column(String(50), nullable=False)     # e.g. "create"
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("resource", "action", name="uq_permission_resource_action"),
    )


# ── 3. RolePermissions ─────────────────────────────────────────────────────
class RolePermission(Base):
    """Maps default permissions to roles."""
    __tablename__ = "role_permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.id", ondelete="CASCADE"))
    permission_id: Mapped[int] = mapped_column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    role: Mapped["Role"] = relationship(back_populates="role_permissions")
    permission: Mapped["Permission"] = relationship()

    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )


# ── 4. UserRoles ────────────────────────────────────────────────────────────
class UserRole(Base):
    """
    A user can have multiple roles simultaneously.
    is_primary: the "main" role shown in UI and used for legacy role checks.
    """
    __tablename__ = "user_roles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.id", ondelete="CASCADE"))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    assigned_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    assigned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    role: Mapped["Role"] = relationship(back_populates="user_roles")

    __table_args__ = (
        UniqueConstraint("user_id", "role_id", name="uq_user_role"),
        Index("ix_user_roles_user_id", "user_id"),
    )


# ── 5. UserPermissionOverrides ─────────────────────────────────────────────
class UserPermissionOverride(Base):
    """
    Grant or revoke a specific permission for a specific user,
    overriding whatever their role(s) say.
    granted=True  → user HAS the permission even if their role doesn't
    granted=False → user is DENIED the permission even if their role grants it
    """
    __tablename__ = "user_permission_overrides"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    permission_id: Mapped[int] = mapped_column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"))
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False)  # True=grant, False=revoke
    reason: Mapped[Optional[str]] = mapped_column(Text)
    granted_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    permission: Mapped["Permission"] = relationship()

    __table_args__ = (
        UniqueConstraint("user_id", "permission_id", name="uq_user_permission_override"),
        Index("ix_permission_overrides_user_id", "user_id"),
    )


# ── 6. PermissionDelegations ───────────────────────────────────────────────
class PermissionDelegation(Base):
    """
    A higher-level user delegates a permission to another user so that
    user can in turn assign that permission to others.
    Example: Super Admin delegates 'assign_admin_role' to Executive Admin.
    """
    __tablename__ = "permission_delegations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    delegator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    delegatee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    permission_id: Mapped[int] = mapped_column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"))
    can_redelegate: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    permission: Mapped["Permission"] = relationship()

    __table_args__ = (
        UniqueConstraint("delegator_id", "delegatee_id", "permission_id", name="uq_delegation"),
        Index("ix_delegations_delegatee_id", "delegatee_id"),
    )


# ── 7. PermissionExpiry ────────────────────────────────────────────────────
class PermissionExpiry(Base):
    """
    Time-based privilege assignments.
    Links to either a UserRole (temporary role elevation)
    or a UserPermissionOverride (temporary permission grant).
    After expires_at, the system treats the record as if it doesn't exist.
    """
    __tablename__ = "permission_expiry"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    # One of these two will be set (not both)
    user_role_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("user_roles.id", ondelete="CASCADE"))
    override_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("user_permission_overrides.id", ondelete="CASCADE"))

    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)   # None = permanent
    is_permanent: Mapped[bool] = mapped_column(Boolean, default=False)
    granted_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    note: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_permission_expiry_user_id", "user_id"),
        Index("ix_permission_expiry_expires_at", "expires_at"),
    )
