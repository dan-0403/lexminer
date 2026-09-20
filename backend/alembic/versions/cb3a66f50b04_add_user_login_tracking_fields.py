"""add user login tracking fields

Revision ID: cb3a66f50b04
Revises: 3c8cb78718f1
Create Date: 2026-07-31 07:47:11.679029
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# Revision identifiers used by Alembic.
revision: str = "cb3a66f50b04"
down_revision: Union[str, Sequence[str], None] = "3c8cb78718f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add login tracking fields to the users table.
    """

    auth_provider_enum = postgresql.ENUM(
        "LOCAL",
        "GOOGLE",
        name="authprovider",
        create_type=False,
    )

    op.add_column(
        "users",
        sa.Column(
            "login_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "last_login_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "last_login_provider",
            auth_provider_enum,
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "last_logout_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """
    Remove login tracking fields from the users table.
    """

    op.drop_column(
        "users",
        "last_logout_at",
    )

    op.drop_column(
        "users",
        "last_login_provider",
    )

    op.drop_column(
        "users",
        "last_login_at",
    )

    op.drop_column(
        "users",
        "login_count",
    )