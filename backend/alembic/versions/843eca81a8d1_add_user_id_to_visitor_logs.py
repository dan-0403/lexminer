"""add user_id to visitor_logs

Revision ID: 843eca81a8d1
Revises: 4a4749778ee5
Create Date: 2026-07-30 18:22:21.467512

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '843eca81a8d1'
down_revision: Union[str, Sequence[str], None] = '4a4749778ee5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():

    op.add_column(
        "visitor_logs",
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_visitor_logs_user_id",
        "visitor_logs",
        "users",
        ["user_id"],
        ["id"],
    )


def downgrade():

    op.drop_constraint(
        "fk_visitor_logs_user_id",
        "visitor_logs",
        type_="foreignkey",
    )

    op.drop_column(
        "visitor_logs",
        "user_id",
    )