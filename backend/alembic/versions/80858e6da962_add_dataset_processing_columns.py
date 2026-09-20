"""add dataset processing columns

Revision ID: 80858e6da962
Revises: cb3a66f50b04
Create Date: 2026-07-31 12:21:35.670783

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '80858e6da962'
down_revision: Union[str, Sequence[str], None] = 'cb3a66f50b04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "dataset_files",
        sa.Column(
            "current_stage",
            sa.String(length=50),
            nullable=True,
        ),
    )

    op.add_column(
        "dataset_files",
        sa.Column(
            "processing_attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    op.add_column(
        "dataset_files",
        sa.Column(
            "last_processed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "dataset_files",
        "last_processed_at",
    )

    op.drop_column(
        "dataset_files",
        "processing_attempts",
    )

    op.drop_column(
        "dataset_files",
        "current_stage",
    )