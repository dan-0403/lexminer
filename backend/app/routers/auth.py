from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    CurrentUserResponse,
    GoogleLoginRequest,
    GoogleLoginResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    RegistrationCompleteRequest,
    RegistrationCompleteResponse,
    RegistrationEmailRequest,
    RegistrationEmailResponse,
    RegistrationOTPResendRequest,
    RegistrationOTPResendResponse,
    RegistrationOTPVerifyRequest,
    RegistrationOTPVerifyResponse,
)
from app.services.auth_service import AuthService


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


# ==========================================================
# REGISTER
# ==========================================================

# ==========================================================
# STEP 1 — REQUEST REGISTRATION OTP
# ==========================================================

@router.post(
    "/register/request-otp",
    response_model=RegistrationEmailResponse,
)
async def request_registration_otp(
    request: RegistrationEmailRequest,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)

    return await auth_service.request_registration_otp(
        request
    )

# ==========================================================
# STEP 2 — VERIFY REGISTRATION OTP
# ==========================================================

@router.post(
    "/register/verify-otp",
    response_model=RegistrationOTPVerifyResponse,
)
def verify_registration_otp(
    request: RegistrationOTPVerifyRequest,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)

    return auth_service.verify_registration_otp(
        request
    )

# ==========================================================
# RESEND REGISTRATION OTP
# ==========================================================

@router.post(
    "/register/resend-otp",
    response_model=RegistrationOTPResendResponse,
)
async def resend_registration_otp(
    request: RegistrationOTPResendRequest,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)

    return await auth_service.resend_registration_otp(
        request
    )

# ==========================================================
# STEP 3 AND 4 — COMPLETE REGISTRATION
# ==========================================================

@router.post(
    "/register/complete",
    response_model=RegistrationCompleteResponse,
)
async def complete_registration(
    request: RegistrationCompleteRequest,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)

    return await auth_service.complete_registration(
        request
    )


# ==========================================================
# LOCAL LOGIN
# ==========================================================

@router.post(
    "/login",
    response_model=LoginResponse,
)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)

    return await auth_service.login(
        request
    )
# ==========================================================
# GOOGLE LOGIN
# ==========================================================

@router.post(
    "/google",
    response_model=GoogleLoginResponse,
)
def google_login(
    request: GoogleLoginRequest,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)

    return auth_service.google_login(
        credential=request.credential,
        remember_me=request.remember_me,
    )


# ==========================================================
# REFRESH TOKEN
# ==========================================================

@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
)
def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)

    return auth_service.refresh_token(
        request.refresh_token
    )


# ==========================================================
# LOGOUT
# ==========================================================

@router.post(
    "/logout",
    response_model=LogoutResponse,
)
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)

    return auth_service.logout(current_user)


# ==========================================================
# CURRENT USER
# ==========================================================

@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
def me(
    current_user: User = Depends(get_current_user),
):
    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "profile_picture": current_user.profile_picture,
            "role": current_user.role.value,
            "auth_provider": current_user.auth_provider.value,
            "is_active": current_user.is_active,
            "created_at": current_user.created_at,
            "updated_at": current_user.updated_at,
        }
    }