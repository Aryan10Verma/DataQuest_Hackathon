"""widen columns that now hold encrypted text

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-07 22:30:00

Phone numbers and outcome notes are encrypted by the application (app.core.crypto); the ciphertext
is longer than the text. Existing plain values stay readable and are encrypted on their next save.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COLUMNS = (("users", "phone", 20, 200), ("outcomes", "chosen_pathway_text", 200, 500), ("outcomes", "notes", 500, 1000))


def upgrade() -> None:
    for table, column, old, new in COLUMNS:
        with op.batch_alter_table(table) as batch:
            batch.alter_column(column, type_=sa.String(length=new), existing_type=sa.String(length=old))


def downgrade() -> None:
    for table, column, new, old in COLUMNS:
        with op.batch_alter_table(table) as batch:
            batch.alter_column(column, type_=sa.String(length=new), existing_type=sa.String(length=old))
