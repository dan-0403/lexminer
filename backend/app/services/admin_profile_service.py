from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.password import (
    hash_password,
    verify_password,
)
from app.enums import AuthProvider
from app.models.user import User
from app.repositories.user_repository import (
    UserRepository,
)
from app.schemas.admin_profile_schema import (
    AdminPasswordUpdateRequest,
    AdminProfileUpdateRequest,
)


class AdminProfileService:

    def __init__(
        self,
        db: Session,
    ):
        self.user_repository = UserRepository(db)

    def get_profile(
        self,
        admin: User,
    ) -> dict:

        return self._serialize_admin(admin)

    def update_profile(
        self,
        admin: User,
        payload: AdminProfileUpdateRequest,
    ) -> dict:

        normalized_email = (
            str(payload.email)
            .strip()
            .lower()
        )

        existing_user = (
            self.user_repository.get_by_email(
                normalized_email
            )
        )

        if (
            existing_user is not None
            and existing_user.id != admin.id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Email address is already registered."
                ),
            )

        admin.first_name = (
            payload.first_name.strip()
        )

        admin.last_name = (
            payload.last_name.strip()
        )

        admin.email = normalized_email

        try:
            updated_admin = (
                self.user_repository.update(
                    admin
                )
            )

        except Exception:
            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Unable to update the admin profile."
                ),
            )

        return {
            "message": (
                "Admin profile updated successfully."
            ),
            **self._serialize_admin(
                updated_admin
            ),
        }

    def update_password(
        self,
        admin: User,
        payload: AdminPasswordUpdateRequest,
    ) -> dict:

        if admin.password_hash is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "This account does not have a local "
                    "password. Sign in using the account's "
                    "authentication provider."
                ),
            )

        if (
            payload.new_password
            != payload.confirm_password
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "New password and confirmation "
                    "password do not match."
                ),
            )

        if not verify_password(
            payload.current_password,
            admin.password_hash,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Current password is incorrect."
                ),
            )

        if verify_password(
            payload.new_password,
            admin.password_hash,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "The new password must be different "
                    "from the current password."
                ),
            )

        admin.password_hash = hash_password(
            payload.new_password
        )

        try:
            self.user_repository.update(
                admin
            )

        except Exception:
            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Unable to update the admin password."
                ),
            )

        return {
            "message": (
                "Admin password updated successfully."
            ),
        }

    @staticmethod
    def _serialize_admin(
        admin: User,
    ) -> dict:

        role_value = (
            admin.role.value
            if hasattr(admin.role, "value")
            else str(admin.role)
        )

        auth_provider_value = (
            admin.auth_provider.value
            if hasattr(
                admin.auth_provider,
                "value",
            )
            else str(admin.auth_provider)
        )

        last_login_provider_value = (
            admin.last_login_provider.value
            if (
                admin.last_login_provider is not None
                and hasattr(
                    admin.last_login_provider,
                    "value",
                )
            )
            else (
                str(admin.last_login_provider)
                if admin.last_login_provider
                is not None
                else None
            )
        )

        return {
            "id": admin.id,
            "first_name": admin.first_name,
            "last_name": admin.last_name,
            "email": admin.email,
            "profile_picture": (
                admin.profile_picture
            ),
            "role": role_value,
            "auth_provider": (
                auth_provider_value
            ),
            "is_active": admin.is_active,
            "is_verified": admin.is_verified,
            "is_locked": admin.is_locked,

            # Administrator account activity
            "last_login_at": (
                admin.last_login_at
            ),
            "last_logout_at": (
                admin.last_logout_at
            ),
            "last_login_provider": (
                last_login_provider_value
            ),
            "failed_login_attempts": (
                admin.failed_login_attempts or 0
            ),
            "login_count": (
                admin.login_count or 0
            ),

            "created_at": admin.created_at,
            "updated_at": admin.updated_at,
        }