# C:\Users\Melody\Documents\Spotter\backend\alembic\versions\003_seeker_attributes_and_job_requirements.py
"""Add seeker attributes and job requirements fields

Revision ID: 003
Revises: 002
Create Date: 2025-01-01 00:02:00

All columns are nullable — fully backward compatible.
Existing rows will have NULL for all new columns, which is fine.
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('job_seekers', sa.Column('desired_job',               sa.String(255),  nullable=True))
    op.add_column('job_seekers', sa.Column('nysc_status',               sa.String(50),   nullable=True))
    op.add_column('job_seekers', sa.Column('state_of_origin',           sa.String(100),  nullable=True))
    op.add_column('job_seekers', sa.Column('tribe',                     sa.String(100),  nullable=True))
    op.add_column('job_seekers', sa.Column('languages_spoken',          sa.JSON,         nullable=True))
    op.add_column('job_seekers', sa.Column('skin_complexion',           sa.String(50),   nullable=True))
    op.add_column('job_seekers', sa.Column('physical_attributes',       sa.Text,         nullable=True))
    op.add_column('job_seekers', sa.Column('professional_qualification',sa.String(255),  nullable=True))
    op.add_column('job_seekers', sa.Column('school_attended',           sa.String(255),  nullable=True))
    op.add_column('job_seekers', sa.Column('course_studied',            sa.String(255),  nullable=True))
    op.add_column('job_seekers', sa.Column('writing_skill',             sa.String(20),   nullable=True))
    op.add_column('job_seekers', sa.Column('speaking_skill',            sa.String(20),   nullable=True))
    op.add_column('job_seekers', sa.Column('communication_skill',       sa.String(20),   nullable=True))
    op.add_column('job_seekers', sa.Column('work_attitude',             sa.String(20),   nullable=True))
    op.add_column('job_seekers', sa.Column('reliability_consistency',   sa.String(20),   nullable=True))
    op.add_column('job_seekers', sa.Column('emotional_intelligence',    sa.String(20),   nullable=True))
    op.add_column('job_seekers', sa.Column('learning_ability',          sa.String(20),   nullable=True))
    op.add_column('job_seekers', sa.Column('charisma',                  sa.String(20),   nullable=True))
    op.add_column('job_seekers', sa.Column('dress_sense',               sa.String(20),   nullable=True))
    op.add_column('job_seekers', sa.Column('motivational_drive',        sa.String(20),   nullable=True))
    op.add_column('job_seekers', sa.Column('location',                  sa.String(255),  nullable=True))
    op.add_column('job_seekers', sa.Column('proximity',                 sa.String(100),  nullable=True))
    op.add_column('job_seekers', sa.Column('track_record',              sa.Text,         nullable=True))


def downgrade() -> None:
    for col in [
        'desired_job', 'nysc_status', 'state_of_origin', 'tribe',
        'languages_spoken', 'skin_complexion', 'physical_attributes',
        'professional_qualification', 'school_attended', 'course_studied',
        'writing_skill', 'speaking_skill', 'communication_skill',
        'work_attitude', 'reliability_consistency', 'emotional_intelligence',
        'learning_ability', 'charisma', 'dress_sense', 'motivational_drive',
        'location', 'proximity', 'track_record',
    ]:
        op.drop_column('job_seekers', col)





# # C:\Users\Melody\Desktop\spotter_dashboards\spotter\backend\alembic\versions\003_seeker_attributes_and_job_requirements.py
# """Add seeker attributes and job requirements fields

# Revision ID: 003
# Revises: 002
# Create Date: 2025-01-01 00:01:00.000000

# Safe to run on existing databases:
# - Adds optional fields to job_seekers and jobs tables
# - All new fields are nullable, so no data migration needed
# """
# from alembic import op
# import sqlalchemy as sa
# from sqlalchemy.dialects import postgresql

# revision = '003'
# down_revision = '002'
# branch_labels = None
# depends_on = None


