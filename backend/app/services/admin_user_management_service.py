from datetime import datetime
from datetime import timezone
from typing import Any

from fastapi import HTTPException
from fastapi import status
from sqlalchemy.orm import Session

from app.enums import AuthProvider
from app.enums import Role
from app.repositories.user_repository import (
    UserRepository,
)
from app.repositories.visitor_log_repository import (
    VisitorLogRepository,
)

from app.models.user import User


class AdminUserManagementService:

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.db = db

        self.user_repository = (
            UserRepository(db)
        )

        self.visitor_log_repository = (
            VisitorLogRepository(db)
        )

    # =====================================================
    # GET REGISTERED USERS
    # =====================================================

    def get_registered_users(
        self,
        skip: int = 0,
        limit: int = 25,
        search: str | None = None,
        is_active: bool | None = None,
        is_locked: bool | None = None,
        is_verified: bool | None = None,
        auth_provider: AuthProvider | None = None,
    ) -> dict[str, Any]:

        safe_skip = max(
            int(skip or 0),
            0,
        )

        safe_limit = min(
            max(
                int(limit or 25),
                1,
            ),
            100,
        )

        users = (
            self.user_repository
            .get_all(
                skip=safe_skip,
                limit=safe_limit,
                search=search,
                is_active=is_active,
                is_locked=is_locked,
                is_verified=is_verified,
                auth_provider=auth_provider,
                include_deleted=False,
                registered_only=True,
            )
        )

        total = (
            self.user_repository
            .count_all(
                search=search,
                is_active=is_active,
                is_locked=is_locked,
                is_verified=is_verified,
                auth_provider=auth_provider,
                include_deleted=False,
                registered_only=True,
            )
        )

        return {
            "total": int(
                total or 0
            ),
            "skip": safe_skip,
            "limit": safe_limit,
            "users": users,
        }

    # =====================================================
    # GET REGISTERED USER DETAIL
    # =====================================================

    def get_registered_user(
        self,
        user_id: int,
    ) -> User:

        user = self.user_repository.get_by_id(
            user_id=user_id,
            include_deleted=False,
        )

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registered user not found.",
            )

        if user.role != Role.REGISTERED:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registered user not found.",
            )

        return user

    # =====================================================
    # GET USER SUMMARY
    # =====================================================

    def get_registered_user_summary(
        self,
    ) -> dict[str, int]:

        total = (
            self.user_repository
            .count_all(
                registered_only=True,
            )
            or 0
        )

        active = (
            self.user_repository
            .count_all(
                is_active=True,
                registered_only=True,
            )
            or 0
        )

        inactive = (
            self.user_repository
            .count_all(
                is_active=False,
                registered_only=True,
            )
            or 0
        )

        locked = (
            self.user_repository
            .count_all(
                is_locked=True,
                registered_only=True,
            )
            or 0
        )

        verified = (
            self.user_repository
            .count_all(
                is_verified=True,
                registered_only=True,
            )
            or 0
        )

        local_accounts = (
            self.user_repository
            .count_all(
                auth_provider=(
                    AuthProvider.LOCAL
                ),
                registered_only=True,
            )
            or 0
        )

        google_accounts = (
            self.user_repository
            .count_all(
                auth_provider=(
                    AuthProvider.GOOGLE
                ),
                registered_only=True,
            )
            or 0
        )

        return {
            "total": int(total),
            "active": int(active),
            "inactive": int(inactive),
            "locked": int(locked),
            "verified": int(verified),
            "local_accounts": int(
                local_accounts
            ),
            "google_accounts": int(
                google_accounts
            ),
        }

    # =====================================================
    # ACTIVATE USER
    # =====================================================

    def activate_user(
        self,
        user_id: int,
    ) -> dict[str, Any]:

        user = self.get_registered_user(
            user_id
        )

        if user.is_active:
            return {
                "user_id": user.id,
                "action": "ACTIVATE",
                "is_active": True,
                "is_locked": bool(
                    user.is_locked
                ),
                "message": (
                    "The registered user is already active."
                ),
            }

        updated_user = (
            self.user_repository
            .activate(user)
        )

        return {
            "user_id": updated_user.id,
            "action": "ACTIVATE",
            "is_active": bool(
                updated_user.is_active
            ),
            "is_locked": bool(
                updated_user.is_locked
            ),
            "message": (
                "Registered user activated successfully."
            ),
        }

    # =====================================================
    # DEACTIVATE USER
    # =====================================================

    def deactivate_user(
        self,
        user_id: int,
    ) -> dict[str, Any]:

        user = self.get_registered_user(
            user_id
        )

        if not user.is_active:
            return {
                "user_id": user.id,
                "action": "DEACTIVATE",
                "is_active": False,
                "is_locked": bool(
                    user.is_locked
                ),
                "message": (
                    "The registered user is already inactive."
                ),
            }

        updated_user = (
            self.user_repository
            .deactivate(user)
        )

        return {
            "user_id": updated_user.id,
            "action": "DEACTIVATE",
            "is_active": bool(
                updated_user.is_active
            ),
            "is_locked": bool(
                updated_user.is_locked
            ),
            "message": (
                "Registered user deactivated successfully."
            ),
        }

    # =====================================================
    # LOCK USER
    # =====================================================

    def lock_user(
        self,
        user_id: int,
    ) -> dict[str, Any]:

        user = self.get_registered_user(
            user_id
        )

        if user.is_locked:
            return {
                "user_id": user.id,
                "action": "LOCK",
                "is_active": bool(
                    user.is_active
                ),
                "is_locked": True,
                "message": (
                    "The registered user is already locked."
                ),
            }

        updated_user = (
            self.user_repository
            .lock(user)
        )

        return {
            "user_id": updated_user.id,
            "action": "LOCK",
            "is_active": bool(
                updated_user.is_active
            ),
            "is_locked": bool(
                updated_user.is_locked
            ),
            "message": (
                "Registered user locked successfully."
            ),
        }

    # =====================================================
    # UNLOCK USER
    # =====================================================

    def unlock_user(
        self,
        user_id: int,
    ) -> dict[str, Any]:

        user = self.get_registered_user(
            user_id
        )

        if not user.is_locked:
            return {
                "user_id": user.id,
                "action": "UNLOCK",
                "is_active": bool(
                    user.is_active
                ),
                "is_locked": False,
                "message": (
                    "The registered user is already unlocked."
                ),
            }

        updated_user = (
            self.user_repository
            .unlock(user)
        )

        return {
            "user_id": updated_user.id,
            "action": "UNLOCK",
            "is_active": bool(
                updated_user.is_active
            ),
            "is_locked": bool(
                updated_user.is_locked
            ),
            "message": (
                "Registered user unlocked successfully."
            ),
        }

    # =====================================================
    # SOFT DELETE USER
    # =====================================================

    def delete_user(
        self,
        user_id: int,
    ) -> dict[str, Any]:

        user = self.get_registered_user(
            user_id
        )

        deleted_user = (
            self.user_repository
            .soft_delete(
                user=user,
                deleted_at=datetime.now(
                    timezone.utc
                ),
            )
        )

        return {
            "user_id": deleted_user.id,
            "deleted": (
                deleted_user.deleted_at
                is not None
            ),
            "message": (
                "Registered user deleted successfully."
            ),
        }

    # =====================================================
    # GET GUEST VISITOR LOGS
    # =====================================================

    def get_guest_visitor_logs(
        self,
        session_id: str | None = None,
        browser: str | None = None,
        operating_system: str | None = None,
        visited_page: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        skip: int = 0,
        limit: int = 25,
    ) -> dict[str, Any]:

        safe_skip = max(
            int(skip or 0),
            0,
        )

        safe_limit = min(
            max(
                int(limit or 25),
                1,
            ),
            100,
        )

        logs = (
            self.visitor_log_repository
            .get_all(
                session_id=session_id,
                browser=browser,
                operating_system=(
                    operating_system
                ),
                visited_page=visited_page,
                date_from=date_from,
                date_to=date_to,
                guest_only=True,
                skip=safe_skip,
                limit=safe_limit,
            )
        )

        total = (
            self.visitor_log_repository
            .count_filtered(
                session_id=session_id,
                browser=browser,
                operating_system=(
                    operating_system
                ),
                visited_page=visited_page,
                date_from=date_from,
                date_to=date_to,
                guest_only=True,
            )
        )

        return {
            "total": int(
                total or 0
            ),
            "skip": safe_skip,
            "limit": safe_limit,
            "logs": logs,
        }

    # =====================================================
    # GET GUEST SUMMARY
    # =====================================================

    def get_guest_visitor_summary(
        self,
    ) -> dict[str, Any]:

        top_pages = (
            self.visitor_log_repository
            .top_pages(
                limit=5,
                guest_only=True,
            )
        )

        top_browsers = (
            self.visitor_log_repository
            .top_browsers(
                limit=5,
                guest_only=True,
            )
        )

        top_operating_systems = (
            self.visitor_log_repository
            .top_operating_systems(
                limit=5,
                guest_only=True,
            )
        )

        return {
            "total_guest_visits": int(
                self.visitor_log_repository
                .count_guest_visits()
                or 0
            ),

            "unique_guest_visitors": int(
                self.visitor_log_repository
                .count_unique_guest_visitors()
                or 0
            ),

            "today_guest_visits": int(
                self.visitor_log_repository
                .count_today_guest_visits()
                or 0
            ),

            "today_unique_guest_visitors": int(
                self.visitor_log_repository
                .count_today_unique_guest_visitors()
                or 0
            ),

            "top_pages": (
                self._normalize_analytics_rows(
                    rows=top_pages,
                    label_keys=[
                        "visited_page",
                        "page",
                    ],
                )
            ),

            "top_browsers": (
                self._normalize_analytics_rows(
                    rows=top_browsers,
                    label_keys=[
                        "browser",
                    ],
                )
            ),

            "top_operating_systems": (
                self._normalize_analytics_rows(
                    rows=(
                        top_operating_systems
                    ),
                    label_keys=[
                        "operating_system",
                    ],
                )
            ),
        }

    # =====================================================
    # GET COMPLETE MANAGEMENT SUMMARY
    # =====================================================

    def get_management_summary(
        self,
    ) -> dict[str, Any]:

        return {
            "registered_users": (
                self.get_registered_user_summary()
            ),
            "guest_visitors": (
                self.get_guest_visitor_summary()
            ),
        }

    # =====================================================
    # NORMALIZE ANALYTICS ROWS
    # =====================================================

    @staticmethod
    def _normalize_analytics_rows(
        rows,
        label_keys: list[str],
    ) -> list[dict[str, Any]]:

        results: list[
            dict[str, Any]
        ] = []

        for row in rows or []:

            label = None
            visits = 0

            if isinstance(
                row,
                dict,
            ):
                for key in label_keys:
                    if row.get(key):
                        label = row.get(key)
                        break

                visits = (
                    row.get("visit_count")
                    or row.get("visits")
                    or row.get("count")
                    or 0
                )

            elif hasattr(
                row,
                "_mapping",
            ):
                mapping = row._mapping

                for key in label_keys:
                    if mapping.get(key):
                        label = mapping.get(
                            key
                        )
                        break

                visits = (
                    mapping.get(
                        "visit_count"
                    )
                    or mapping.get(
                        "visits"
                    )
                    or mapping.get(
                        "count"
                    )
                    or 0
                )

            elif isinstance(
                row,
                (
                    tuple,
                    list,
                ),
            ):
                if len(row) >= 1:
                    label = row[0]

                if len(row) >= 2:
                    visits = row[1]

            else:
                for key in label_keys:
                    value = getattr(
                        row,
                        key,
                        None,
                    )

                    if value:
                        label = value
                        break

                visits = (
                    getattr(
                        row,
                        "visit_count",
                        None,
                    )
                    or getattr(
                        row,
                        "visits",
                        None,
                    )
                    or getattr(
                        row,
                        "count",
                        None,
                    )
                    or 0
                )

            results.append(
                {
                    "label": str(
                        label
                        or "Unknown"
                    ),
                    "visits": int(
                        visits or 0
                    ),
                }
            )

        return results