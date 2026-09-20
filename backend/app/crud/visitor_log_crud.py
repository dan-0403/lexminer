from datetime import date
from datetime import datetime
from datetime import time
from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Query
from sqlalchemy.orm import Session

from app.models.visitor_log import VisitorLog


class VisitorLogCRUD:

    # =====================================================
    # CREATE
    # =====================================================

    @staticmethod
    def create(
        db: Session,
        visitor_log: VisitorLog,
    ) -> VisitorLog:

        try:
            db.add(visitor_log)
            db.commit()
            db.refresh(visitor_log)

            return visitor_log

        except Exception:
            db.rollback()
            raise

    # =====================================================
    # GET BY ID
    # =====================================================

    @staticmethod
    def get_by_id(
        db: Session,
        visitor_log_id: int,
    ) -> VisitorLog | None:

        return (
            db.query(VisitorLog)
            .filter(
                VisitorLog.id
                == visitor_log_id
            )
            .first()
        )

    # =====================================================
    # GET ALL WITH FILTERS
    # =====================================================

    @staticmethod
    def get_all(
        db: Session,
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

        query = (
            VisitorLogCRUD
            ._apply_filters(
                db=db,
                session_id=session_id,
                user_id=user_id,
                browser=browser,
                operating_system=(
                    operating_system
                ),
                visited_page=visited_page,
                date_from=date_from,
                date_to=date_to,
                guest_only=guest_only,
            )
        )

        return (
            query
            .order_by(
                VisitorLog.visited_at
                .desc(),
                VisitorLog.id.desc(),
            )
            .offset(safe_skip)
            .limit(safe_limit)
            .all()
        )

    # =====================================================
    # COUNT FILTERED LOGS
    # =====================================================

    @staticmethod
    def count_filtered(
        db: Session,
        session_id: str | None = None,
        user_id: int | None = None,
        browser: str | None = None,
        operating_system: str | None = None,
        visited_page: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        guest_only: bool = False,
    ) -> int:

        query = (
            VisitorLogCRUD
            ._apply_filters(
                db=db,
                session_id=session_id,
                user_id=user_id,
                browser=browser,
                operating_system=(
                    operating_system
                ),
                visited_page=visited_page,
                date_from=date_from,
                date_to=date_to,
                guest_only=guest_only,
            )
        )

        return int(
            query.count()
        )

    # =====================================================
    # TOTAL PAGE VISITS
    # =====================================================

    @staticmethod
    def count_total_visits(
        db: Session,
    ) -> int:

        return int(
            db.query(
                VisitorLog
            ).count()
        )

    # =====================================================
    # UNIQUE VISITORS
    # =====================================================

    @staticmethod
    def count_unique_visitors(
        db: Session,
    ) -> int:

        return int(
            (
                db.query(
                    func.count(
                        func.distinct(
                            VisitorLog.session_id
                        )
                    )
                )
                .filter(
                    VisitorLog.session_id
                    .isnot(None),

                    VisitorLog.session_id
                    != "",
                )
                .scalar()
            )
            or 0
        )

    # =====================================================
    # TODAY PAGE VISITS
    # =====================================================

    @staticmethod
    def count_today_visits(
        db: Session,
    ) -> int:

        start_of_day, end_of_day = (
            VisitorLogCRUD
            ._today_range()
        )

        return int(
            (
                db.query(
                    VisitorLog
                )
                .filter(
                    VisitorLog.visited_at
                    >= start_of_day,

                    VisitorLog.visited_at
                    < end_of_day,
                )
                .count()
            )
            or 0
        )

    # =====================================================
    # TODAY UNIQUE VISITORS
    # =====================================================

    @staticmethod
    def count_today_unique_visitors(
        db: Session,
    ) -> int:

        start_of_day, end_of_day = (
            VisitorLogCRUD
            ._today_range()
        )

        return int(
            (
                db.query(
                    func.count(
                        func.distinct(
                            VisitorLog.session_id
                        )
                    )
                )
                .filter(
                    VisitorLog.session_id
                    .isnot(None),

                    VisitorLog.session_id
                    != "",

                    VisitorLog.visited_at
                    >= start_of_day,

                    VisitorLog.visited_at
                    < end_of_day,
                )
                .scalar()
            )
            or 0
        )

    # =====================================================
    # TOTAL GUEST PAGE VISITS
    # =====================================================

    @staticmethod
    def count_guest_visits(
        db: Session,
    ) -> int:

        return int(
            (
                db.query(
                    VisitorLog
                )
                .filter(
                    VisitorLog.user_id
                    .is_(None)
                )
                .count()
            )
            or 0
        )

    # =====================================================
    # UNIQUE GUEST VISITORS
    # =====================================================

    @staticmethod
    def count_unique_guest_visitors(
        db: Session,
    ) -> int:

        return int(
            (
                db.query(
                    func.count(
                        func.distinct(
                            VisitorLog.session_id
                        )
                    )
                )
                .filter(
                    VisitorLog.user_id
                    .is_(None),

                    VisitorLog.session_id
                    .isnot(None),

                    VisitorLog.session_id
                    != "",
                )
                .scalar()
            )
            or 0
        )

    # =====================================================
    # TODAY GUEST PAGE VISITS
    # =====================================================

    @staticmethod
    def count_today_guest_visits(
        db: Session,
    ) -> int:

        start_of_day, end_of_day = (
            VisitorLogCRUD
            ._today_range()
        )

        return int(
            (
                db.query(
                    VisitorLog
                )
                .filter(
                    VisitorLog.user_id
                    .is_(None),

                    VisitorLog.visited_at
                    >= start_of_day,

                    VisitorLog.visited_at
                    < end_of_day,
                )
                .count()
            )
            or 0
        )

    # =====================================================
    # TODAY UNIQUE GUEST VISITORS
    # =====================================================

    @staticmethod
    def count_today_unique_guest_visitors(
        db: Session,
    ) -> int:

        start_of_day, end_of_day = (
            VisitorLogCRUD
            ._today_range()
        )

        return int(
            (
                db.query(
                    func.count(
                        func.distinct(
                            VisitorLog.session_id
                        )
                    )
                )
                .filter(
                    VisitorLog.user_id
                    .is_(None),

                    VisitorLog.session_id
                    .isnot(None),

                    VisitorLog.session_id
                    != "",

                    VisitorLog.visited_at
                    >= start_of_day,

                    VisitorLog.visited_at
                    < end_of_day,
                )
                .scalar()
            )
            or 0
        )

    # =====================================================
    # TOP VISITED PAGES
    # =====================================================

    @staticmethod
    def top_pages(
        db: Session,
        limit: int = 5,
        guest_only: bool = False,
    ) -> list[dict[str, int | str]]:

        safe_limit = min(
            max(
                int(limit or 5),
                1,
            ),
            100,
        )

        query = (
            db.query(
                VisitorLog.visited_page
                .label("page"),

                func.count(
                    VisitorLog.id
                ).label("visits"),
            )
            .filter(
                VisitorLog.visited_page
                .isnot(None),

                VisitorLog.visited_page
                != "",
            )
        )

        if guest_only:
            query = query.filter(
                VisitorLog.user_id
                .is_(None)
            )

        rows = (
            query
            .group_by(
                VisitorLog.visited_page
            )
            .order_by(
                func.count(
                    VisitorLog.id
                ).desc(),

                VisitorLog.visited_page
                .asc(),
            )
            .limit(safe_limit)
            .all()
        )

        return [
            {
                "visited_page": str(
                    row.page
                ),
                "visit_count": int(
                    row.visits or 0
                ),
            }
            for row in rows
        ]

    # =====================================================
    # TOP BROWSERS
    # =====================================================

    @staticmethod
    def top_browsers(
        db: Session,
        limit: int = 5,
        guest_only: bool = False,
    ) -> list[dict[str, int | str]]:

        safe_limit = min(
            max(
                int(limit or 5),
                1,
            ),
            100,
        )

        query = (
            db.query(
                VisitorLog.browser
                .label("browser"),

                func.count(
                    VisitorLog.id
                ).label("visits"),
            )
            .filter(
                VisitorLog.browser
                .isnot(None),

                VisitorLog.browser
                != "",
            )
        )

        if guest_only:
            query = query.filter(
                VisitorLog.user_id
                .is_(None)
            )

        rows = (
            query
            .group_by(
                VisitorLog.browser
            )
            .order_by(
                func.count(
                    VisitorLog.id
                ).desc(),

                VisitorLog.browser.asc(),
            )
            .limit(safe_limit)
            .all()
        )

        return [
            {
                "browser": str(
                    row.browser
                ),
                "visit_count": int(
                    row.visits or 0
                ),
            }
            for row in rows
        ]

    # =====================================================
    # TOP OPERATING SYSTEMS
    # =====================================================

    @staticmethod
    def top_operating_systems(
        db: Session,
        limit: int = 5,
        guest_only: bool = False,
    ) -> list[dict[str, int | str]]:

        safe_limit = min(
            max(
                int(limit or 5),
                1,
            ),
            100,
        )

        query = (
            db.query(
                VisitorLog.operating_system
                .label(
                    "operating_system"
                ),

                func.count(
                    VisitorLog.id
                ).label("visits"),
            )
            .filter(
                VisitorLog.operating_system
                .isnot(None),

                VisitorLog.operating_system
                != "",
            )
        )

        if guest_only:
            query = query.filter(
                VisitorLog.user_id
                .is_(None)
            )

        rows = (
            query
            .group_by(
                VisitorLog.operating_system
            )
            .order_by(
                func.count(
                    VisitorLog.id
                ).desc(),

                VisitorLog.operating_system
                .asc(),
            )
            .limit(safe_limit)
            .all()
        )

        return [
            {
                "operating_system": str(
                    row.operating_system
                ),
                "visit_count": int(
                    row.visits or 0
                ),
            }
            for row in rows
        ]

    # =====================================================
    # DELETE OLD LOGS
    # =====================================================

    @staticmethod
    def cleanup(
        db: Session,
        before: datetime,
        guest_only: bool = False,
    ) -> int:

        query = (
            db.query(
                VisitorLog
            )
            .filter(
                VisitorLog.visited_at
                < before
            )
        )

        if guest_only:
            query = query.filter(
                VisitorLog.user_id
                .is_(None)
            )

        try:
            deleted_rows = (
                query.delete(
                    synchronize_session=False
                )
            )

            db.commit()

            return int(
                deleted_rows or 0
            )

        except Exception:
            db.rollback()
            raise

    # =====================================================
    # PRIVATE FILTER BUILDER
    # =====================================================

    @staticmethod
    def _apply_filters(
        db: Session,
        session_id: str | None = None,
        user_id: int | None = None,
        browser: str | None = None,
        operating_system: str | None = None,
        visited_page: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        guest_only: bool = False,
    ) -> Query:

        query = db.query(
            VisitorLog
        )

        # Only anonymous visits.
        if guest_only:
            query = query.filter(
                VisitorLog.user_id
                .is_(None)
            )

        if (
            session_id
            and session_id.strip()
        ):
            query = query.filter(
                VisitorLog.session_id
                .ilike(
                    f"%{session_id.strip()}%"
                )
            )

        if user_id is not None:
            query = query.filter(
                VisitorLog.user_id
                == user_id
            )

        if (
            browser
            and browser.strip()
        ):
            query = query.filter(
                VisitorLog.browser
                .ilike(
                    f"%{browser.strip()}%"
                )
            )

        if (
            operating_system
            and operating_system.strip()
        ):
            query = query.filter(
                VisitorLog.operating_system
                .ilike(
                    f"%{operating_system.strip()}%"
                )
            )

        if (
            visited_page
            and visited_page.strip()
        ):
            query = query.filter(
                VisitorLog.visited_page
                .ilike(
                    f"%{visited_page.strip()}%"
                )
            )

        if date_from is not None:
            query = query.filter(
                VisitorLog.visited_at
                >= date_from
            )

        if date_to is not None:
            query = query.filter(
                VisitorLog.visited_at
                <= date_to
            )

        return query

    # =====================================================
    # PRIVATE TODAY RANGE
    # =====================================================

    @staticmethod
    def _today_range(
    ) -> tuple[datetime, datetime]:

        today = date.today()

        start_of_day = (
            datetime.combine(
                today,
                time.min,
            )
        )

        end_of_day = (
            start_of_day
            + timedelta(days=1)
        )

        return (
            start_of_day,
            end_of_day,
        )