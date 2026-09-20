import re
from uuid import UUID

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import EmailStr
from pydantic import Field
from pydantic import field_validator
from pydantic import model_validator

from app.schemas.user import UserResponse


# ==========================================================
# SHARED MODEL CONFIG
# ==========================================================

ORM_MODEL_CONFIG = ConfigDict(
    from_attributes=True,
)


# ==========================================================
# REGISTRATION PASSWORD VALIDATION
# ==========================================================

def validate_registration_password(
    password: str,
) -> str:
    """
    Validate a registration password without removing
    intentional leading or trailing characters.

    Password requirements:

    - 8 to 128 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    - No whitespace characters
    """

    if not isinstance(
        password,
        str,
    ):
        raise ValueError(
            "Password must be a string."
        )

    if not password:
        raise ValueError(
            "Password is required."
        )

    if len(password) < 8:
        raise ValueError(
            "Password must be at least 8 characters."
        )

    if len(password) > 128:
        raise ValueError(
            "Password cannot exceed 128 characters."
        )

    if re.search(
        r"\s",
        password,
    ):
        raise ValueError(
            "Password must not contain spaces."
        )

    if not re.search(
        r"[A-Z]",
        password,
    ):
        raise ValueError(
            "Password must contain at least one uppercase letter."
        )

    if not re.search(
        r"[a-z]",
        password,
    ):
        raise ValueError(
            "Password must contain at least one lowercase letter."
        )

    if not re.search(
        r"\d",
        password,
    ):
        raise ValueError(
            "Password must contain at least one number."
        )

    if not re.search(
        r"""[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;/']""",
        password,
    ):
        raise ValueError(
            "Password must contain at least one special character."
        )

    return password


# ==========================================================
# STEP 1 — REQUEST EMAIL OTP
# ==========================================================

class RegistrationEmailRequest(
    BaseModel,
):
    email: EmailStr

    @field_validator(
        "email",
        mode="before",
    )
    @classmethod
    def normalize_email(
        cls,
        value,
    ):
        if isinstance(
            value,
            str,
        ):
            return (
                value
                .strip()
                .lower()
            )

        return value


class RegistrationEmailResponse(
    BaseModel,
):
    message: str

    registration_id: UUID

    masked_email: str

    expires_in_seconds: int = Field(
        ...,
        ge=1,
    )

    resend_available_in_seconds: int = Field(
        ...,
        ge=0,
    )

    model_config = ORM_MODEL_CONFIG


# ==========================================================
# STEP 2 — VERIFY EMAIL OTP
# ==========================================================

class RegistrationOTPVerifyRequest(
    BaseModel,
):
    registration_id: UUID

    otp: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
    )

    @field_validator(
        "otp",
        mode="before",
    )
    @classmethod
    def normalize_otp(
        cls,
        value,
    ):
        if isinstance(
            value,
            str,
        ):
            return value.strip()

        return value


class RegistrationOTPVerifyResponse(
    BaseModel,
):
    success: bool

    message: str

    registration_id: UUID

    email_verified: bool

    model_config = ORM_MODEL_CONFIG


# ==========================================================
# RESEND REGISTRATION OTP
# ==========================================================

class RegistrationOTPResendRequest(
    BaseModel,
):
    registration_id: UUID


class RegistrationOTPResendResponse(
    BaseModel,
):
    message: str

    expires_in_seconds: int = Field(
        ...,
        ge=1,
    )

    resend_available_in_seconds: int = Field(
        ...,
        ge=0,
    )

    model_config = ORM_MODEL_CONFIG


# ==========================================================
# STEP 3 AND 4 — COMPLETE REGISTRATION
# ==========================================================

