from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.enums import AuthProvider
from app.enums import Role
from app.models.user import User


class UserCRUD:

    # =====================================================
    # CREATE
    # =====================================================

    @staticmethod
    def create(
        db: Session,
        user: User,
    ) -> User:

        try:
            db.add(user)
            db.commit()
            db.refresh(user)

            return user

        except Exception:
            db.rollback()
            raise

    # =====================================================
    # GET BY ID
    # =====================================================

    @staticmethod
    def get_by_id(
        db: Session,
        user_id: int,
        include_deleted: bool = False,
        registered_only: bool = False,
    ) -> User | None:

        query = db.query(
            User
        ).filter(
            User.id == user_id
        )

        if not include_deleted:
            query = query.filter(
                User.deleted_at.is_(None)
            )

        if registered_only:
            query = query.filter(
                User.role == Role.REGISTERED
            )

        return query.first()

    # =====================================================
    # GET BY EMAIL
    # =====================================================

    @staticmethod
    def get_by_email(
        db: Session,
        email: str,
    ) -> User | None:

        normalized_email = (
            str(email)
            .strip()
            .lower()
        )

        return (
            db.query(User)
            .filter(
                User.email
                == normalized_email,

                User.deleted_at
                .is_(None),
            )
            .first()
        )

    # =====================================================
    # GET BY GOOGLE ID
    # =====================================================

    @staticmethod
    def get_by_google_id(
        db: Session,
        google_id: str,
    ) -> User | None:

        return (
            db.query(User)
            .filter(
                User.google_id
                == google_id,

                User.deleted_at
                .is_(None),
            )
            .first()
        )

    # =====================================================
    # UPDATE
    # =====================================================

    @staticmethod
    def update(
        db: Session,
        user: User,
    ) -> User:

        try:
            db.add(user)
            db.commit()
            db.refresh(user)

            return user

        except Exception:
            db.rollback()
            raise

    # =====================================================
    # GET ALL REGISTERED USERS
    # =====================================================

    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
        is_active: bool | None = None,
        is_locked: bool | None = None,
        is_verified: bool | None = None,
        auth_provider: AuthProvider | None = None,
        include_deleted: bool = False,
        registered_only: bool = False,
    ) -> list[User]:

        safe_skip = max(
            int(skip or 0),
            0,
        )

        safe_limit = min(
            max(
                int(limit or 50),
                1,
            ),
            100,
        )

        query = db.query(
            User
        )

        if not include_deleted:
            query = query.filter(
                User.deleted_at.is_(None)
            )

        if registered_only:
            query = query.filter(
                User.role == Role.REGISTERED
            )

        if (
            search
            and search.strip()
        ):
            normalized_search = (
                f"%{search.strip()}%"
            )

            query = query.filter(
                or_(
                    User.first_name.ilike(
                        normalized_search
                    ),

                    User.last_name.ilike(
                        normalized_search
                    ),

                    User.email.ilike(
                        normalized_search
                    ),
                )
            )

        if is_active is not None:
            query = query.filter(
                User.is_active
                == is_active
            )

        if is_locked is not None:
            query = query.filter(
                User.is_locked
                == is_locked
            )

        if is_verified is not None:
            query = query.filter(
                User.is_verified
                == is_verified
            )

        if auth_provider is not None:
            query = query.filter(
                User.auth_provider
                == auth_provider
            )

        return (
            query
            .order_by(
                User.created_at.desc(),
                User.id.desc(),
            )
            .offset(
                safe_skip
            )
            .limit(
                safe_limit
            )
            .all()
        )

    # =====================================================
    # COUNT USERS
    # =====================================================

    @staticmethod
    def count_all(
        db: Session,
        search: str | None = None,
        is_active: bool | None = None,
        is_locked: bool | None = None,
        is_verified: bool | None = None,
        auth_provider: AuthProvider | None = None,
        include_deleted: bool = False,
        registered_only: bool = False,
    ) -> int:

        query = db.query(
            User
        )

        if not include_deleted:
            query = query.filter(
                User.deleted_at.is_(None)
            )

        if registered_only:
            query = query.filter(
                User.role == Role.REGISTERED
            )

        if (
            search
            and search.strip()
        ):
            normalized_search = (
                f"%{search.strip()}%"
            )

            query = query.filter(
                or_(
                    User.first_name.ilike(
                        normalized_search
                    ),

                    User.last_name.ilike(
                        normalized_search
                    ),

                    User.email.ilike(
                        normalized_search
                    ),
                )
            )

        if is_active is not None:
            query = query.filter(
                User.is_active
                == is_active
            )

        if is_locked is not None:
            query = query.filter(
                User.is_locked
                == is_locked
            )

        if is_verified is not None:
            query = query.filter(
                User.is_verified
                == is_verified
            )

        if auth_provider is not None:
            query = query.filter(
                User.auth_provider
                == auth_provider
            )

        return int(
            query.count()
        )

    # =====================================================
    # ACTIVATE
    # =====================================================

    @staticmethod
    def activate(
        db: Session,
        user: User,
    ) -> User:

        user.is_active = True

        return UserCRUD.update(
            db,
            user,
        )

    # =====================================================
    # DEACTIVATE
    # =====================================================

    @staticmethod
    def deactivate(
        db: Session,
        user: User,
    ) -> User:

        user.is_active = False

        return UserCRUD.update(
            db,
            user,
        )

    # =====================================================
    # LOCK
    # =====================================================

    @staticmethod
    def lock(
        db: Session,
        user: User,
    ) -> User:

        user.is_locked = True
        user.locked_until = None

        return UserCRUD.update(
            db,
            user,
        )

    # =====================================================
    # UNLOCK
    # =====================================================

    @staticmethod
    def unlock(
        db: Session,
        user: User,
    ) -> User:

        user.is_locked = False
        user.locked_until = None
        user.failed_login_attempts = 0

        return UserCRUD.update(
            db,
            user,
        )

    # =====================================================
    # SOFT DELETE
    # =====================================================

    @staticmethod
    def soft_delete(
        db: Session,
        user: User,
        deleted_at: datetime,
    ) -> User:

        user.deleted_at = deleted_at
        user.is_active = False
        user.is_locked = True
        user.locked_until = None

        return UserCRUD.update(
            db,
            user,
        )

    # =====================================================
    # COUNT LOCKED USERS
    # =====================================================

    @staticmethod
    def count_locked(
        db: Session,
        include_deleted: bool = False,
        registered_only: bool = False,
    ) -> int:

        query = db.query(
            User
        ).filter(
            User.is_locked.is_(True)
        )

        if not include_deleted:
            query = query.filter(
                User.deleted_at.is_(None)
            )

        if registered_only:
            query = query.filter(
                User.role == Role.REGISTERED
            )

        return int(
            query.count()
        )