from sqlalchemy.orm import Session

from app.enums import AuthProvider
from app.models.user import User
from app.repositories.user_repository import (
    UserRepository,
)
from app.services.password_policy_service import (
    PasswordPolicyService,
)

# Change this import to your existing password utility.
from app.core.password import (
    hash_password,
    verify_password,
)


class AccountSettingsService:
    """
    Manage authenticated-user security and
    account settings.
    """

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.user_repository = (
            UserRepository(
                db
            )
        )

    # =====================================================
    # CHANGE PASSWORD
    # =====================================================

    def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
        confirm_password: str,
    ) -> dict[str, str]:

        if user is None:
            raise ValueError(
                "User not found."
            )

        if (
            new_password
            != confirm_password
        ):
            raise ValueError(
                "New password and confirmation "
                "password do not match."
            )

        if (
            current_password
            == new_password
        ):
            raise ValueError(
                "The new password must be different "
                "from the current password."
            )

        if (
            user.auth_provider
            == AuthProvider.GOOGLE
            and not user.password_hash
        ):
            raise ValueError(
                "This account uses Google authentication "
                "and does not currently have a local password."
            )

        if not user.password_hash:
            raise ValueError(
                "This account does not have a password "
                "that can be changed."
            )

        current_password_valid = (
            verify_password(
                plain_password=(
                    current_password
                ),
                hashed_password=(
                    user.password_hash
                ),
            )
        )

        if not current_password_valid:
            raise ValueError(
                "The current password is incorrect."
            )

        PasswordPolicyService.validate(
            new_password
        )

        new_password_hash = (
            hash_password(
                new_password
            )
        )

        self.user_repository.update_password(
            user=user,
            password_hash=(
                new_password_hash
            ),
        )

        return {
            "message": (
                "Your password was changed successfully."
            ),
        }