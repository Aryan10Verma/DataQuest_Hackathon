"""where people live, and students' "Where you live" answers

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-08 10:30:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003"
down_revision: str | Sequence[str] | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("region_code", sa.String(length=20), nullable=True))
        batch.add_column(sa.Column("pincode", sa.String(length=6), nullable=True))
        batch.add_column(
            sa.Column("place", sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_column("place")
        batch.drop_column("pincode")
        batch.drop_column("region_code")
