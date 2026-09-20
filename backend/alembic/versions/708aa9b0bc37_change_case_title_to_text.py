"""change case title to text

Revision ID: 708aa9b0bc37
Revises: b1da8874881b
Create Date: 2026-08-03 23:15:35.279251

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '708aa9b0bc37'
down_revision: Union[str, Sequence[str], None] = 'b1da8874881b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "cases",
        "title",
        existing_type=sa.String(length=500),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "cases",
        "title",
        existing_type=sa.Text(),
        type_=sa.String(length=500),
        existing_nullable=False,
    )
