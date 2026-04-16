# C:\Users\Melody\Documents\Spotter\backend\alembic\versions\001_initial_schema.py
"""Initial schema — creates all 14 SPOTTER tables

Revision ID: 001
Revises: 
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── users ──────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id',            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email',         sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role',          sa.String(20),  nullable=False),
        sa.Column('is_active',     sa.Boolean,     nullable=False, server_default='true'),
        sa.Column('is_verified',   sa.Boolean,     nullable=False, server_default='false'),
        sa.Column('created_at',    sa.DateTime,    server_default=sa.func.now()),
        sa.Column('updated_at',    sa.DateTime,    server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # ── job_seekers ────────────────────────────────────────────────────────
    op.create_table(
        'job_seekers',
        sa.Column('id',                    postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',               postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), unique=True),
        sa.Column('name',                  sa.String(255)),
        sa.Column('phone',                 sa.String(20)),
        sa.Column('address',               sa.String(500)),
        sa.Column('street',                sa.String(255)),
        sa.Column('city',                  sa.String(100)),
        sa.Column('state',                 sa.String(100)),
        sa.Column('religion',              sa.String(50)),
        sa.Column('gender',                sa.String(20)),
        sa.Column('age',                   sa.Integer),
        sa.Column('marital_status',        sa.String(30)),
        sa.Column('education',             sa.String(100)),
        sa.Column('degree_classification', sa.String(50)),
        sa.Column('tech_stack',            postgresql.JSON),
        sa.Column('skills',                postgresql.JSON),
        sa.Column('soft_skills',           postgresql.JSON),
        sa.Column('certifications',        postgresql.JSON),
        sa.Column('licenses',              postgresql.JSON),
        sa.Column('work_experience',       postgresql.JSON),
        sa.Column('work_mode',             sa.String(30)),
        sa.Column('available',             sa.Boolean, server_default='true'),
        sa.Column('free_matches_used',     sa.Integer, server_default='0'),
        sa.Column('profile_complete',      sa.Boolean, server_default='false'),
        sa.Column('cv_url',                sa.String(500)),
        sa.Column('avatar_url',            sa.String(500)),
        sa.Column('created_at',            sa.DateTime, server_default=sa.func.now()),
    )

    # ── organizations ──────────────────────────────────────────────────────
    op.create_table(
        'organizations',
        sa.Column('id',                postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',           postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), unique=True),
        sa.Column('name',              sa.String(255)),
        sa.Column('description',       sa.Text),
        sa.Column('industry',          sa.String(100)),
        sa.Column('website',           sa.String(255)),
        sa.Column('phone',             sa.String(20)),
        sa.Column('address',           sa.String(500)),
        sa.Column('city',              sa.String(100)),
        sa.Column('state',             sa.String(100)),
        sa.Column('logo_url',          sa.String(500)),
        sa.Column('free_posts_left',   sa.Integer, server_default='2'),
        sa.Column('free_matches_left', sa.Integer, server_default='2'),
        sa.Column('is_verified',       sa.Boolean, server_default='false'),
        sa.Column('created_at',        sa.DateTime, server_default=sa.func.now()),
    )

    # ── agents ─────────────────────────────────────────────────────────────
    op.create_table(
        'agents',
        sa.Column('id',            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',       postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), unique=True),
        sa.Column('referrer_id',   postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id'), nullable=True),
        sa.Column('name',          sa.String(255)),
        sa.Column('phone',         sa.String(20)),
        sa.Column('points',        sa.Float,       server_default='0'),
        sa.Column('plan',          sa.String(20),  server_default='basic'),
        sa.Column('referral_code', sa.String(20),  unique=True),
        sa.Column('is_active',     sa.Boolean,     server_default='true'),
        sa.Column('created_at',    sa.DateTime,    server_default=sa.func.now()),
    )

    # ── spotters ───────────────────────────────────────────────────────────
    op.create_table(
        'spotters',
        sa.Column('id',             postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',        postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), unique=True),
        sa.Column('name',           sa.String(255)),
        sa.Column('total_approved', sa.Integer, server_default='0'),
        sa.Column('total_rejected', sa.Integer, server_default='0'),
        sa.Column('created_at',     sa.DateTime, server_default=sa.func.now()),
    )

    # ── jobs ───────────────────────────────────────────────────────────────
    op.create_table(
        'jobs',
        sa.Column('id',                        postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('title',                     sa.String(255), nullable=False),
        sa.Column('description',               sa.Text),
        sa.Column('org_id',                    postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id'), nullable=True),
        sa.Column('agent_id',                  postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id'), nullable=True),
        sa.Column('poster_type',               sa.String(20)),
        sa.Column('city',                      sa.String(100)),
        sa.Column('state',                     sa.String(100)),
        sa.Column('work_mode',                 sa.String(30)),
        sa.Column('employment_type',           sa.String(50)),
        sa.Column('salary_min',                sa.Float),
        sa.Column('salary_max',                sa.Float),
        sa.Column('required_skills',           postgresql.JSON),
        sa.Column('required_tech_stack',       postgresql.JSON),
        sa.Column('required_experience_years', sa.Integer),
        sa.Column('required_education',        sa.String(100)),
        sa.Column('required_degree_class',     sa.String(50)),
        sa.Column('preferred_gender',          sa.String(20)),
        sa.Column('preferred_religion',        sa.String(50)),
        sa.Column('preferred_age_min',         sa.Integer),
        sa.Column('preferred_age_max',         sa.Integer),
        sa.Column('preferred_marital_status',  sa.String(30)),
        sa.Column('certifications_required',   postgresql.JSON),
        sa.Column('licenses_required',         postgresql.JSON),
        sa.Column('status',                    sa.String(20), server_default='active'),
        sa.Column('expires_at',                sa.DateTime),
        sa.Column('created_at',                sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_jobs_status', 'jobs', ['status'])
    op.create_index('ix_jobs_state',  'jobs', ['state'])

    # ── applications ───────────────────────────────────────────────────────
    op.create_table(
        'applications',
        sa.Column('id',           postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('job_id',       postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id')),
        sa.Column('seeker_id',    postgresql.UUID(as_uuid=True), sa.ForeignKey('job_seekers.id')),
        sa.Column('status',       sa.String(20), server_default='applied'),
        sa.Column('cover_letter', sa.Text),
        sa.Column('applied_at',   sa.DateTime, server_default=sa.func.now()),
    )

    # ── matches ────────────────────────────────────────────────────────────
    op.create_table(
        'matches',
        sa.Column('id',                postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('job_id',            postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id')),
        sa.Column('seeker_id',         postgresql.UUID(as_uuid=True), sa.ForeignKey('job_seekers.id')),
        sa.Column('score',             sa.Float),
        sa.Column('score_breakdown',   postgresql.JSON),
        sa.Column('status',            sa.String(30), server_default='pending_spotter'),
        sa.Column('spotter_id',        postgresql.UUID(as_uuid=True), sa.ForeignKey('spotters.id'), nullable=True),
        sa.Column('spotter_notes',     sa.Text),
        sa.Column('certificate_issued',sa.Boolean, server_default='false'),
        sa.Column('triggered_by',      sa.String(20)),
        sa.Column('matched_at',        sa.DateTime, server_default=sa.func.now()),
        sa.Column('approved_at',       sa.DateTime),
    )
    op.create_index('ix_matches_status', 'matches', ['status'])

    # ── agent_points ───────────────────────────────────────────────────────
    op.create_table(
        'agent_points',
        sa.Column('id',           postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('agent_id',     postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id')),
        sa.Column('delta',        sa.Float),
        sa.Column('reason',       sa.String(100)),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at',   sa.DateTime, server_default=sa.func.now()),
    )

    # ── referrals ──────────────────────────────────────────────────────────
    op.create_table(
        'referrals',
        sa.Column('id',          postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('referrer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id')),
        sa.Column('referee_id',  postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id')),
        sa.Column('level',       sa.Integer),
        sa.Column('created_at',  sa.DateTime, server_default=sa.func.now()),
    )

    # ── certificates ───────────────────────────────────────────────────────
    op.create_table(
        'certificates',
        sa.Column('id',        postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('match_id',  postgresql.UUID(as_uuid=True), sa.ForeignKey('matches.id'), unique=True),
        sa.Column('url',       sa.String(500)),
        sa.Column('issued_at', sa.DateTime, server_default=sa.func.now()),
    )

    # ── payments ───────────────────────────────────────────────────────────
    op.create_table(
        'payments',
        sa.Column('id',           postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('payer_id',     postgresql.UUID(as_uuid=True)),
        sa.Column('payer_type',   sa.String(20)),
        sa.Column('purpose',      sa.String(30)),
        sa.Column('amount',       sa.Integer),
        sa.Column('currency',     sa.String(5),  server_default='NGN'),
        sa.Column('provider',     sa.String(20), server_default='paystack'),
        sa.Column('provider_ref', sa.String(255)),
        sa.Column('reference',    sa.String(100), unique=True),
        sa.Column('status',       sa.String(20),  server_default='pending'),
        sa.Column('extra_data',   postgresql.JSON),
        sa.Column('paid_at',      sa.DateTime),
        sa.Column('created_at',   sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_payments_reference', 'payments', ['reference'])

    # ── matching_weights ───────────────────────────────────────────────────
    op.create_table(
        'matching_weights',
        sa.Column('id',          sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('criterion',   sa.String(50), unique=True),
        sa.Column('weight',      sa.Float),
        sa.Column('description', sa.String(255)),
        sa.Column('updated_at',  sa.DateTime, server_default=sa.func.now()),
    )

    # ── audit_logs ─────────────────────────────────────────────────────────
    op.create_table(
        'audit_logs',
        sa.Column('id',            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',       postgresql.UUID(as_uuid=True)),
        sa.Column('action',        sa.String(100)),
        sa.Column('resource_type', sa.String(50)),
        sa.Column('resource_id',   sa.String(100)),
        sa.Column('ip_address',    sa.String(50)),
        sa.Column('details',       postgresql.JSON),
        sa.Column('created_at',    sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_table('audit_logs')
    op.drop_table('matching_weights')
    op.drop_table('payments')
    op.drop_table('certificates')
    op.drop_table('referrals')
    op.drop_table('agent_points')
    op.drop_table('matches')
    op.drop_table('applications')
    op.drop_table('jobs')
    op.drop_table('spotters')
    op.drop_table('agents')
    op.drop_table('organizations')
    op.drop_table('job_seekers')
    op.drop_table('users')
