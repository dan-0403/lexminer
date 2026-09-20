"""create bookmarks table

Revision ID: 92b263453672
Revises: 708aa9b0bc37
Create Date: 2026-08-06 21:47:28.367013

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '92b263453672'
down_revision: Union[str, Sequence[str], None] = '708aa9b0bc37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bookmarks",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "case_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=(
                sa.text("now()")
            ),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            [
                "case_id",
            ],
            [
                "cases.id",
            ],
            name=(
                "fk_bookmarks_case_id_cases"
            ),
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            [
                "user_id",
            ],
            [
                "users.id",
            ],
            name=(
                "fk_bookmarks_user_id_users"
            ),
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint(
            "id",
            name=(
                "pk_bookmarks"
            ),
        ),

        sa.UniqueConstraint(
            "user_id",
            "case_id",
            name=(
                "uq_bookmarks_user_case"
            ),
        ),
    )

    op.create_index(
        op.f(
            "ix_bookmarks_id"
        ),
        "bookmarks",
        [
            "id",
        ],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_bookmarks_user_id"
        ),
        "bookmarks",
        [
            "user_id",
        ],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_bookmarks_case_id"
        ),
        "bookmarks",
        [
            "case_id",
        ],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_bookmarks_created_at"
        ),
        "bookmarks",
        [
            "created_at",
        ],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f(
            "ix_bookmarks_created_at"
        ),
        table_name="bookmarks",
    )

    op.drop_index(
        op.f(
            "ix_bookmarks_case_id"
        ),
        table_name="bookmarks",
    )

    op.drop_index(
        op.f(
            "ix_bookmarks_user_id"
        ),
        table_name="bookmarks",
    )

    op.drop_index(
        op.f(
            "ix_bookmarks_id"
        ),
        table_name="bookmarks",
    )

    op.drop_table(
        "bookmarks"
    )
