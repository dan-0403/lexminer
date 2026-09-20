from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import EmailStr
from pydantic import Field


class UserProfileResponse(
    BaseModel
):

    id: int

    first_name: str

    last_name: str

    email: EmailStr

    profile_picture: str | None = None

    auth_provider: str

    role: str

    is_active: bool

    is_verified: bool

    created_at: datetime

    updated_at: datetime

    last_login_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


class UpdateUserProfileRequest(
    BaseModel
):

    first_name: str = Field(
        min_length=1,
        max_length=100,
    )

    last_name: str = Field(
        min_length=1,
        max_length=100,
    )


class ProfilePictureResponse(
    BaseModel
):

    profile_picture: str | None = None

    message: str