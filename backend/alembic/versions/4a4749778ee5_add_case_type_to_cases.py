from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.enums import CaseType


# revision identifiers, used by Alembic.
revision: str = "4a4749778ee5"
down_revision: Union[str, Sequence[str], None] = "11ec5528bd44"
branch_labels = None
depends_on = None


def upgrade() -> None:

    case_type_enum = sa.Enum(
        CaseType,
        name="case_type_enum",
    )

    case_type_enum.create(
        op.get_bind(),
        checkfirst=True,
    )

    op.add_column(
        "cases",
        sa.Column(
            "case_type",
            case_type_enum,
            nullable=False,
        ),
    )


def downgrade() -> None:

    op.drop_column(
        "cases",
        "case_type",
    )

    sa.Enum(
        CaseType,
        name="case_type_enum",
    ).drop(
        op.get_bind(),
        checkfirst=True,
    )