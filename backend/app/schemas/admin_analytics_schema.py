from pydantic import BaseModel
from pydantic import Field


class UserAnalyticsResponse(BaseModel):

    total: int = Field(
        default=0,
        ge=0,
    )

    active: int = Field(
        default=0,
        ge=0,
    )

    inactive: int = Field(
        default=0,
        ge=0,
    )

    locked: int = Field(
        default=0,
        ge=0,
    )


class VisitorAnalyticsResponse(BaseModel):

    total_page_visits: int = Field(
        default=0,
        ge=0,
    )

    unique_visitors: int = Field(
        default=0,
        ge=0,
    )


class DatasetAnalyticsResponse(BaseModel):

    total: int = Field(
        default=0,
        ge=0,
    )

    completed: int = Field(
        default=0,
        ge=0,
    )

    pending: int = Field(
        default=0,
        ge=0,
    )

    failed: int = Field(
        default=0,
        ge=0,
    )

    processing: int = Field(
        default=0,
        ge=0,
    )

    indexed: int = Field(
        default=0,
        ge=0,
    )

    not_indexed: int = Field(
        default=0,
        ge=0,
    )


class SearchIndexAnalyticsResponse(BaseModel):

    total_cases: int = Field(
        default=0,
        ge=0,
    )

    total_chunks: int = Field(
        default=0,
        ge=0,
    )

    total_vectors: int = Field(
        default=0,
        ge=0,
    )

    vector_sync_difference: int = Field(
        default=0,
        ge=0,
    )

    is_vector_index_synced: bool = False


class MostVisitedPageResponse(BaseModel):

    page_path: str = Field(
        default="Unknown",
        min_length=1,
    )

    visit_count: int = Field(
        default=0,
        ge=0,
    )


class RecentDatasetImportResponse(BaseModel):

    dataset_id: str

    filename: str

    year: int | None = None

    month: str | None = None

    file_size: int = Field(
        default=0,
        ge=0,
    )

    import_status: str

    current_stage: str | None = None

    error_message: str | None = None

    chunk_count: int = Field(
        default=0,
        ge=0,
    )

    processing_attempts: int = Field(
        default=0,
        ge=0,
    )

    is_indexed: bool = False

    imported_at: str | None = None

    indexed_at: str | None = None

    last_processed_at: str | None = None


class AdminAnalyticsResponse(BaseModel):

    users: UserAnalyticsResponse

    visitors: VisitorAnalyticsResponse

    datasets: DatasetAnalyticsResponse

    search_index: SearchIndexAnalyticsResponse

    most_visited_pages: list[
        MostVisitedPageResponse
    ] = Field(
        default_factory=list,
    )

    recent_dataset_imports: list[
        RecentDatasetImportResponse
    ] = Field(
        default_factory=list,
    )