# def upgrade() -> None:
#     # Add new columns to job_seekers table
#     op.add_column('job_seekers', sa.Column('desired_job', sa.String(255), nullable=True))
#     op.add_column('job_seekers', sa.Column('age', sa.Integer(), nullable=True))
#     op.add_column('job_seekers', sa.Column('marital_status', sa.String(50), nullable=True))
#     op.add_column('job_seekers', sa.Column('children_count', sa.Integer(), nullable=True))
#     op.add_column('job_seekers', sa.Column('religion', sa.String(100), nullable=True))
#     op.add_column('job_seekers', sa.Column('denomination', sa.String(100), nullable=True))
#     op.add_column('job_seekers', sa.Column('tribe', sa.String(100), nullable=True))
#     op.add_column('job_seekers', sa.Column('state_of_origin', sa.String(100), nullable=True))
#     op.add_column('job_seekers', sa.Column('lga', sa.String(100), nullable=True))
#     op.add_column('job_seekers', sa.Column('height', sa.String(20), nullable=True))
#     op.add_column('job_seekers', sa.Column('weight', sa.String(20), nullable=True))
#     op.add_column('job_seekers', sa.Column('complexion', sa.String(50), nullable=True))
#     op.add_column('job_seekers', sa.Column('physical_attributes', postgresql.JSONB(), nullable=True))
#     op.add_column('job_seekers', sa.Column('personality_traits', postgresql.JSONB(), nullable=True))
#     op.add_column('job_seekers', sa.Column('hobbies', postgresql.JSONB(), nullable=True))
#     op.add_column('job_seekers', sa.Column('languages_spoken', postgresql.JSONB(), nullable=True))
#     op.add_column('job_seekers', sa.Column('professional_certifications', postgresql.JSONB(), nullable=True))
#     op.add_column('job_seekers', sa.Column('years_of_experience', sa.Integer(), nullable=True))
#     op.add_column('job_seekers', sa.Column('current_salary_range', sa.String(50), nullable=True))
#     op.add_column('job_seekers', sa.Column('expected_salary_range', sa.String(50), nullable=True))
#     op.add_column('job_seekers', sa.Column('willing_to_relocate', sa.Boolean(), nullable=True))
#     op.add_column('job_seekers', sa.Column('work_schedule_preference', sa.String(50), nullable=True))
#     op.add_column('job_seekers', sa.Column('remote_work_preference', sa.String(50), nullable=True))
#     op.add_column('job_seekers', sa.Column('nysc_status', sa.String(50), nullable=True))
#     op.add_column('job_seekers', sa.Column('highest_qualification', sa.String(100), nullable=True))
#     op.add_column('job_seekers', sa.Column('field_of_study', sa.String(100), nullable=True))
#     op.add_column('job_seekers', sa.Column('graduation_year', sa.Integer(), nullable=True))
#     op.add_column('job_seekers', sa.Column('gpa', sa.String(10), nullable=True))
#     op.add_column('job_seekers', sa.Column('skills', postgresql.JSONB(), nullable=True))
#     op.add_column('job_seekers', sa.Column('previous_job_titles', postgresql.JSONB(), nullable=True))
#     op.add_column('job_seekers', sa.Column('career_goals', sa.Text(), nullable=True))

#     # Add new columns to jobs table
#     op.add_column('jobs', sa.Column('required_desired_job', sa.String(255), nullable=True))
#     op.add_column('jobs', sa.Column('required_age_min', sa.Integer(), nullable=True))
#     op.add_column('jobs', sa.Column('required_age_max', sa.Integer(), nullable=True))
#     op.add_column('jobs', sa.Column('required_marital_status', sa.String(50), nullable=True))
#     op.add_column('jobs', sa.Column('required_children_count', sa.Integer(), nullable=True))
#     op.add_column('jobs', sa.Column('required_religion', sa.String(100), nullable=True))
#     op.add_column('jobs', sa.Column('required_denomination', sa.String(100), nullable=True))
#     op.add_column('jobs', sa.Column('required_tribe', sa.String(100), nullable=True))
#     op.add_column('jobs', sa.Column('required_state_of_origin', sa.String(100), nullable=True))
#     op.add_column('jobs', sa.Column('required_lga', sa.String(100), nullable=True))
#     op.add_column('jobs', sa.Column('required_height', sa.String(20), nullable=True))
#     op.add_column('jobs', sa.Column('required_weight', sa.String(20), nullable=True))
#     op.add_column('jobs', sa.Column('required_complexion', sa.String(50), nullable=True))
#     op.add_column('jobs', sa.Column('required_physical_attributes', postgresql.JSONB(), nullable=True))
#     op.add_column('jobs', sa.Column('required_personality_traits', postgresql.JSONB(), nullable=True))
#     op.add_column('jobs', sa.Column('required_hobbies', postgresql.JSONB(), nullable=True))
#     op.add_column('jobs', sa.Column('required_languages_spoken', postgresql.JSONB(), nullable=True))
#     op.add_column('jobs', sa.Column('required_professional_certifications', postgresql.JSONB(), nullable=True))
#     op.add_column('jobs', sa.Column('required_years_of_experience', sa.Integer(), nullable=True))
#     op.add_column('jobs', sa.Column('required_current_salary_range', sa.String(50), nullable=True))
#     op.add_column('jobs', sa.Column('required_expected_salary_range', sa.String(50), nullable=True))
#     op.add_column('jobs', sa.Column('required_willing_to_relocate', sa.Boolean(), nullable=True))
#     op.add_column('jobs', sa.Column('required_work_schedule_preference', sa.String(50), nullable=True))
#     op.add_column('jobs', sa.Column('required_remote_work_preference', sa.String(50), nullable=True))
#     op.add_column('jobs', sa.Column('required_nysc_status', sa.String(50), nullable=True))
#     op.add_column('jobs', sa.Column('required_highest_qualification', sa.String(100), nullable=True))
#     op.add_column('jobs', sa.Column('required_field_of_study', sa.String(100), nullable=True))
#     op.add_column('jobs', sa.Column('required_graduation_year', sa.Integer(), nullable=True))
#     op.add_column('jobs', sa.Column('required_gpa', sa.String(10), nullable=True))
#     op.add_column('jobs', sa.Column('required_skills', postgresql.JSONB(), nullable=True))
#     op.add_column('jobs', sa.Column('required_previous_job_titles', postgresql.JSONB(), nullable=True))
#     op.add_column('jobs', sa.Column('required_career_goals', sa.Text(), nullable=True))


