# C:\Users\Melody\Documents\Spotter\backend\alembic\versions\002_rbac_system.py
"""Add RBAC system — 7 new tables, no changes to existing tables

Revision ID: 002
Revises: 001
Create Date: 2025-01-01 00:01:00.000000

Safe to run on existing databases:
- Does NOT modify any existing table
- Existing users default to Seeker role (handled in app/seed.py migrate step)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── 1. roles ──────────────────────────────────────────────────────────
    op.create_table(
        'roles',
        sa.Column('id',              sa.Integer,     primary_key=True, autoincrement=True),
        sa.Column('name',            sa.String(50),  nullable=False, unique=True),
        sa.Column('slug',            sa.String(50),  nullable=False, unique=True),
        sa.Column('description',     sa.Text),
        sa.Column('hierarchy_level', sa.Integer,     nullable=False),
        sa.Column('is_system',       sa.Boolean,     nullable=False, server_default='true'),
        sa.Column('created_at',      sa.DateTime,    server_default=sa.func.now()),
    )
    op.create_index('ix_roles_slug', 'roles', ['slug'])

    # ── 2. permissions ────────────────────────────────────────────────────
    op.create_table(
        'permissions',
        sa.Column('id',          sa.Integer,     primary_key=True, autoincrement=True),
        sa.Column('name',        sa.String(100), nullable=False, unique=True),
        sa.Column('slug',        sa.String(100), nullable=False, unique=True),
        sa.Column('resource',    sa.String(50),  nullable=False),
        sa.Column('action',      sa.String(50),  nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('created_at',  sa.DateTime,    server_default=sa.func.now()),
        sa.UniqueConstraint('resource', 'action', name='uq_permission_resource_action'),
    )
    op.create_index('ix_permissions_slug', 'permissions', ['slug'])

    # ── 3. role_permissions ───────────────────────────────────────────────
    op.create_table(
        'role_permissions',
        sa.Column('id',            sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('role_id',       sa.Integer, sa.ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('permission_id', sa.Integer, sa.ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at',    sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint('role_id', 'permission_id', name='uq_role_permission'),
    )

    # ── 4. user_roles ─────────────────────────────────────────────────────
    op.create_table(
        'user_roles',
        sa.Column('id',          postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',     postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_id',     sa.Integer, sa.ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('is_primary',  sa.Boolean, nullable=False, server_default='false'),
        sa.Column('assigned_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('assigned_at', sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'role_id', name='uq_user_role'),
    )
    op.create_index('ix_user_roles_user_id', 'user_roles', ['user_id'])

    # ── 5. user_permission_overrides ──────────────────────────────────────
    op.create_table(
        'user_permission_overrides',
        sa.Column('id',            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',       postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('permission_id', sa.Integer, sa.ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('granted',       sa.Boolean, nullable=False),
        sa.Column('reason',        sa.Text),
        sa.Column('granted_by',    postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at',    sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'permission_id', name='uq_user_permission_override'),
    )
    op.create_index('ix_permission_overrides_user_id', 'user_permission_overrides', ['user_id'])

    # ── 6. permission_delegations ─────────────────────────────────────────
    op.create_table(
        'permission_delegations',
        sa.Column('id',             postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('delegator_id',   postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('delegatee_id',   postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('permission_id',  sa.Integer, sa.ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('can_redelegate', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at',     sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint('delegator_id', 'delegatee_id', 'permission_id', name='uq_delegation'),
    )
    op.create_index('ix_delegations_delegatee_id', 'permission_delegations', ['delegatee_id'])

    # ── 7. permission_expiry ──────────────────────────────────────────────
    op.create_table(
        'permission_expiry',
        sa.Column('id',           postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',      postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_role_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user_roles.id', ondelete='CASCADE'), nullable=True),
        sa.Column('override_id',  postgresql.UUID(as_uuid=True), sa.ForeignKey('user_permission_overrides.id', ondelete='CASCADE'), nullable=True),
        sa.Column('expires_at',   sa.DateTime, nullable=True),
        sa.Column('is_permanent', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('granted_by',   postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('note',         sa.Text),
        sa.Column('created_at',   sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_permission_expiry_user_id',    'permission_expiry', ['user_id'])
    op.create_index('ix_permission_expiry_expires_at', 'permission_expiry', ['expires_at'])


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_table('permission_expiry')
    op.drop_table('permission_delegations')
    op.drop_table('user_permission_overrides')
    op.drop_table('user_roles')
    op.drop_table('role_permissions')
    op.drop_table('permissions')
    op.drop_table('roles')
