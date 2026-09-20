from pydantic import BaseModel
from pydantic import Field


# =====================================================
# MONTH ARCHIVE ITEM
# =====================================================

class CollectionMonthResponse(
    BaseModel
):

    month: int = Field(
        ge=1,
        le=12,
    )

    month_name: str = Field(
        min_length=1,
    )

    short_name: str = Field(
        min_length=1,
    )

    has_cases: bool = False

    case_count: int = Field(
        default=0,
        ge=0,
    )


# =====================================================
# YEAR ARCHIVE ITEM
# =====================================================

class CollectionYearResponse(
    BaseModel
):

    year: int = Field(
        ge=1900,
        le=2100,
    )

    has_cases: bool = False

    case_count: int = Field(
        default=0,
        ge=0,
    )

    months: list[
        CollectionMonthResponse
    ] = Field(
        default_factory=list,
    )


# =====================================================
# COMPLETE ARCHIVE RESPONSE
# =====================================================

class CaseCollectionArchiveResponse(
    BaseModel
):

    start_year: int = Field(
        ge=1900,
        le=2100,
    )

    end_year: int = Field(
        ge=1900,
        le=2100,
    )

    dataset_path: str = Field(
        min_length=1,
    )

    total_available_cases: int = Field(
        default=0,
        ge=0,
    )

    years: list[
        CollectionYearResponse
    ] = Field(
        default_factory=list,
    )


# =====================================================
# CASE ITEM INSIDE SELECTED MONTH
# =====================================================

class CollectionCaseResponse(
    BaseModel
):

    id: str = Field(
        min_length=1,
    )

    title: str = Field(
        min_length=1,
    )

    case_type: str | None = None

    case_number: str = Field(
        min_length=1,
    )

    division: str | None = None

    ponencia: str | None = None

    decision_date: str | None = None

    pdf_filename: str = Field(
        min_length=1,
    )

    pdf_url: str = Field(
        min_length=1,
    )

    file_size: int = Field(
        default=0,
        ge=0,
    )

    is_indexed: bool = False

    import_status: str


# =====================================================
# SELECTED MONTH RESPONSE
# =====================================================

class CollectionMonthCasesResponse(
    BaseModel
):

    year: int = Field(
        ge=1900,
        le=2100,
    )

    month: int = Field(
        ge=1,
        le=12,
    )

    month_name: str = Field(
        min_length=1,
    )

    case_count: int = Field(
        default=0,
        ge=0,
    )

    cases: list[
        CollectionCaseResponse
    ] = Field(
        default_factory=list,
    )