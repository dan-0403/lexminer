import re
from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


class AdminProfileResponse(BaseModel):

    id: int

    first_name: str

    last_name: str

    email: EmailStr

    profile_picture: str | None = None

    role: str

    auth_provider: str

    is_active: bool

    is_verified: bool

    is_locked: bool

    last_login_at: datetime | None = None

    last_logout_at: datetime | None = None

    last_login_provider: str | None = None

    failed_login_attempts: int = 0

    login_count: int = 0

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class AdminProfileUpdateRequest(BaseModel):

    first_name: str = Field(
        min_length=1,
        max_length=100,
    )

    last_name: str = Field(
        min_length=1,
        max_length=100,
    )

    email: EmailStr

    @field_validator(
        "first_name",
        "last_name",
    )
    @classmethod
    def validate_name(
        cls,
        value: str,
    ) -> str:

        normalized_value = value.strip()

        if not normalized_value:
            raise ValueError(
                "Name cannot be empty."
            )

        if not re.fullmatch(
            r"[A-Za-zÀ-ÖØ-öø-ÿÑñ\s'.-]+",
            normalized_value,
        ):
            raise ValueError(
                "Name contains invalid characters."
            )

        return normalized_value


class AdminProfileUpdateResponse(
    AdminProfileResponse
):

    message: str


class AdminPasswordUpdateRequest(BaseModel):

    current_password: str = Field(
        min_length=1,
        max_length=128,
    )

    new_password: str = Field(
        min_length=8,
        max_length=72,
    )

    confirm_password: str = Field(
        min_length=8,
        max_length=72,
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password(
        cls,
        value: str,
    ) -> str:

        if not any(
            character.isupper()
            for character in value
        ):
            raise ValueError(
                "Password must contain at least "
                "one uppercase letter."
            )

        if not any(
            character.islower()
            for character in value
        ):
            raise ValueError(
                "Password must contain at least "
                "one lowercase letter."
            )

        if not any(
            character.isdigit()
            for character in value
        ):
            raise ValueError(
                "Password must contain at least "
                "one number."
            )

        if not any(
            not character.isalnum()
            for character in value
        ):
            raise ValueError(
                "Password must contain at least "
                "one special character."
            )

        return value


class AdminPasswordUpdateResponse(BaseModel):

    message: str