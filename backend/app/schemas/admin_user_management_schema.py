import uuid

from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from app.enums import AuthProvider
from app.enums import Role
from pydantic import EmailStr

# =====================================================
# REGISTERED USER LIST ITEM
# =====================================================

class RegisteredUserListItemResponse(
    BaseModel
):

    id: int

    first_name: str

    last_name: str

    email: str

    profile_picture: str | None = None

    auth_provider: AuthProvider

    role: Role

    is_active: bool

    is_verified: bool

    is_locked: bool

    locked_until: datetime | None = None

    failed_login_attempts: int = Field(
        default=0,
        ge=0,
    )

    login_count: int = Field(
        default=0,
        ge=0,
    )

    last_login_at: datetime | None = None

    last_login_provider: (
        AuthProvider | None
    ) = None

    last_logout_at: datetime | None = None

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# REGISTERED USER LIST RESPONSE
# =====================================================

class RegisteredUserListResponse(
    BaseModel
):

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

    users: list[
        RegisteredUserListItemResponse
    ]


# =====================================================
# REGISTERED USER DETAIL RESPONSE
# =====================================================

class RegisteredUserDetailResponse(BaseModel):

    id: int

    first_name: str

    last_name: str

    email: EmailStr

    profile_picture: str | None = None

    auth_provider: AuthProvider

    role: Role

    is_active: bool

    is_verified: bool

    is_locked: bool

    locked_until: datetime | None = None

    failed_login_attempts: int = 0

    login_count: int = 0

    last_login_at: datetime | None = None

    last_login_provider: AuthProvider | None = None

    last_logout_at: datetime | None = None

    deleted_at: datetime | None = None

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# USER ACTION RESPONSE
# =====================================================

class RegisteredUserActionResponse(
    BaseModel
):

    user_id: int

    action: str

    is_active: bool

    is_locked: bool

    message: str


# =====================================================
# USER DELETE RESPONSE
# =====================================================

class RegisteredUserDeleteResponse(
    BaseModel
):

    user_id: int

    deleted: bool

    message: str


# =====================================================
# USER SUMMARY RESPONSE
# =====================================================

class RegisteredUserSummaryResponse(
    BaseModel
):

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

    verified: int = Field(
        default=0,
        ge=0,
    )

    local_accounts: int = Field(
        default=0,
        ge=0,
    )

    google_accounts: int = Field(
        default=0,
        ge=0,
    )


# =====================================================
# GUEST VISITOR LOG ITEM
# =====================================================

class GuestVisitorLogItemResponse(
    BaseModel
):

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


# =====================================================
# GUEST VISITOR LOG LIST RESPONSE
# =====================================================

class GuestVisitorLogListResponse(
    BaseModel
):

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

    logs: list[
        GuestVisitorLogItemResponse
    ]


# =====================================================
# VISITOR ANALYTICS ITEM
# =====================================================

class VisitorAnalyticsItemResponse(
    BaseModel
):

    label: str

    visits: int = Field(
        default=0,
        ge=0,
    )


# =====================================================
# GUEST VISITOR SUMMARY
# =====================================================

class GuestVisitorSummaryResponse(
    BaseModel
):

    total_guest_visits: int = Field(
        default=0,
        ge=0,
    )

    unique_guest_visitors: int = Field(
        default=0,
        ge=0,
    )

    today_guest_visits: int = Field(
        default=0,
        ge=0,
    )

    today_unique_guest_visitors: int = Field(
        default=0,
        ge=0,
    )

    top_pages: list[
        VisitorAnalyticsItemResponse
    ]

    top_browsers: list[
        VisitorAnalyticsItemResponse
    ]

    top_operating_systems: list[
        VisitorAnalyticsItemResponse
    ]


# =====================================================
# COMPLETE USER MANAGEMENT DASHBOARD RESPONSE
# =====================================================

class AdminUserManagementSummaryResponse(
    BaseModel
):

    registered_users: (
        RegisteredUserSummaryResponse
    )

    guest_visitors: (
        GuestVisitorSummaryResponse
    )