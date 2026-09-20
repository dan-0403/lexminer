from datetime import datetime
from datetime import timedelta
from datetime import timezone
from typing import Any

from fastapi import HTTPException
from fastapi import status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.jwt import JWTManager
from app.core.otp import generate_numeric_otp
from app.core.otp import hash_otp
from app.core.otp import verify_otp
from app.core.password import hash_password
from app.core.password import verify_password
from app.enums import AuthProvider
from app.enums import Role
from app.models.registration_session import (
    RegistrationSession,
)
from app.models.user import User
from app.repositories.registration_session_repository import (
    RegistrationSessionRepository,
)
from app.repositories.user_repository import (
    UserRepository,
)
from app.services.email_service import (
    EmailService,
)
from app.services.google_service import (
    GoogleAuthService,
)


class AuthService:

    # ==========================================================
    # REGISTRATION SETTINGS
    # ==========================================================

    REGISTRATION_OTP_EXPIRE_MINUTES = 5
    REGISTRATION_OTP_RESEND_SECONDS = 60
    REGISTRATION_OTP_MAX_ATTEMPTS = 5
    REGISTRATION_OTP_MAX_RESENDS = 5

    # ==========================================================
    # LOCAL LOGIN SECURITY SETTINGS
    # ==========================================================

    LOCAL_LOGIN_MAX_ATTEMPTS = 5
    LOCAL_LOGIN_LOCK_MINUTES = 30

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.db = db

        self.user_repository = UserRepository(
            db
        )

        self.registration_session_repository = (
            RegistrationSessionRepository(
                db
            )
        )

        self.email_service = EmailService()

    # ==========================================================
    # OLD DIRECT REGISTRATION DISABLED
    # ==========================================================

    def register(
        self,
        request,
    ) -> dict[str, Any]:
        """
        Direct registration is disabled because it bypasses
        email ownership verification.

        Use:

        1. request_registration_otp()
        2. verify_registration_otp()
        3. resend_registration_otp()
        4. complete_registration()
        """

        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=(
                "Direct registration is no longer available. "
                "Use the email-verification registration flow."
            ),
        )

    # ==========================================================
    # STEP 1 — REQUEST REGISTRATION OTP
    # ==========================================================

    async def request_registration_otp(
        self,
        request,
    ) -> dict[str, Any]:

        email = (
            str(request.email)
            .strip()
            .lower()
        )

        self._validate_duplicate_email(
            email
        )

        current_time = datetime.now(
            timezone.utc
        )

        self.registration_session_repository.delete_expired(
            current_time=current_time
        )

        existing_session = (
            self.registration_session_repository
            .get_by_email(
                email
            )
        )

        if existing_session is not None:

            if (
                existing_session.consumed_at
                is not None
            ):
                self.registration_session_repository.delete(
                    existing_session
                )

                existing_session = None

            elif existing_session.email_verified:

                return {
                    "message": (
                        "Your email address has already been "
                        "verified. Continue creating your account."
                    ),
                    "registration_id": (
                        existing_session.id
                    ),
                    "masked_email": (
                        self._mask_email(
                            email
                        )
                    ),
                    "expires_in_seconds": (
                        self.REGISTRATION_OTP_EXPIRE_MINUTES
                        * 60
                    ),
                    "resend_available_in_seconds": 0,
                }

            else:
                resend_available_at = (
                    self._as_aware_datetime(
                        existing_session
                        .resend_available_at
                    )
                )

                if (
                    current_time
                    < resend_available_at
                ):
                    remaining_seconds = max(
                        int(
                            (
                                resend_available_at
                                - current_time
                            ).total_seconds()
                        ),
                        1,
                    )

                    raise HTTPException(
                        status_code=(
                            status.HTTP_429_TOO_MANY_REQUESTS
                        ),
                        detail=(
                            "A verification code was recently "
                            "sent. Please wait "
                            f"{remaining_seconds} seconds before "
                            "requesting another code."
                        ),
                    )

        otp = generate_numeric_otp()

        expires_at = (
            current_time
            + timedelta(
                minutes=(
                    self.REGISTRATION_OTP_EXPIRE_MINUTES
                )
            )
        )

        resend_available_at = (
            current_time
            + timedelta(
                seconds=(
                    self.REGISTRATION_OTP_RESEND_SECONDS
                )
            )
        )

        if existing_session is None:

            registration = RegistrationSession(
                email=email,
                otp_hash=hash_otp(
                    otp
                ),
                otp_attempts=0,
                resend_count=0,
                email_verified=False,
                expires_at=expires_at,
                resend_available_at=(
                    resend_available_at
                ),
                verified_at=None,
                consumed_at=None,
            )

            registration = (
                self.registration_session_repository
                .create(
                    registration
                )
            )

        else:
            old_otp_hash = (
                existing_session.otp_hash
            )

            old_attempts = (
                existing_session.otp_attempts
            )

            old_resend_count = (
                existing_session.resend_count
            )

            old_email_verified = (
                existing_session.email_verified
            )

            old_expires_at = (
                existing_session.expires_at
            )

            old_resend_available_at = (
                existing_session
                .resend_available_at
            )

            old_verified_at = (
                existing_session.verified_at
            )

            old_consumed_at = (
                existing_session.consumed_at
            )

            existing_session.otp_hash = (
                hash_otp(
                    otp
                )
            )

            existing_session.otp_attempts = 0
            existing_session.email_verified = False
            existing_session.expires_at = expires_at

            existing_session.resend_available_at = (
                resend_available_at
            )

            existing_session.verified_at = None
            existing_session.consumed_at = None

            registration = (
                self.registration_session_repository
                .update(
                    existing_session
                )
            )

        try:
            await (
                self.email_service
                .send_registration_otp(
                    recipient=email,
                    otp=otp,
                    expiration_minutes=(
                        self.REGISTRATION_OTP_EXPIRE_MINUTES
                    ),
                )
            )

        except Exception as error:

            if existing_session is None:
                try:
                    self.registration_session_repository.delete(
                        registration
                    )
                except Exception:
                    pass

            else:
                registration.otp_hash = (
                    old_otp_hash
                )

                registration.otp_attempts = (
                    old_attempts
                )

                registration.resend_count = (
                    old_resend_count
                )

                registration.email_verified = (
                    old_email_verified
                )

                registration.expires_at = (
                    old_expires_at
                )

                registration.resend_available_at = (
                    old_resend_available_at
                )

                registration.verified_at = (
                    old_verified_at
                )

                registration.consumed_at = (
                    old_consumed_at
                )

                try:
                    self.registration_session_repository.update(
                        registration
                    )
                except Exception:
                    pass

            raise HTTPException(
                status_code=(
                    status.HTTP_503_SERVICE_UNAVAILABLE
                ),
                detail=(
                    "The verification email could not be "
                    "sent. Please try again later."
                ),
            ) from error

        return {
            "message": (
                "A six-digit verification code was sent "
                "to your email address."
            ),
            "registration_id": (
                registration.id
            ),
            "masked_email": (
                self._mask_email(
                    email
                )
            ),
            "expires_in_seconds": (
                self.REGISTRATION_OTP_EXPIRE_MINUTES
                * 60
            ),
            "resend_available_in_seconds": (
                self.REGISTRATION_OTP_RESEND_SECONDS
            ),
        }

    # ==========================================================
    # STEP 2 — VERIFY REGISTRATION OTP
    # ==========================================================

    def verify_registration_otp(
        self,
        request,
    ) -> dict[str, Any]:

        registration = (
            self.registration_session_repository
            .get_by_id(
                request.registration_id
            )
        )

        if registration is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail=(
                    "The registration session was not found."
                ),
            )

        if (
            registration.consumed_at
            is not None
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "This registration session has already "
                    "been completed."
                ),
            )

        if registration.email_verified:
            return {
                "success": True,
                "message": (
                    "Your email address is already verified."
                ),
                "registration_id": (
                    registration.id
                ),
                "email_verified": True,
            }

        current_time = datetime.now(
            timezone.utc
        )

        expires_at = (
            self._as_aware_datetime(
                registration.expires_at
            )
        )

        if current_time >= expires_at:
            raise HTTPException(
                status_code=(
                    status.HTTP_410_GONE
                ),
                detail=(
                    "The verification code has expired. "
                    "Request a new verification code."
                ),
            )

        attempts = int(
            registration.otp_attempts
            or 0
        )

        if (
            attempts
            >= self.REGISTRATION_OTP_MAX_ATTEMPTS
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_429_TOO_MANY_REQUESTS
                ),
                detail=(
                    "Too many incorrect verification "
                    "attempts. Request a new code."
                ),
            )

        submitted_otp = (
            str(request.otp)
            .strip()
        )

        otp_is_valid = verify_otp(
            plain_otp=submitted_otp,
            stored_hash=(
                registration.otp_hash
            ),
        )

        if not otp_is_valid:

            registration.otp_attempts = (
                attempts + 1
            )

            self.registration_session_repository.update(
                registration
            )

            attempts_remaining = max(
                self.REGISTRATION_OTP_MAX_ATTEMPTS
                - registration.otp_attempts,
                0,
            )

            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "The verification code is incorrect. "
                    f"{attempts_remaining} attempt"
                    f"{'' if attempts_remaining == 1 else 's'} "
                    "remaining."
                ),
            )

        registration.email_verified = True
        registration.verified_at = current_time
        registration.otp_attempts = 0

        self.registration_session_repository.update(
            registration
        )

        return {
            "success": True,
            "message": (
                "Email verified successfully. "
                "Continue creating your account."
            ),
            "registration_id": (
                registration.id
            ),
            "email_verified": True,
        }

    # ==========================================================
    # RESEND REGISTRATION OTP
    # ==========================================================

    async def resend_registration_otp(
        self,
        request,
    ) -> dict[str, Any]:

        registration = (
            self.registration_session_repository
            .get_by_id(
                request.registration_id
            )
        )

        if registration is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail=(
                    "The registration session was not found."
                ),
            )

        if (
            registration.consumed_at
            is not None
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "This registration session has already "
                    "been completed."
                ),
            )

        if registration.email_verified:
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "This email address has already been "
                    "verified."
                ),
            )

        current_time = datetime.now(
            timezone.utc
        )

        resend_available_at = (
            self._as_aware_datetime(
                registration
                .resend_available_at
            )
        )

        if (
            current_time
            < resend_available_at
        ):
            remaining_seconds = max(
                int(
                    (
                        resend_available_at
                        - current_time
                    ).total_seconds()
                ),
                1,
            )

            raise HTTPException(
                status_code=(
                    status.HTTP_429_TOO_MANY_REQUESTS
                ),
                detail=(
                    "Please wait "
                    f"{remaining_seconds} seconds before "
                    "requesting another code."
                ),
            )

        resend_count = int(
            registration.resend_count
            or 0
        )

        if (
            resend_count
            >= self.REGISTRATION_OTP_MAX_RESENDS
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_429_TOO_MANY_REQUESTS
                ),
                detail=(
                    "The maximum number of verification "
                    "code resends has been reached. "
                    "Start the registration process again."
                ),
            )

        otp = generate_numeric_otp()

        old_otp_hash = (
            registration.otp_hash
        )

        old_expires_at = (
            registration.expires_at
        )

        old_resend_available_at = (
            registration.resend_available_at
        )

        old_resend_count = (
            registration.resend_count
        )

        old_attempts = (
            registration.otp_attempts
        )

        registration.otp_hash = (
            hash_otp(
                otp
            )
        )

        registration.otp_attempts = 0

        registration.resend_count = (
            resend_count + 1
        )

        registration.expires_at = (
            current_time
            + timedelta(
                minutes=(
                    self.REGISTRATION_OTP_EXPIRE_MINUTES
                )
            )
        )

        registration.resend_available_at = (
            current_time
            + timedelta(
                seconds=(
                    self.REGISTRATION_OTP_RESEND_SECONDS
                )
            )
        )

        registration = (
            self.registration_session_repository
            .update(
                registration
            )
        )

        try:
            await (
                self.email_service
                .send_registration_otp(
                    recipient=(
                        registration.email
                    ),
                    otp=otp,
                    expiration_minutes=(
                        self.REGISTRATION_OTP_EXPIRE_MINUTES
                    ),
                )
            )

        except Exception as error:

            registration.otp_hash = (
                old_otp_hash
            )

            registration.expires_at = (
                old_expires_at
            )

            registration.resend_available_at = (
                old_resend_available_at
            )

            registration.resend_count = (
                old_resend_count
            )

            registration.otp_attempts = (
                old_attempts
            )

            try:
                self.registration_session_repository.update(
                    registration
                )
            except Exception:
                pass

            raise HTTPException(
                status_code=(
                    status.HTTP_503_SERVICE_UNAVAILABLE
                ),
                detail=(
                    "The new verification code could not "
                    "be sent. Please try again later."
                ),
            ) from error

        return {
            "message": (
                "A new six-digit verification code was "
                "sent to your email address."
            ),
            "expires_in_seconds": (
                self.REGISTRATION_OTP_EXPIRE_MINUTES
                * 60
            ),
            "resend_available_in_seconds": (
                self.REGISTRATION_OTP_RESEND_SECONDS
            ),
        }

    # ==========================================================
    # STEP 3 AND 4 — COMPLETE REGISTRATION
    # ==========================================================

    async def complete_registration(
        self,
        request,
    ) -> dict[str, Any]:

        registration = (
            self.registration_session_repository
            .get_by_id(
                request.registration_id
            )
        )

        if registration is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail=(
                    "The registration session was not found."
                ),
            )

        if (
            registration.consumed_at
            is not None
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "This registration has already been "
                    "completed."
                ),
            )

        if not registration.email_verified:
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "Verify your email address before "
                    "creating your account."
                ),
            )

        self._validate_duplicate_email(
            registration.email
        )

        first_name = " ".join(
            request.first_name
            .strip()
            .split()
        )

        last_name = " ".join(
            request.last_name
            .strip()
            .split()
        )

        new_user = User(
            first_name=first_name,
            last_name=last_name,
            email=registration.email,
            password_hash=hash_password(
                request.password
            ),
            google_id=None,
            profile_picture=None,
            auth_provider=(
                AuthProvider.LOCAL
            ),
            role=Role.REGISTERED,
            is_active=True,
            is_verified=True,
            is_locked=False,
            locked_until=None,
            failed_login_attempts=0,
            login_count=0,
            last_login_at=None,
            last_login_provider=None,
            last_logout_at=None,
        )

        try:
            user = (
                self.user_repository
                .create(
                    new_user
                )
            )

            registration.consumed_at = (
                datetime.now(
                    timezone.utc
                )
            )

            self.registration_session_repository.update(
                registration
            )

            try:
                await self.email_service.send_welcome_email(
                    recipient=user.email,
                    first_name=user.first_name,
                )
            except Exception:
                # Account creation must remain successful even
                # when the welcome email cannot be delivered.
                pass

        except HTTPException:
            self.db.rollback()
            raise

        except Exception as error:
            self.db.rollback()

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "The account could not be created. "
                    "Please try again."
                ),
            ) from error

        return {
            "success": True,
            "message": (
                "Your LexMiner account was created "
                "successfully. You may now sign in."
            ),
            "user_id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }

    # ==========================================================
    # LOCAL LOGIN
    # ==========================================================

    async def login(
        self,
        request,
    ) -> dict[str, Any]:

        email = (
            str(request.email)
            .strip()
            .lower()
        )

        user = (
            self.user_repository
            .get_by_email(
                email
            )
        )

        if user is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Invalid email or password."
                ),
            )

        automatically_unlocked = (
            self._validate_account_status(
                user
            )
        )

        if automatically_unlocked:
            try:
                await (
                    self.email_service
                    .send_account_unlocked_email(
                        recipient=user.email,
                    )
                )
            except Exception:
                # Login must continue even when the notification
                # email cannot be delivered.
                pass

        if not user.is_verified:
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "Verify your email address before "
                    "signing in."
                ),
            )

        if not user.password_hash:

            if (
                user.auth_provider
                == AuthProvider.GOOGLE
            ):
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        "This account uses Google Sign-In. "
                        "Please continue with Google."
                    ),
                )

            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Invalid email or password."
                ),
            )

        password_is_valid = (
            verify_password(
                request.password,
                user.password_hash,
            )
        )

        if not password_is_valid:

            failed_result = (
                self._record_failed_login(
                    user
                )
            )

            if failed_result["locked"]:

                locked_until = (
                    failed_result[
                        "locked_until"
                    ]
                )

                formatted_locked_until = (
                    locked_until.strftime(
                        "%B %d, %Y at %I:%M %p UTC"
                    )
                )

                try:
                    await (
                        self.email_service
                        .send_account_locked_email(
                            recipient=user.email,
                            failed_attempts=(
                                failed_result[
                                    "failed_attempts"
                                ]
                            ),
                            locked_until=locked_until,
                        )
                    )
                except Exception:
                    # The account remains locked even when the
                    # notification email cannot be delivered.
                    pass

                raise HTTPException(
                    status_code=(
                        status.HTTP_423_LOCKED
                    ),
                    detail=(
                        "Too many failed login attempts. "
                        "Your account has been temporarily "
                        f"locked until {formatted_locked_until}."
                    ),
                )

            attempts_remaining = (
                failed_result[
                    "attempts_remaining"
                ]
            )

            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Invalid email or password. "
                    f"{attempts_remaining} login attempt"
                    f"{'' if attempts_remaining == 1 else 's'} "
                    "remaining before temporary account lock."
                ),
            )

        self._record_successful_login(
            user=user,
            provider=(
                AuthProvider.LOCAL
            ),
        )

        remember_me = bool(
            getattr(
                request,
                "remember_me",
                False,
            )
        )

        return self.build_jwt_response(
            user=user,
            remember_me=remember_me,
        )

    # ==========================================================
    # GOOGLE LOGIN
    # ==========================================================

    def login_with_google(
        self,
        credential: str,
    ) -> User:

        normalized_credential = (
            credential.strip()
        )

        if not normalized_credential:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "Google credential is required."
                ),
            )

        google_user = (
            GoogleAuthService
            .verify_google_token(
                normalized_credential
            )
        )

        google_email = (
            google_user["email"]
            .strip()
            .lower()
        )

        google_id = (
            google_user["google_id"]
        )

        admin_email = (
            settings.ADMIN_EMAIL
            .strip()
            .lower()
        )

        if google_email == admin_email:
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "Administrator accounts cannot "
                    "sign in using Google."
                ),
            )

        user = (
            self.user_repository
            .get_by_google_id(
                google_id
            )
        )

        if user is not None:

            self._validate_account_status(
                user
            )

            self._update_google_user_information(
                user=user,
                google_user=google_user,
            )

            self._record_successful_login(
                user=user,
                provider=(
                    AuthProvider.GOOGLE
                ),
            )

            return user

        user = (
            self.user_repository
            .get_by_email(
                google_email
            )
        )

        if user is not None:

            self._validate_account_status(
                user
            )

            self._update_google_user_information(
                user=user,
                google_user=google_user,
            )

            self._record_successful_login(
                user=user,
                provider=(
                    AuthProvider.GOOGLE
                ),
            )

            return user

        current_time = datetime.now(
            timezone.utc
        )

        new_user = User(
            first_name=(
                google_user[
                    "first_name"
                ].strip()
            ),
            last_name=(
                google_user[
                    "last_name"
                ].strip()
            ),
            email=google_email,
            password_hash=None,
            google_id=google_id,
            profile_picture=(
                google_user.get(
                    "profile_picture"
                )
            ),
            auth_provider=(
                AuthProvider.GOOGLE
            ),
            role=Role.REGISTERED,
            is_active=True,
            is_verified=True,
            is_locked=False,
            locked_until=None,
            failed_login_attempts=0,
            login_count=1,
            last_login_at=current_time,
            last_login_provider=(
                AuthProvider.GOOGLE
            ),
            last_logout_at=None,
        )

        return (
            self.user_repository
            .create(
                new_user
            )
        )

    # ==========================================================
    # GOOGLE LOGIN ENDPOINT SERVICE
    # ==========================================================

    def google_login(
        self,
        credential: str,
        remember_me: bool = False,
    ) -> dict[str, Any]:

        user = (
            self.login_with_google(
                credential
            )
        )

        return self.build_jwt_response(
            user=user,
            remember_me=remember_me,
        )

    # ==========================================================
    # CREATE JWT LOGIN RESPONSE
    # ==========================================================

    def build_jwt_response(
        self,
        user: User,
        remember_me: bool = False,
    ) -> dict[str, Any]:

        payload = (
            self._build_token_payload(
                user
            )
        )

        payload["remember_me"] = (
            remember_me
        )

        access_token = (
            JWTManager
            .create_access_token(
                payload
            )
        )

        refresh_token = (
            JWTManager
            .create_refresh_token(
                payload
            )
        )

        return {
            "success": True,
            "message": (
                "Login successful. Welcome back, "
                f"{user.first_name}!"
            ),
            "access_token": (
                access_token
            ),
            "refresh_token": (
                refresh_token
            ),
            "token_type": "Bearer",
            "user": (
                self._serialize_user(
                    user
                )
            ),
        }

    # ==========================================================
    # REFRESH TOKEN
    # ==========================================================

    def refresh_token(
        self,
        refresh_token: str,
    ) -> dict[str, Any]:

        try:
            payload = (
                JWTManager
                .verify_token(
                    refresh_token
                )
            )

        except Exception as error:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Invalid or expired refresh token."
                ),
            ) from error

        token_type = (
            payload.get("type")
            or payload.get("token_type")
        )

        if (
            token_type is not None
            and str(token_type).lower()
            != "refresh"
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "The supplied token is not a refresh token."
                ),
            )

        user_id = payload.get(
            "sub"
        )

        if user_id is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Invalid refresh token."
                ),
            )

        try:
            parsed_user_id = int(
                user_id
            )

        except (
            TypeError,
            ValueError,
        ) as error:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Invalid refresh token."
                ),
            ) from error

        user = (
            self.user_repository
            .get_by_id(
                parsed_user_id
            )
        )

        if user is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Invalid refresh token."
                ),
            )

        self._validate_account_status(
            user
        )

        if not user.is_verified:
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "Verify your email address before "
                    "continuing."
                ),
            )

        remember_me = bool(
            payload.get(
                "remember_me",
                False,
            )
        )

        new_payload = (
            self._build_token_payload(
                user
            )
        )

        new_payload["remember_me"] = (
            remember_me
        )

        new_access_token = (
            JWTManager
            .create_access_token(
                new_payload
            )
        )

        new_refresh_token = (
            JWTManager
            .create_refresh_token(
                new_payload
            )
        )

        return {
            "success": True,
            "message": (
                "Token refreshed successfully."
            ),
            "access_token": (
                new_access_token
            ),
            "refresh_token": (
                new_refresh_token
            ),
            "token_type": "Bearer",
        }

    # ==========================================================
    # LOGOUT
    # ==========================================================

    def logout(
        self,
        user: User,
    ) -> dict[str, str]:

        user.last_logout_at = (
            datetime.now(
                timezone.utc
            )
        )

        self.user_repository.update(
            user
        )

        return {
            "message": (
                "Logout successful."
            ),
        }

    # ==========================================================
    # SERIALIZE USER
    # ==========================================================

    @staticmethod
    def serialize_user(
        user: User,
    ) -> dict[str, Any]:

        return {
            "id": user.id,
            "first_name": (
                user.first_name
            ),
            "last_name": (
                user.last_name
            ),
            "email": user.email,
            "role": user.role,
            "auth_provider": (
                user.auth_provider
            ),
            "profile_picture": (
                user.profile_picture
            ),
            "is_active": (
                user.is_active
            ),
            "created_at": (
                user.created_at
            ),
            "updated_at": (
                user.updated_at
            ),
        }

    @staticmethod
    def _serialize_user(
        user: User,
    ) -> dict[str, Any]:

        return (
            AuthService
            .serialize_user(
                user
            )
        )

    # ==========================================================
    # BUILD TOKEN PAYLOAD
    # ==========================================================

    @staticmethod
    def _build_token_payload(
        user: User,
    ) -> dict[str, Any]:

        role_value = (
            user.role.value
            if hasattr(
                user.role,
                "value",
            )
            else str(
                user.role
            )
        )

        return {
            "sub": str(
                user.id
            ),
            "email": (
                user.email
            ),
            "role": (
                role_value
            ),
        }

    # ==========================================================
    # UPDATE GOOGLE USER INFORMATION
    # ==========================================================

    @staticmethod
    def _update_google_user_information(
        user: User,
        google_user: dict[str, Any],
    ) -> None:

        first_name = (
            google_user.get(
                "first_name"
            )
        )

        last_name = (
            google_user.get(
                "last_name"
            )
        )

        if first_name:
            user.first_name = (
                first_name.strip()
            )

        if last_name:
            user.last_name = (
                last_name.strip()
            )

        profile_picture = (
            google_user.get(
                "profile_picture"
            )
        )

        if profile_picture:
            user.profile_picture = (
                profile_picture
            )

        user.google_id = (
            google_user[
                "google_id"
            ]
        )

        user.auth_provider = (
            AuthProvider.GOOGLE
        )

        user.is_verified = True

    # ==========================================================
    # SUCCESSFUL LOGIN HANDLER
    # ==========================================================

    def _record_successful_login(
        self,
        user: User,
        provider: AuthProvider,
    ) -> None:

        current_time = datetime.now(
            timezone.utc
        )

        user.failed_login_attempts = 0
        user.is_locked = False
        user.locked_until = None

        user.last_login_at = (
            current_time
        )

        user.last_login_provider = (
            provider
        )

        user.login_count = (
            int(
                user.login_count
                or 0
            )
            + 1
        )

        self.user_repository.update(
            user
        )

    # ==========================================================
    # FAILED LOGIN HANDLER
    # ==========================================================

    def _record_failed_login(
        self,
        user: User,
    ) -> dict[str, Any]:

        current_attempts = int(
            user.failed_login_attempts
            or 0
        )

        new_attempts = (
            current_attempts + 1
        )

        user.failed_login_attempts = (
            new_attempts
        )

        locked = False
        locked_until = None

        if (
            new_attempts
            >= self.LOCAL_LOGIN_MAX_ATTEMPTS
        ):
            locked = True

            locked_until = (
                datetime.now(
                    timezone.utc
                )
                + timedelta(
                    minutes=(
                        self.LOCAL_LOGIN_LOCK_MINUTES
                    )
                )
            )

            user.is_locked = True
            user.locked_until = (
                locked_until
            )

        self.user_repository.update(
            user
        )

        attempts_remaining = max(
            self.LOCAL_LOGIN_MAX_ATTEMPTS
            - new_attempts,
            0,
        )

        return {
            "locked": locked,
            "locked_until": (
                locked_until
            ),
            "failed_attempts": (
                new_attempts
            ),
            "attempts_remaining": (
                attempts_remaining
            ),
        }

    # ==========================================================
    # ACCOUNT STATUS VALIDATION
    # ==========================================================

    def _validate_account_status(
        self,
        user: User,
    ) -> bool:

        if (
            user.deleted_at
            is not None
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "This account is no longer available."
                ),
            )

        if not user.is_active:
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "Your account has been deactivated. "
                    "Please contact the administrator."
                ),
            )

        if not user.is_locked:
            return False

        # A lock without an expiration was manually applied
        # by an administrator and must not auto-expire.
        if user.locked_until is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_423_LOCKED
                ),
                detail=(
                    "Your account has been locked by an "
                    "administrator. Please contact support."
                ),
            )

        current_time = datetime.now(
            timezone.utc
        )

        locked_until = (
            self._as_aware_datetime(
                user.locked_until
            )
        )

        if current_time < locked_until:

            remaining_seconds = max(
                int(
                    (
                        locked_until
                        - current_time
                    ).total_seconds()
                ),
                1,
            )

            remaining_minutes = max(
                (
                    remaining_seconds
                    + 59
                )
                // 60,
                1,
            )

            formatted_locked_until = (
                locked_until.strftime(
                    "%B %d, %Y at %I:%M %p UTC"
                )
            )

            raise HTTPException(
                status_code=(
                    status.HTTP_423_LOCKED
                ),
                detail=(
                    "Your account is temporarily locked "
                    "because of repeated failed login attempts. "
                    f"Try again in approximately "
                    f"{remaining_minutes} minute"
                    f"{'' if remaining_minutes == 1 else 's'}, "
                    f"or after {formatted_locked_until}."
                ),
            )

        # Temporary lock has expired.
        user.is_locked = False
        user.locked_until = None
        user.failed_login_attempts = 0

        self.user_repository.update(
            user
        )

        return True

    # ==========================================================
    # DUPLICATE EMAIL VALIDATION
    # ==========================================================

    def _validate_duplicate_email(
        self,
        email: str,
    ) -> None:

        normalized_email = (
            email.strip().lower()
        )

        admin_email = (
            settings.ADMIN_EMAIL
            .strip()
            .lower()
        )

        if (
            normalized_email
            == admin_email
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "This email address is reserved."
                ),
            )

        existing_user = (
            self.user_repository
            .get_by_email(
                normalized_email
            )
        )

        if existing_user is not None:
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "An account with this email already "
                    "exists."
                ),
            )

    # ==========================================================
    # MASK EMAIL
    # ==========================================================

    @staticmethod
    def _mask_email(
        email: str,
    ) -> str:

        local_part, domain = (
            email.split(
                "@",
                maxsplit=1,
            )
        )

        if len(local_part) <= 1:
            masked_local = (
                local_part[:1]
                + "***"
            )

        elif len(local_part) == 2:
            masked_local = (
                local_part[0]
                + "***"
            )

        else:
            masked_local = (
                local_part[:2]
                + "*" * max(
                    len(local_part) - 2,
                    3,
                )
            )

        return (
            f"{masked_local}@{domain}"
        )

    # ==========================================================
    # NORMALIZE DATETIME
    # ==========================================================

    @staticmethod
    def _as_aware_datetime(
        value: datetime,
    ) -> datetime:

        if value.tzinfo is None:
            return value.replace(
                tzinfo=timezone.utc
            )

        return value.astimezone(
            timezone.utc
        )