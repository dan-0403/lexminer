"""create dataset import jobs

Revision ID: 60dd232e96a8
Revises: 49d2d05fb40f
Create Date: 2026-08-02 02:41:16.095854
"""

from typing import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# Revision identifiers, used by Alembic.
revision: str = "60dd232e96a8"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "49d2d05fb40f"

branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None

depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


IMPORT_JOB_STATUS_ENUM_NAME = (
    "dataset_import_job_status_enum"
)


def upgrade() -> None:
    """Create the dataset import jobs table."""

    import_job_status_enum = (
        postgresql.ENUM(
            "QUEUED",
            "RUNNING",
            "COMPLETED",
            "COMPLETED_WITH_ERRORS",
            "FAILED",
            "CANCELLED",
            name=IMPORT_JOB_STATUS_ENUM_NAME,
            create_type=False,
        )
    )

    import_job_status_enum.create(
        op.get_bind(),
        checkfirst=True,
    )

    op.create_table(
        "dataset_import_jobs",

        sa.Column(
            "id",
            postgresql.UUID(
                as_uuid=True,
            ),
            nullable=False,
        ),

        sa.Column(
            "status",
            import_job_status_enum,
            nullable=False,
            server_default=sa.text(
                "'QUEUED'"
            ),
        ),

        sa.Column(
            "current_stage",
            sa.String(
                length=100,
            ),
            nullable=False,
            server_default=sa.text(
                "'QUEUED'"
            ),
        ),

        sa.Column(
            "current_filename",
            sa.String(
                length=500,
            ),
            nullable=True,
        ),

        sa.Column(
            "total_files",
            sa.Integer(),
            nullable=False,
            server_default=sa.text(
                "0"
            ),
        ),

        sa.Column(
            "processed_files",
            sa.Integer(),
            nullable=False,
            server_default=sa.text(
                "0"
            ),
        ),

        sa.Column(
            "completed_files",
            sa.Integer(),
            nullable=False,
            server_default=sa.text(
                "0"
            ),
        ),

        sa.Column(
            "failed_files",
            sa.Integer(),
            nullable=False,
            server_default=sa.text(
                "0"
            ),
        ),

        sa.Column(
            "skipped_files",
            sa.Integer(),
            nullable=False,
            server_default=sa.text(
                "0"
            ),
        ),

        sa.Column(
            "progress_percentage",
            sa.Float(),
            nullable=False,
            server_default=sa.text(
                "0"
            ),
        ),

        sa.Column(
            "estimated_seconds_remaining",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "average_seconds_per_file",
            sa.Float(),
            nullable=True,
        ),

        sa.Column(
            "error_message",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "started_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=True,
        ),

        sa.Column(
            "estimated_finish_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=True,
        ),

        sa.Column(
            "finished_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True,
            ),
            server_default=sa.text(
                "now()"
            ),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(
                timezone=True,
            ),
            server_default=sa.text(
                "now()"
            ),
            nullable=False,
        ),

        sa.PrimaryKeyConstraint(
            "id",
            name=(
                "pk_dataset_import_jobs"
            ),
        ),
    )

    op.create_index(
        "ix_dataset_import_jobs_status",
        "dataset_import_jobs",
        [
            "status",
        ],
        unique=False,
    )


def downgrade() -> None:
    """Remove the dataset import jobs table."""

    op.drop_index(
        "ix_dataset_import_jobs_status",
        table_name=(
            "dataset_import_jobs"
        ),
    )

    op.drop_table(
        "dataset_import_jobs"
    )

    import_job_status_enum = (
        postgresql.ENUM(
            name=(
                IMPORT_JOB_STATUS_ENUM_NAME
            ),
        )
    )

    import_job_status_enum.drop(
        op.get_bind(),
        checkfirst=True,
    )