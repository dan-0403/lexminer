import uuid
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.repositories.user_repository import (
    UserRepository,
)


class UserProfileService:
    """
    Manage authenticated user profile information
    and profile-picture files.
    """

    CONTENT_TYPE_EXTENSIONS = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    ALLOWED_EXTENSIONS = {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
    }

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.user_repository = (
            UserRepository(
                db
            )
        )

        self.profile_directory = (
            settings
            .resolved_profile_picture_directory
            .resolve()
        )

        self.maximum_file_size = (
            int(
                settings
                .MAX_PROFILE_PICTURE_SIZE_MB
            )
            * 1024
            * 1024
        )

    # =====================================================
    # GET PROFILE
    # =====================================================

    def get_profile(
        self,
        user: User,
    ) -> dict[str, Any]:

        if user is None:
            raise ValueError(
                "User not found."
            )

        return self._serialize_user(
            user
        )

    # =====================================================
    # UPDATE PROFILE
    # =====================================================

    def update_profile(
        self,
        user: User,
        first_name: str,
        last_name: str,
    ) -> dict[str, Any]:

        normalized_first_name = (
            " ".join(
                str(
                    first_name or ""
                )
                .strip()
                .split()
            )
        )

        normalized_last_name = (
            " ".join(
                str(
                    last_name or ""
                )
                .strip()
                .split()
            )
        )

        if not normalized_first_name:
            raise ValueError(
                "First name cannot be empty."
            )

        if not normalized_last_name:
            raise ValueError(
                "Last name cannot be empty."
            )

        if (
            len(
                normalized_first_name
            )
            > 100
        ):
            raise ValueError(
                "First name cannot exceed 100 characters."
            )

        if (
            len(
                normalized_last_name
            )
            > 100
        ):
            raise ValueError(
                "Last name cannot exceed 100 characters."
            )

        updated_user = (
            self.user_repository
            .update_profile(
                user=user,
                first_name=(
                    normalized_first_name
                ),
                last_name=(
                    normalized_last_name
                ),
            )
        )

        return self._serialize_user(
            updated_user
        )

    # =====================================================
    # UPLOAD PROFILE PICTURE
    # =====================================================

    async def upload_profile_picture(
        self,
        user: User,
        file: UploadFile,
    ) -> dict[str, Any]:

        if file is None:
            raise ValueError(
                "A profile picture is required."
            )

        original_filename = str(
            file.filename or ""
        ).strip()

        if not original_filename:
            raise ValueError(
                "The uploaded image has no filename."
            )

        supplied_extension = (
            Path(
                original_filename
            )
            .suffix
            .lower()
        )

        content_type = str(
            file.content_type or ""
        ).strip().lower()

        file_bytes = await file.read()

        if not file_bytes:
            raise ValueError(
                "The selected image is empty."
            )

        if (
            len(
                file_bytes
            )
            > self.maximum_file_size
        ):
            raise ValueError(
                "Profile picture must not exceed "
                f"{settings.MAX_PROFILE_PICTURE_SIZE_MB} MB."
            )

        detected_extension = (
            self._detect_image_extension(
                file_bytes
            )
        )

        if detected_extension is None:
            raise ValueError(
                "The uploaded file is not a valid "
                "JPG, PNG, or WEBP image."
            )

        if (
            supplied_extension
            and supplied_extension
            not in self.ALLOWED_EXTENSIONS
        ):
            raise ValueError(
                "Only JPG, PNG, and WEBP "
                "images are allowed."
            )

        expected_extension = (
            self.CONTENT_TYPE_EXTENSIONS
            .get(
                content_type
            )
        )

        if (
            expected_extension is not None
            and expected_extension
            != detected_extension
        ):
            raise ValueError(
                "The image content does not match "
                "its declared file type."
            )

        self.profile_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        generated_filename = (
            f"user_{user.id}_"
            f"{uuid.uuid4().hex}"
            f"{detected_extension}"
        )

        destination = (
            self.profile_directory
            / generated_filename
        ).resolve()

        try:
            destination.relative_to(
                self.profile_directory
            )
        except ValueError as exc:
            raise ValueError(
                "The generated profile-picture "
                "path is invalid."
            ) from exc

        temporary_destination = (
            destination.with_suffix(
                destination.suffix
                + ".tmp"
            )
        )

        try:
            temporary_destination.write_bytes(
                file_bytes
            )

            temporary_destination.replace(
                destination
            )

        except OSError:
            temporary_destination.unlink(
                missing_ok=True
            )

            raise

        public_path = (
            "/uploads/profile_pictures/"
            f"{generated_filename}"
        )

        old_profile_picture = (
            user.profile_picture
        )

        try:
            updated_user = (
                self.user_repository
                .update_profile_picture(
                    user=user,
                    profile_picture=(
                        public_path
                    ),
                )
            )

        except Exception:
            destination.unlink(
                missing_ok=True
            )

            raise

        self._delete_existing_picture(
            stored_path=(
                old_profile_picture
            ),
            excluded_filename=(
                generated_filename
            ),
        )

        return {
            "profile_picture": (
                updated_user
                .profile_picture
            ),

            "message": (
                "Profile picture updated successfully."
            ),
        }

    # =====================================================
    # DELETE PROFILE PICTURE
    # =====================================================

    def delete_profile_picture(
        self,
        user: User,
    ) -> dict[str, Any]:

        if user is None:
            raise ValueError(
                "User not found."
            )

        old_profile_picture = (
            user.profile_picture
        )

        self.user_repository.update_profile_picture(
            user=user,
            profile_picture=None,
        )

        self._delete_existing_picture(
            stored_path=(
                old_profile_picture
            )
        )

        return {
            "profile_picture": None,

            "message": (
                "Profile picture removed successfully."
            ),
        }

    # =====================================================
    # DETECT IMAGE TYPE
    # =====================================================

    @staticmethod
    def _detect_image_extension(
        file_bytes: bytes,
    ) -> str | None:

        if file_bytes.startswith(
            b"\xff\xd8\xff"
        ):
            return ".jpg"

        if file_bytes.startswith(
            b"\x89PNG\r\n\x1a\n"
        ):
            return ".png"

        if (
            len(
                file_bytes
            )
            >= 12
            and file_bytes[
                0:4
            ]
            == b"RIFF"
            and file_bytes[
                8:12
            ]
            == b"WEBP"
        ):
            return ".webp"

        return None

    # =====================================================
    # DELETE EXISTING FILE
    # =====================================================

    def _delete_existing_picture(
        self,
        stored_path: str | None,
        excluded_filename: str | None = None,
    ) -> None:

        normalized_path = str(
            stored_path or ""
        ).strip()

        if not normalized_path:
            return

        filename = (
            Path(
                normalized_path
            )
            .name
        )

        if not filename:
            return

        if (
            excluded_filename
            and filename
            == excluded_filename
        ):
            return

        candidate = (
            self.profile_directory
            / filename
        ).resolve()

        try:
            candidate.relative_to(
                self.profile_directory
            )
        except ValueError:
            return

        if (
            candidate.exists()
            and candidate.is_file()
        ):
            candidate.unlink(
                missing_ok=True
            )

    # =====================================================
    # SERIALIZE USER
    # =====================================================

    @staticmethod
    def _serialize_user(
        user: User,
    ) -> dict[str, Any]:

        auth_provider = getattr(
            user.auth_provider,
            "value",
            user.auth_provider,
        )

        role = getattr(
            user.role,
            "value",
            user.role,
        )

        return {
            "id": (
                user.id
            ),

            "first_name": (
                user.first_name
            ),

            "last_name": (
                user.last_name
            ),

            "email": (
                user.email
            ),

            "profile_picture": (
                user.profile_picture
            ),

            "auth_provider": (
                str(
                    auth_provider
                )
            ),

            "role": (
                str(
                    role
                )
            ),

            "is_active": (
                bool(
                    user.is_active
                )
            ),

            "is_verified": (
                bool(
                    user.is_verified
                )
            ),

            "created_at": (
                user.created_at
            ),

            "updated_at": (
                user.updated_at
            ),

            "last_login_at": (
                user.last_login_at
            ),
        }