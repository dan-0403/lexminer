from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# =====================================================
# PUBLIC REQUEST
# =====================================================

class VisitorLogCreateRequest(BaseModel):
    """
    Request body sent by the frontend whenever a page
    is visited.
    """

    session_id: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Unique visitor session identifier.",
    )

    visited_page: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Page visited by the user.",
    )


# =====================================================
# ADMIN RESPONSE
# =====================================================

class VisitorLogResponse(BaseModel):
    """
    Single visitor log returned to the administrator.
    """

    id: int

    session_id: str

    user_id: int | None = None

    ip_address: str

    browser: str

    operating_system: str

    visited_page: str

    visited_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# ADMIN LIST RESPONSE
# =====================================================

class VisitorLogListResponse(BaseModel):
    """
    Paginated visitor log list.
    """

    total_page_visits: int

    skip: int

    limit: int

    logs: list[VisitorLogResponse]


# =====================================================
# ANALYTICS
# =====================================================

class PageStatistic(BaseModel):

    page: str

    visits: int


class BrowserStatistic(BaseModel):

    browser: str

    visits: int


class OperatingSystemStatistic(BaseModel):

    operating_system: str

    visits: int


class VisitorAnalyticsResponse(BaseModel):
    """
    Visitor analytics displayed on the admin dashboard.
    """

    total_page_visits: int

    unique_visitors: int

    today_page_visits: int

    today_unique_visitors: int

    top_pages: list[PageStatistic]

    top_browsers: list[BrowserStatistic]

    top_operating_systems: list[
        OperatingSystemStatistic
    ]


# =====================================================
# CLEANUP RESPONSE
# =====================================================

class VisitorLogCleanupResponse(BaseModel):
    """
    Response after deleting old visitor logs.
    """

    deleted_logs: int

    message: str