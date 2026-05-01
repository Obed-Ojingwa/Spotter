"""Add agent registration tracking to organizations

Revision ID: 006_add_agent_org_registration
Revises: 005_add_job_approval_workflow
Create Date: 2026-05-01 22:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    # Add registered_by_agent_id column to organizations table
    op.add_column(
        'organizations',
        sa.Column(
            'registered_by_agent_id',
            postgresql.UUID(as_uuid=True),
            nullable=True
        )
    )

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_organizations_registered_by_agent',
        'organizations',
        'agents',
        ['registered_by_agent_id'],
        ['id']
    )


def downgrade():
    # Remove foreign key constraint
    op.drop_constraint(
        'fk_organizations_registered_by_agent',
        'organizations',
        type_='foreignkey'
    )

    # Remove column
    op.drop_column('organizations', 'registered_by_agent_id')