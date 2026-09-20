import uuid

from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from app.enums import ImportStatus


# =====================================================
# DATASET LIST ITEM
# =====================================================

class DatasetListItemResponse(BaseModel):

    id: uuid.UUID

    filename: str

    year: int

    month: str

    file_size: int

    import_status: ImportStatus

    current_stage: str | None = None

    error_message: str | None = None

    chunk_count: int

    is_indexed: bool

    processing_attempts: int

    imported_at: datetime

    indexed_at: datetime | None = None

    last_processed_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# DATASET LIST RESPONSE
# =====================================================

class DatasetListResponse(BaseModel):

    total: int

    skip: int

    limit: int

    datasets: list[DatasetListItemResponse]


# =====================================================
# DATASET DETAIL RESPONSE
# =====================================================

class DatasetDetailResponse(BaseModel):

    id: uuid.UUID

    filename: str

    file_path: str

    year: int

    month: str

    file_size: int

    import_status: ImportStatus

    current_stage: str | None = None

    error_message: str | None = None

    chunk_count: int

    is_indexed: bool

    processing_attempts: int

    imported_at: datetime

    indexed_at: datetime | None = None

    last_processed_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# PROCESS / RETRY RESPONSE
# =====================================================

class DatasetActionResponse(BaseModel):

    dataset_id: uuid.UUID

    import_status: ImportStatus

    message: str


# =====================================================
# DELETE RESPONSE
# =====================================================

class DatasetDeleteResponse(BaseModel):

    dataset_id: uuid.UUID

    deleted_chunks: int = Field(
        default=0,
        ge=0,
    )

    deleted_vectors: int = Field(
        default=0,
        ge=0,
    )

    deleted_case: bool

    deleted_file: bool

    message: str

    # =====================================================
# PENDING UPLOADED FILE
# =====================================================

class PendingDatasetFileResponse(BaseModel):

    filename: str

    file_path: str

    year: int

    month: str

    file_size: int = Field(
        ge=0,
    )

    status: str = "PENDING"

    is_registered: bool = False

    uploaded_at: datetime | None = None


# =====================================================
# FAILED DATASET ITEM
# =====================================================

class FailedDatasetResponse(BaseModel):

    id: uuid.UUID

    filename: str

    file_path: str

    year: int

    month: str

    file_size: int = Field(
        ge=0,
    )

    import_status: ImportStatus

    current_stage: str | None = None

    error_message: str | None = None

    chunk_count: int = Field(
        default=0,
        ge=0,
    )

    is_indexed: bool

    processing_attempts: int = Field(
        default=0,
        ge=0,
    )

    imported_at: datetime

    indexed_at: datetime | None = None

    last_processed_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# DATASET QUEUE ITEM
# =====================================================

class DatasetQueueItemResponse(BaseModel):

    key: str

    dataset_id: uuid.UUID | None = None

    filename: str

    file_path: str

    year: int

    month: str

    file_size: int = Field(
        default=0,
        ge=0,
    )

    queue_status: str

    import_status: ImportStatus | None = None

    current_stage: str | None = None

    error_message: str | None = None

    chunk_count: int = Field(
        default=0,
        ge=0,
    )

    is_indexed: bool = False

    processing_attempts: int = Field(
        default=0,
        ge=0,
    )

    uploaded_at: datetime | None = None

    imported_at: datetime | None = None

    last_processed_at: datetime | None = None


# =====================================================
# DATASET QUEUE SUMMARY
# =====================================================

class DatasetQueueSummaryResponse(BaseModel):

    pending: int = Field(
        default=0,
        ge=0,
    )

    failed: int = Field(
        default=0,
        ge=0,
    )

    total: int = Field(
        default=0,
        ge=0,
    )


# =====================================================
# PAGINATED DATASET QUEUE
# =====================================================

class DatasetQueueResponse(BaseModel):

    summary: DatasetQueueSummaryResponse

    total: int = Field(
        default=0,
        ge=0,
    )

    skip: int = Field(
        default=0,
        ge=0,
    )

    limit: int = Field(
        default=25,
        ge=1,
        le=100,
    )

    items: list[
        DatasetQueueItemResponse
    ]