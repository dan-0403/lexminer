from datetime import datetime

from sqlalchemy.orm import Session

from app.crud.user_crud import UserCRUD
from app.enums import AuthProvider
from app.models.user import User


class UserRepository:

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.db = db

    # =====================================================
    # CREATE
    # =====================================================

    def create(
        self,
        user: User,
    ) -> User:

        return UserCRUD.create(
            self.db,
            user,
        )

    # =====================================================
    # GET BY ID
    # =====================================================

    def get_by_id(
        self,
        user_id: int,
        include_deleted: bool = False,
        registered_only: bool = False,
    ) -> User | None:

        return UserCRUD.get_by_id(
            self.db,
            user_id,
            include_deleted=(
                include_deleted
            ),
            registered_only=(
                registered_only
            ),
        )

    # =====================================================
    # GET BY EMAIL
    # =====================================================

    def get_by_email(
        self,
        email: str,
    ) -> User | None:

        return UserCRUD.get_by_email(
            self.db,
            email,
        )

    # =====================================================
    # GET BY GOOGLE ID
    # =====================================================

    def get_by_google_id(
        self,
        google_id: str,
    ) -> User | None:

        return (
            UserCRUD
            .get_by_google_id(
                self.db,
                google_id,
            )
        )

    # =====================================================
    # UPDATE
    # =====================================================

    def update(
        self,
        user: User,
    ) -> User:

        return UserCRUD.update(
            self.db,
            user,
        )

    # =====================================================
    # USER ACTIONS
    # =====================================================

    def deactivate(
        self,
        user: User,
    ) -> User:

        return UserCRUD.deactivate(
            self.db,
            user,
        )

    def activate(
        self,
        user: User,
    ) -> User:

        return UserCRUD.activate(
            self.db,
            user,
        )

    def lock(
        self,
        user: User,
    ) -> User:

        return UserCRUD.lock(
            self.db,
            user,
        )

    def unlock(
        self,
        user: User,
    ) -> User:

        return UserCRUD.unlock(
            self.db,
            user,
        )

    def soft_delete(
        self,
        user: User,
        deleted_at: datetime,
    ) -> User:

        return UserCRUD.soft_delete(
            self.db,
            user,
            deleted_at,
        )

    # =====================================================
    # GET ALL
    # =====================================================

    def get_all(
        self,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
        is_active: bool | None = None,
        is_locked: bool | None = None,
        is_verified: bool | None = None,
        auth_provider: (
            AuthProvider | None
        ) = None,
        include_deleted: bool = False,
        registered_only: bool = False,
    ) -> list[User]:

        return UserCRUD.get_all(
            self.db,
            skip=skip,
            limit=limit,
            search=search,
            is_active=is_active,
            is_locked=is_locked,
            is_verified=is_verified,
            auth_provider=(
                auth_provider
            ),
            include_deleted=(
                include_deleted
            ),
            registered_only=(
                registered_only
            ),
        )

    # =====================================================
    # COUNT ALL
    # =====================================================

    def count_all(
        self,
        search: str | None = None,
        is_active: bool | None = None,
        is_locked: bool | None = None,
        is_verified: bool | None = None,
        auth_provider: (
            AuthProvider | None
        ) = None,
        include_deleted: bool = False,
        registered_only: bool = False,
    ) -> int:

        return UserCRUD.count_all(
            self.db,
            search=search,
            is_active=is_active,
            is_locked=is_locked,
            is_verified=is_verified,
            auth_provider=(
                auth_provider
            ),
            include_deleted=(
                include_deleted
            ),
            registered_only=(
                registered_only
            ),
        )

    # =====================================================
    # COUNT LOCKED
    # =====================================================

    def count_locked(
        self,
        include_deleted: bool = False,
        registered_only: bool = False,
    ) -> int:

        return UserCRUD.count_locked(
            self.db,
            include_deleted=(
                include_deleted
            ),
            registered_only=(
                registered_only
            ),
        )

    # =====================================================
    # UPDATE PROFILE NAME
    # =====================================================

    def update_profile(
        self,
        user: User,
        first_name: str,
        last_name: str,
    ) -> User:

        try:
            user.first_name = (
                first_name
            )

            user.last_name = (
                last_name
            )

            self.db.add(
                user
            )

            self.db.commit()

            self.db.refresh(
                user
            )

            return user

        except Exception:
            self.db.rollback()
            raise


    # =====================================================
    # UPDATE PROFILE PICTURE
    # =====================================================

    def update_profile_picture(
        self,
        user: User,
        profile_picture: str | None,
    ) -> User:

        try:
            user.profile_picture = (
                profile_picture
            )

            self.db.add(
                user
            )

            self.db.commit()

            self.db.refresh(
                user
            )

            return user

        except Exception:
            self.db.rollback()
            raise

        # =====================================================
    # UPDATE PASSWORD
    # =====================================================

    def update_password(
        self,
        user: User,
        password_hash: str,
    ) -> User:

        try:
            user.password_hash = (
                password_hash
            )

            self.db.add(
                user
            )

            self.db.commit()

            self.db.refresh(
                user
            )

            return user

        except Exception:
            self.db.rollback()
            raise