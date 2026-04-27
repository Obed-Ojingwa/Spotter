"""add optional job matching preference fields

Revision ID: 004
Revises: 003
Create Date: 2026-04-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "004"
down_revision = "003"
branch_labels = None
dependencies = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("required_desired_job", sa.String(length=255), nullable=True))
    op.add_column("jobs", sa.Column("required_nysc_status", sa.String(length=50), nullable=True))
    op.add_column("jobs", sa.Column("required_state_of_origin", sa.String(length=100), nullable=True))
    op.add_column("jobs", sa.Column("required_tribe", sa.String(length=100), nullable=True))
    op.add_column("jobs", sa.Column("required_languages_spoken", sa.JSON(), nullable=True))
    op.add_column("jobs", sa.Column("required_skin_complexion", sa.String(length=50), nullable=True))
    op.add_column("jobs", sa.Column("required_physical_attributes", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("required_professional_qualification", sa.String(length=255), nullable=True))
    op.add_column("jobs", sa.Column("required_school_attended", sa.String(length=255), nullable=True))
    op.add_column("jobs", sa.Column("required_course_studied", sa.String(length=255), nullable=True))
    op.add_column("jobs", sa.Column("required_writing_skill", sa.String(length=20), nullable=True))
    op.add_column("jobs", sa.Column("required_speaking_skill", sa.String(length=20), nullable=True))
    op.add_column("jobs", sa.Column("required_communication_skill", sa.String(length=20), nullable=True))
    op.add_column("jobs", sa.Column("required_work_attitude", sa.String(length=20), nullable=True))
    op.add_column("jobs", sa.Column("required_reliability_consistency", sa.String(length=20), nullable=True))
    op.add_column("jobs", sa.Column("required_emotional_intelligence", sa.String(length=20), nullable=True))
    op.add_column("jobs", sa.Column("required_learning_ability", sa.String(length=20), nullable=True))
    op.add_column("jobs", sa.Column("required_charisma", sa.String(length=20), nullable=True))
    op.add_column("jobs", sa.Column("required_dress_sense", sa.String(length=20), nullable=True))
    op.add_column("jobs", sa.Column("required_motivational_drive", sa.String(length=20), nullable=True))
    op.add_column("jobs", sa.Column("required_location", sa.String(length=255), nullable=True))
    op.add_column("jobs", sa.Column("required_proximity", sa.String(length=100), nullable=True))
    op.add_column("jobs", sa.Column("required_track_record", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "required_track_record")
    op.drop_column("jobs", "required_proximity")
    op.drop_column("jobs", "required_location")
    op.drop_column("jobs", "required_motivational_drive")
    op.drop_column("jobs", "required_dress_sense")
    op.drop_column("jobs", "required_charisma")
    op.drop_column("jobs", "required_learning_ability")
    op.drop_column("jobs", "required_emotional_intelligence")
    op.drop_column("jobs", "required_reliability_consistency")
    op.drop_column("jobs", "required_work_attitude")
    op.drop_column("jobs", "required_communication_skill")
    op.drop_column("jobs", "required_speaking_skill")
    op.drop_column("jobs", "required_writing_skill")
    op.drop_column("jobs", "required_course_studied")
    op.drop_column("jobs", "required_school_attended")
    op.drop_column("jobs", "required_professional_qualification")
    op.drop_column("jobs", "required_physical_attributes")
    op.drop_column("jobs", "required_skin_complexion")
    op.drop_column("jobs", "required_languages_spoken")
    op.drop_column("jobs", "required_tribe")
    op.drop_column("jobs", "required_state_of_origin")
    op.drop_column("jobs", "required_nysc_status")
    op.drop_column("jobs", "required_desired_job")
