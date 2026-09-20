from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field


class VisitorLogCreateRequest(BaseModel):
    session_id: str = Field(
        ...,
        min_length=8,
        max_length=255,
    )

    visited_page: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )


class VisitorLogResponse(BaseModel):
    id: int

    session_id: str

    ip_address: str | None = None

    browser: str | None = None

    operating_system: str | None = None

    visited_page: str

    visited_at: datetime

    user_id: int | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


class VisitorLogCreateResponse(BaseModel):
    success: bool

    message: str

    visitor_log: VisitorLogResponse