class RegistrationCompleteRequest(
    BaseModel,
):
    registration_id: UUID

    first_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    last_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    confirm_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    @field_validator(
        "first_name",
        "last_name",
        mode="before",
    )
    @classmethod
    def normalize_name(
        cls,
        value,
    ):
        if not isinstance(
            value,
            str,
        ):
            return value

        normalized = " ".join(
            value.strip().split()
        )

        if len(normalized) < 2:
            raise ValueError(
                "Name must contain at least 2 characters."
            )

        if not re.fullmatch(
            r"[A-Za-zÀ-ÖØ-öø-ÿÑñ' .-]+",
            normalized,
        ):
            raise ValueError(
                "Name contains invalid characters."
            )

        return normalized

    @field_validator(
        "password",
    )
    @classmethod
    def validate_password(
        cls,
        password: str,
    ) -> str:
        return validate_registration_password(
            password
        )

    @field_validator(
        "confirm_password",
    )
    @classmethod
    def validate_confirm_password(
        cls,
        confirm_password: str,
    ) -> str:
        if not confirm_password:
            raise ValueError(
                "Password confirmation is required."
            )

        return confirm_password

    @model_validator(
        mode="after",
    )
    def validate_matching_passwords(
        self,
    ):
        if (
            self.password
            != self.confirm_password
        ):
            raise ValueError(
                "Password and confirmation do not match."
            )

        return self


class RegistrationCompleteResponse(
    BaseModel,
):
    success: bool

    message: str

    user_id: int = Field(
        ...,
        ge=1,
    )

    email: EmailStr

    first_name: str

    last_name: str

    model_config = ORM_MODEL_CONFIG


# ==========================================================
# LOCAL LOGIN SCHEMAS
# ==========================================================

class LoginRequest(
    BaseModel,
):
    email: EmailStr

    password: str = Field(
        ...,
        min_length=1,
        max_length=128,
    )

    remember_me: bool = False

    @field_validator(
        "email",
        mode="before",
    )
    @classmethod
    def normalize_email(
        cls,
        value,
    ):
        if isinstance(
            value,
            str,
        ):
            return (
                value
                .strip()
                .lower()
            )

        return value


class LoginResponse(
    BaseModel,
):
    success: bool

    message: str

    access_token: str

    refresh_token: str

    token_type: str

    user: UserResponse

    model_config = ORM_MODEL_CONFIG


# ==========================================================
# GOOGLE LOGIN SCHEMAS
# ==========================================================

class GoogleLoginRequest(
    BaseModel,
):
    credential: str = Field(
        ...,
        min_length=1,
    )

    remember_me: bool = False

    @field_validator(
        "credential",
        mode="before",
    )
    @classmethod
    def normalize_credential(
        cls,
        value,
    ):
        if isinstance(
            value,
            str,
        ):
            normalized = value.strip()

            if not normalized:
                raise ValueError(
                    "Google credential is required."
                )

            return normalized

        return value


class GoogleLoginResponse(
    BaseModel,
):
    success: bool

    message: str

    access_token: str

    refresh_token: str

    token_type: str

    user: UserResponse

    model_config = ORM_MODEL_CONFIG


# ==========================================================
# REFRESH TOKEN SCHEMAS
# ==========================================================

class RefreshTokenRequest(
    BaseModel,
):
    refresh_token: str = Field(
        ...,
        min_length=1,
    )

    @field_validator(
        "refresh_token",
        mode="before",
    )
    @classmethod
    def normalize_refresh_token(
        cls,
        value,
    ):
        if isinstance(
            value,
            str,
        ):
            normalized = value.strip()

            if not normalized:
                raise ValueError(
                    "Refresh token is required."
                )

            return normalized

        return value


class RefreshTokenResponse(
    BaseModel,
):
    success: bool

    message: str

    access_token: str

    refresh_token: str

    token_type: str

    model_config = ORM_MODEL_CONFIG


# ==========================================================
# LOGOUT SCHEMA
# ==========================================================

class LogoutResponse(
    BaseModel,
):
    message: str

    model_config = ORM_MODEL_CONFIG


# ==========================================================
# CURRENT LOGGED-IN USER
# ==========================================================

class CurrentUserResponse(
    BaseModel,
):
    user: UserResponse

    model_config = ORM_MODEL_CONFIG