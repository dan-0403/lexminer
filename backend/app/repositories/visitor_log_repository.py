from datetime import datetime

from sqlalchemy.orm import Session

from app.crud.visitor_log_crud import (
    VisitorLogCRUD,
)
from app.models.visitor_log import (
    VisitorLog,
)


class VisitorLogRepository:

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
        visitor_log: VisitorLog,
    ) -> VisitorLog:
        """
        Save a visitor log record.
        """

        return VisitorLogCRUD.create(
            db=self.db,
            visitor_log=visitor_log,
        )

    # =====================================================
    # GET BY ID
    # =====================================================

    def get_by_id(
        self,
        visitor_log_id: int,
    ) -> VisitorLog | None:
        """
        Retrieve one visitor log by ID.
        """

        return VisitorLogCRUD.get_by_id(
            db=self.db,
            visitor_log_id=visitor_log_id,
        )

    # =====================================================
    # GET ALL WITH FILTERS
    # =====================================================

    def get_all(
        self,
        session_id: str | None = None,
        user_id: int | None = None,
        browser: str | None = None,
        operating_system: str | None = None,
        visited_page: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        guest_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> list[VisitorLog]:
        """
        Return visitor logs with optional filtering
        and pagination.
        """

        return VisitorLogCRUD.get_all(
            db=self.db,
            session_id=session_id,
            user_id=user_id,
            browser=browser,
            operating_system=operating_system,
            visited_page=visited_page,
            date_from=date_from,
            date_to=date_to,
            guest_only=guest_only,
            skip=skip,
            limit=limit,
        )

    # =====================================================
    # COUNT FILTERED LOGS
    # =====================================================

    def count_filtered(
        self,
        session_id: str | None = None,
        user_id: int | None = None,
        browser: str | None = None,
        operating_system: str | None = None,
        visited_page: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        guest_only: bool = False,
    ) -> int:
        """
        Count records matching the supplied filters.
        """

        return VisitorLogCRUD.count_filtered(
            db=self.db,
            session_id=session_id,
            user_id=user_id,
            browser=browser,
            operating_system=operating_system,
            visited_page=visited_page,
            date_from=date_from,
            date_to=date_to,
            guest_only=guest_only,
        )

    # =====================================================
    # GENERAL VISITOR COUNTS
    # =====================================================

    def count_total_visits(
        self,
    ) -> int:
        """
        Count all page visits.
        """

        return VisitorLogCRUD.count_total_visits(
            db=self.db,
        )

    def count_unique_visitors(
        self,
    ) -> int:
        """
        Count unique visitor session IDs.
        """

        return VisitorLogCRUD.count_unique_visitors(
            db=self.db,
        )

    def count_today_visits(
        self,
    ) -> int:
        """
        Count all page visits recorded today.
        """

        return VisitorLogCRUD.count_today_visits(
            db=self.db,
        )

    def count_today_unique_visitors(
        self,
    ) -> int:
        """
        Count unique visitor sessions recorded today.
        """

        return (
            VisitorLogCRUD
            .count_today_unique_visitors(
                db=self.db,
            )
        )

    # =====================================================
    # GUEST VISITOR COUNTS
    # =====================================================

    def count_guest_visits(
        self,
    ) -> int:
        """
        Count all guest page visits.
        """

        return VisitorLogCRUD.count_guest_visits(
            db=self.db,
        )

    def count_unique_guest_visitors(
        self,
    ) -> int:
        """
        Count unique guest visitor sessions.
        """

        return (
            VisitorLogCRUD
            .count_unique_guest_visitors(
                db=self.db,
            )
        )

    def count_today_guest_visits(
        self,
    ) -> int:
        """
        Count guest page visits recorded today.
        """

        return (
            VisitorLogCRUD
            .count_today_guest_visits(
                db=self.db,
            )
        )

    def count_today_unique_guest_visitors(
        self,
    ) -> int:
        """
        Count unique guest sessions recorded today.
        """

        return (
            VisitorLogCRUD
            .count_today_unique_guest_visitors(
                db=self.db,
            )
        )

    # =====================================================
    # ANALYTICS
    # =====================================================

    def top_pages(
        self,
        limit: int = 5,
        guest_only: bool = False,
    ) -> list[dict[str, int | str]]:
        """
        Return the most frequently visited pages.

        When guest_only=True, only anonymous visitor
        records are included.
        """

        return VisitorLogCRUD.top_pages(
            db=self.db,
            limit=limit,
            guest_only=guest_only,
        )

    def top_browsers(
        self,
        limit: int = 5,
        guest_only: bool = False,
    ) -> list[dict[str, int | str]]:
        """
        Return the most frequently used browsers.

        When guest_only=True, only anonymous visitor
        records are included.
        """

        return VisitorLogCRUD.top_browsers(
            db=self.db,
            limit=limit,
            guest_only=guest_only,
        )

    def top_operating_systems(
        self,
        limit: int = 5,
        guest_only: bool = False,
    ) -> list[dict[str, int | str]]:
        """
        Return the most frequently used operating systems.

        When guest_only=True, only anonymous visitor
        records are included.
        """

        return (
            VisitorLogCRUD
            .top_operating_systems(
                db=self.db,
                limit=limit,
                guest_only=guest_only,
            )
        )

    # =====================================================
    # CLEANUP
    # =====================================================

    def cleanup(
        self,
        before: datetime,
        guest_only: bool = False,
    ) -> int:
        """
        Delete visitor logs older than the supplied date.

        When guest_only=True, only anonymous visitor
        records are deleted.
        """

        return VisitorLogCRUD.cleanup(
            db=self.db,
            before=before,
            guest_only=guest_only,
        )