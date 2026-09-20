import uuid

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    Integer,
    String,
    Text,
)

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base
from app.enums import ImportJobStatus


class DatasetImportJob(Base):

    __tablename__ = (
        "dataset_import_jobs"
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    status = Column(
        Enum(
            ImportJobStatus,
            name=(
                "dataset_import_job_"
                "status_enum"
            ),
        ),
        nullable=False,
        default=(
            ImportJobStatus.QUEUED
        ),
        index=True,
    )

    current_stage = Column(
        String(100),
        nullable=False,
        default="QUEUED",
    )

    current_filename = Column(
        String(500),
        nullable=True,
    )

    total_files = Column(
        Integer,
        nullable=False,
        default=0,
    )

    processed_files = Column(
        Integer,
        nullable=False,
        default=0,
    )

    completed_files = Column(
        Integer,
        nullable=False,
        default=0,
    )

    failed_files = Column(
        Integer,
        nullable=False,
        default=0,
    )

    skipped_files = Column(
        Integer,
        nullable=False,
        default=0,
    )

    progress_percentage = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    estimated_seconds_remaining = (
        Column(
            Integer,
            nullable=True,
        )
    )

    average_seconds_per_file = Column(
        Float,
        nullable=True,
    )

    error_message = Column(
        Text,
        nullable=True,
    )

    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    estimated_finish_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    finished_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )