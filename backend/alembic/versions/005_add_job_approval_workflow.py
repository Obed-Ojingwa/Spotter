"""add job approval workflow fields

Revision ID: 005
Revises: 004
Create Date: 2026-04-29 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "005"
down_revision = "004"
branch_labels = None
dependencies = None


def upgrade() -> None:
    # Add new columns for job approval workflow
    op.add_column("jobs", sa.Column("approved_by", sa.UUID(), nullable=True))
    op.add_column("jobs", sa.Column("rejected_by", sa.UUID(), nullable=True))
    op.add_column("jobs", sa.Column("rejection_reason", sa.String(length=500), nullable=True))
    op.add_column("jobs", sa.Column("approved_at", sa.DateTime(), nullable=True))

    # Create foreign key constraints for approval tracking
    op.create_foreign_key(
        "fk_jobs_approved_by_users",
        "jobs",
        "users",
        ["approved_by"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_jobs_rejected_by_users",
        "jobs",
        "users",
        ["rejected_by"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_jobs_rejected_by_users", "jobs", type_="foreignkey")
    op.drop_constraint("fk_jobs_approved_by_users", "jobs", type_="foreignkey")
    op.drop_column("jobs", "approved_at")
    op.drop_column("jobs", "rejection_reason")
    op.drop_column("jobs", "rejected_by")
    op.drop_column("jobs", "approved_by")