# def downgrade() -> None:
#     # Remove columns from jobs table
#     op.drop_column('jobs', 'required_career_goals')
#     op.drop_column('jobs', 'required_previous_job_titles')
#     op.drop_column('jobs', 'required_skills')
#     op.drop_column('jobs', 'required_gpa')
#     op.drop_column('jobs', 'required_graduation_year')
#     op.drop_column('jobs', 'required_field_of_study')
#     op.drop_column('jobs', 'required_highest_qualification')
#     op.drop_column('jobs', 'required_nysc_status')
#     op.drop_column('jobs', 'required_remote_work_preference')
#     op.drop_column('jobs', 'required_work_schedule_preference')
#     op.drop_column('jobs', 'required_willing_to_relocate')
#     op.drop_column('jobs', 'required_expected_salary_range')
#     op.drop_column('jobs', 'required_current_salary_range')
#     op.drop_column('jobs', 'required_years_of_experience')
#     op.drop_column('jobs', 'required_professional_certifications')
#     op.drop_column('jobs', 'required_languages_spoken')
#     op.drop_column('jobs', 'required_hobbies')
#     op.drop_column('jobs', 'required_personality_traits')
#     op.drop_column('jobs', 'required_physical_attributes')
#     op.drop_column('jobs', 'required_complexion')
#     op.drop_column('jobs', 'required_weight')
#     op.drop_column('jobs', 'required_height')
#     op.drop_column('jobs', 'required_lga')
#     op.drop_column('jobs', 'required_state_of_origin')
#     op.drop_column('jobs', 'required_tribe')
#     op.drop_column('jobs', 'required_denomination')
#     op.drop_column('jobs', 'required_religion')
#     op.drop_column('jobs', 'required_children_count')
#     op.drop_column('jobs', 'required_marital_status')
#     op.drop_column('jobs', 'required_age_max')
#     op.drop_column('jobs', 'required_age_min')
#     op.drop_column('jobs', 'required_desired_job')

#     # Remove columns from job_seekers table
#     op.drop_column('job_seekers', 'career_goals')
#     op.drop_column('job_seekers', 'previous_job_titles')
#     op.drop_column('job_seekers', 'skills')
#     op.drop_column('job_seekers', 'gpa')
#     op.drop_column('job_seekers', 'graduation_year')
#     op.drop_column('job_seekers', 'field_of_study')
#     op.drop_column('job_seekers', 'highest_qualification')
#     op.drop_column('job_seekers', 'nysc_status')
#     op.drop_column('job_seekers', 'remote_work_preference')
#     op.drop_column('job_seekers', 'work_schedule_preference')
#     op.drop_column('job_seekers', 'willing_to_relocate')
#     op.drop_column('job_seekers', 'expected_salary_range')
#     op.drop_column('job_seekers', 'current_salary_range')
#     op.drop_column('job_seekers', 'years_of_experience')
#     op.drop_column('job_seekers', 'professional_certifications')
#     op.drop_column('job_seekers', 'languages_spoken')
#     op.drop_column('job_seekers', 'hobbies')
#     op.drop_column('job_seekers', 'personality_traits')
#     op.drop_column('job_seekers', 'physical_attributes')
#     op.drop_column('job_seekers', 'complexion')
#     op.drop_column('job_seekers', 'weight')
#     op.drop_column('job_seekers', 'height')
#     op.drop_column('job_seekers', 'lga')
#     op.drop_column('job_seekers', 'state_of_origin')
#     op.drop_column('job_seekers', 'tribe')
#     op.drop_column('job_seekers', 'denomination')
#     op.drop_column('job_seekers', 'religion')
#     op.drop_column('job_seekers', 'children_count')
#     op.drop_column('job_seekers', 'marital_status')
#     op.drop_column('job_seekers', 'age')
#     op.drop_column('job_seekers', 'desired_job')