"""add missing dataset file columns

Revision ID: 49d2d05fb40f
Revises: 80858e6da962
Create Date: 2026-07-31 12:31:12.159821

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49d2d05fb40f'
down_revision: Union[str, Sequence[str], None] = '80858e6da962'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "dataset_files",
        sa.Column(
            "error_message",
            sa.Text(),
            nullable=True,
        ),
    )

    op.add_column(
        "dataset_files",
        sa.Column(
            "chunk_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    op.add_column(
        "dataset_files",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade():
    op.drop_column("dataset_files", "updated_at")
    op.drop_column("dataset_files", "chunk_count")
    op.drop_column("dataset_files", "error_message")