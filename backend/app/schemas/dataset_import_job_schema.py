import uuid

from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from app.enums import ImportJobStatus


class DatasetImportJobCreateResponse(
    BaseModel
):

    job_id: uuid.UUID

    status: ImportJobStatus

    message: str


class DatasetImportJobResponse(
    BaseModel
):

    id: uuid.UUID

    status: ImportJobStatus

    current_stage: str

    current_filename: str | None = None

    total_files: int = Field(
        default=0,
        ge=0,
    )

    processed_files: int = Field(
        default=0,
        ge=0,
    )

    completed_files: int = Field(
        default=0,
        ge=0,
    )

    failed_files: int = Field(
        default=0,
        ge=0,
    )

    skipped_files: int = Field(
        default=0,
        ge=0,
    )

    progress_percentage: float = Field(
        default=0,
        ge=0,
        le=100,
    )

    estimated_seconds_remaining: (
        int | None
    ) = None

    average_seconds_per_file: (
        float | None
    ) = None

    error_message: str | None = None

    started_at: datetime | None = None

    estimated_finish_at: (
        datetime | None
    ) = None

    finished_at: datetime | None = None

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )