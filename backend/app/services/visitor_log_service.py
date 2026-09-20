from datetime import datetime
from datetime import timedelta
from datetime import timezone
from ipaddress import ip_address

from fastapi import Request
from sqlalchemy.orm import Session
from user_agents import parse

from app.models.user import User
from app.models.visitor_log import VisitorLog
from app.repositories.visitor_log_repository import VisitorLogRepository
from app.schemas.visitor_log import VisitorLogCreateRequest


class VisitorLogService:

    # Prevent the same session from recording the same page
    # repeatedly within this number of seconds.
    DUPLICATE_WINDOW_SECONDS = 5

    def __init__(
        self,
        db: Session,
    ):
        self.db = db

        self.repository = VisitorLogRepository(
            db
        )

    # =====================================================
    # CLIENT IP ADDRESS
    # =====================================================

    @staticmethod
    def _get_client_ip(
        request: Request,
    ) -> str | None:

        forwarded_for = request.headers.get(
            "X-Forwarded-For"
        )

        if forwarded_for:
            candidate = (
                forwarded_for
                .split(",")[0]
                .strip()
            )
        else:
            candidate = (
                request.client.host
                if request.client
                else None
            )

        if not candidate:
            return None

        try:
            return str(
                ip_address(candidate)
            )

        except ValueError:
            return candidate[:100]

    # =====================================================
    # BROWSER
    # =====================================================

    @staticmethod
    def _get_browser(
        request: Request,
    ) -> str | None:

        raw_user_agent = request.headers.get(
            "User-Agent",
            "",
        )

        if not raw_user_agent:
            return None

        parsed_user_agent = parse(
            raw_user_agent
        )

        browser_family = (
            parsed_user_agent
            .browser
            .family
        )

        browser_version = (
            parsed_user_agent
            .browser
            .version_string
        )

        if (
            browser_family
            and browser_version
        ):
            return (
                f"{browser_family} "
                f"{browser_version}"
            )[:150]

        if browser_family:
            return browser_family[:150]

        return None

    # =====================================================
    # OPERATING SYSTEM
    # =====================================================

    @staticmethod
    def _get_operating_system(
        request: Request,
    ) -> str | None:

        raw_user_agent = request.headers.get(
            "User-Agent",
            "",
        )

        if not raw_user_agent:
            return None

        parsed_user_agent = parse(
            raw_user_agent
        )

        os_family = (
            parsed_user_agent
            .os
            .family
        )

        os_version = (
            parsed_user_agent
            .os
            .version_string
        )

        if (
            os_family
            and os_version
        ):
            return (
                f"{os_family} "
                f"{os_version}"
            )[:150]

        if os_family:
            return os_family[:150]

        return None

    # =====================================================
    # NORMALIZE SESSION ID
    # =====================================================

    @staticmethod
    def _normalize_session_id(
        session_id: str,
    ) -> str:

        return (
            str(session_id)
            .strip()
        )[:255]

    # =====================================================
    # NORMALIZE VISITED PAGE
    # =====================================================

    @staticmethod
    def _normalize_visited_page(
        visited_page: str,
    ) -> str:

        normalized_page = (
            str(visited_page)
            .strip()
        )

        if not normalized_page:
            normalized_page = "/"

        if not normalized_page.startswith("/"):
            normalized_page = (
                f"/{normalized_page}"
            )

        return normalized_page[:255]

    # =====================================================
    # FIND RECENT DUPLICATE
    # =====================================================

    def _find_recent_duplicate(
        self,
        session_id: str,
        visited_page: str,
        user_id: int | None,
    ) -> VisitorLog | None:

        cutoff_time = (
            datetime.now(timezone.utc)
            - timedelta(
                seconds=self.DUPLICATE_WINDOW_SECONDS
            )
        )

        query = (
            self.db
            .query(VisitorLog)
            .filter(
                VisitorLog.session_id == session_id,
                VisitorLog.visited_page == visited_page,
                VisitorLog.visited_at >= cutoff_time,
            )
        )

        # Keep guest and authenticated visits separate.
        if user_id is None:
            query = query.filter(
                VisitorLog.user_id.is_(None)
            )
        else:
            query = query.filter(
                VisitorLog.user_id == user_id
            )

        return (
            query
            .order_by(
                VisitorLog.visited_at.desc()
            )
            .first()
        )

    # =====================================================
    # CREATE VISITOR LOG
    # =====================================================

    def create_visit(
        self,
        request_data: VisitorLogCreateRequest,
        http_request: Request,
        current_user: User | None = None,
    ) -> VisitorLog:

        normalized_session_id = (
            self._normalize_session_id(
                request_data.session_id
            )
        )

        normalized_visited_page = (
            self._normalize_visited_page(
                request_data.visited_page
            )
        )

        current_user_id = (
            current_user.id
            if current_user is not None
            else None
        )

        # -------------------------------------------------
        # DUPLICATE PROTECTION
        # -------------------------------------------------
        #
        # If the same browser session records the same page
        # within five seconds, return the existing log instead
        # of inserting another database row.
        #
        recent_duplicate = (
            self._find_recent_duplicate(
                session_id=normalized_session_id,
                visited_page=normalized_visited_page,
                user_id=current_user_id,
            )
        )

        if recent_duplicate is not None:
            return recent_duplicate

        # -------------------------------------------------
        # CREATE NEW VISITOR LOG
        # -------------------------------------------------

        visitor_log = VisitorLog(
            session_id=normalized_session_id,

            ip_address=self._get_client_ip(
                http_request
            ),

            browser=self._get_browser(
                http_request
            ),

            operating_system=(
                self._get_operating_system(
                    http_request
                )
            ),

            visited_page=normalized_visited_page,

            user_id=current_user_id,
        )

        return self.repository.create(
            visitor_log
        )