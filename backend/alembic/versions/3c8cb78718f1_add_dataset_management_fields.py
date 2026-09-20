"""add dataset management fields

Revision ID: 3c8cb78718f1
Revises: 843eca81a8d1
Create Date: 2026-07-30 19:47:07.834964

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c8cb78718f1'
down_revision: Union[str, Sequence[str], None] = '843eca81a8d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():

    # ----------------------------------------
    # Rename existing enum
    # ----------------------------------------

    op.execute(
        "ALTER TYPE import_status_enum "
        "RENAME TO import_status_enum_old"
    )

    # ----------------------------------------
    # Create new enum
    # ----------------------------------------

    new_enum = sa.Enum(
        "PENDING",
        "EXTRACTING",
        "CLEANING",
        "CHUNKING",
        "INDEXING",
        "COMPLETED",
        "FAILED",
        name="import_status_enum",
    )

    new_enum.create(op.get_bind())

    # ----------------------------------------
    # Convert column
    # ----------------------------------------

    op.execute(
        """
        ALTER TABLE dataset_files

        ALTER COLUMN import_status

        TYPE import_status_enum

        USING (

            CASE import_status::text

                WHEN 'PROCESSING'
                    THEN 'EXTRACTING'

                WHEN 'INDEXED'
                    THEN 'COMPLETED'

                ELSE import_status::text

            END

        )::import_status_enum
        """
    )

    # ----------------------------------------
    # Drop old enum
    # ----------------------------------------

    op.execute(
        "DROP TYPE import_status_enum_old"
    )


def downgrade():

    # ----------------------------------------
    # Rename current enum
    # ----------------------------------------

    op.execute(
        "ALTER TYPE import_status_enum "
        "RENAME TO import_status_enum_new"
    )

    # ----------------------------------------
    # Recreate original enum
    # ----------------------------------------

    old_enum = sa.Enum(
        "PENDING",
        "PROCESSING",
        "INDEXED",
        "FAILED",
        name="import_status_enum",
    )

    old_enum.create(op.get_bind())

    # ----------------------------------------
    # Convert column back
    # ----------------------------------------

    op.execute(
        """
        ALTER TABLE dataset_files

        ALTER COLUMN import_status

        TYPE import_status_enum

        USING (

            CASE import_status::text

                WHEN 'EXTRACTING'
                    THEN 'PROCESSING'

                WHEN 'CLEANING'
                    THEN 'PROCESSING'

                WHEN 'CHUNKING'
                    THEN 'PROCESSING'

                WHEN 'INDEXING'
                    THEN 'PROCESSING'

                WHEN 'COMPLETED'
                    THEN 'INDEXED'

                ELSE import_status::text

            END

        )::import_status_enum
        """
    )

    # ----------------------------------------
    # Drop temporary enum
    # ----------------------------------------

    op.execute(
        "DROP TYPE import_status_enum_new"
    )