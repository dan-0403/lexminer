from datetime import datetime

from pydantic import BaseModel
from pydantic import Field


class BookmarkCaseResponse(
    BaseModel
):
    id: int

    title: str

    case_number: str

    year: int | None = None

    month: str | None = None

    decision_date: str | None = None

    division: str | None = None

    ponencia: str | None = None

    case_type: str | None = None

    pdf_url: str | None = None


class BookmarkItemResponse(
    BaseModel
):
    id: int

    bookmarked_at: datetime

    case: BookmarkCaseResponse


class BookmarkListResponse(
    BaseModel
):
    page: int = Field(
        ge=1,
    )

    page_size: int = Field(
        ge=1,
    )

    total_items: int = Field(
        ge=0,
    )

    total_pages: int = Field(
        ge=0,
    )

    items: list[
        BookmarkItemResponse
    ] = Field(
        default_factory=list,
    )


class BookmarkMutationResponse(
    BaseModel
):
    bookmarked: bool

    message: str

    bookmark_id: int | None = None


class BookmarkStatusResponse(
    BaseModel
):
    case_id: int

    bookmarked: bool

    bookmark_id: int | None = None

class BookmarkYearsResponse(
    BaseModel
):
    years: list[int] = Field(
        default_factory=list,
    )