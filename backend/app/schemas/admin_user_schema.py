from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.enums.auth_provider import AuthProvider
from app.enums.role import Role


class AdminUserResponse(BaseModel):

    id: int
    first_name: str
    last_name: str
    email: EmailStr
    profile_picture: str | None

    auth_provider: AuthProvider
    role: Role

    is_active: bool
    is_verified: bool
    is_locked: bool

    locked_until: datetime | None
    failed_login_attempts: int
    deleted_at: datetime | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class AdminUserListResponse(BaseModel):

    total: int
    skip: int
    limit: int
    users: list[AdminUserResponse]