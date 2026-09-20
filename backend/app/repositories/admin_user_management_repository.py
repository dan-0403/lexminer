from datetime import date
from datetime import datetime
from datetime import time
from datetime import timedelta
from math import ceil

from sqlalchemy import asc
from sqlalchemy import desc
from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.enums.role import Role
from app.models.user import User
from app.models.visitor_log import VisitorLog


class AdminUserManagementRepository:

    def __init__(self, db: Session):
        self.db = db

    # =========================================================
    # USER MANAGEMENT
    # =========================================================

    def get_users(
        self,
        search: str | None,
        status: str | None,
        locked: str | None,
        verified: str | None,
        deleted: str | None,
        sort: str,
        page: int,
        page_size: int,
    ) -> dict:
        query = self.db.query(User)

        # Only registered users are managed here.
        # Administrator accounts will not appear in this list.
        query = query.filter(User.role == Role.REGISTERED)

        if search:
            normalized_search = f"%{search.strip().lower()}%"

            query = query.filter(
                or_(
                    func.lower(User.first_name).like(normalized_search),
                    func.lower(User.last_name).like(normalized_search),
                    func.lower(User.email).like(normalized_search),
                    func.lower(
                        func.concat(
                            User.first_name,
                            " ",
                            User.last_name,
                        )
                    ).like(normalized_search),
                )
            )

        if status == "active":
            query = query.filter(User.is_active.is_(True))

        elif status == "inactive":
            query = query.filter(User.is_active.is_(False))

        if locked == "locked":
            query = query.filter(User.is_locked.is_(True))

        elif locked == "unlocked":
            query = query.filter(User.is_locked.is_(False))

        if verified == "verified":
            query = query.filter(User.is_verified.is_(True))

        elif verified == "unverified":
            query = query.filter(User.is_verified.is_(False))

        if deleted == "deleted":
            query = query.filter(User.deleted_at.is_not(None))

        elif deleted == "not_deleted":
            query = query.filter(User.deleted_at.is_(None))

        # Default behavior hides soft-deleted accounts.
        elif deleted is None or deleted == "all_active_records":
            query = query.filter(User.deleted_at.is_(None))

        if sort == "oldest":
            query = query.order_by(asc(User.created_at))

        elif sort == "name_asc":
            query = query.order_by(
                asc(User.first_name),
                asc(User.last_name),
            )

        elif sort == "name_desc":
            query = query.order_by(
                desc(User.first_name),
                desc(User.last_name),
            )

        elif sort == "failed_login_highest":
            query = query.order_by(
                desc(User.failed_login_attempts),
                desc(User.created_at),
            )

        elif sort == "last_updated":
            query = query.order_by(desc(User.updated_at))

        else:
            query = query.order_by(desc(User.created_at))

        total = query.count()
        total_pages = ceil(total / page_size) if total > 0 else 1

        offset = (page - 1) * page_size

        users = (
            query
            .offset(offset)
            .limit(page_size)
            .all()
        )

        return {
            "items": users,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def get_registered_user_by_id(
        self,
        user_id: int,
        include_deleted: bool = True,
    ) -> User | None:
        query = (
            self.db.query(User)
            .filter(
                User.id == user_id,
                User.role == Role.REGISTERED,
            )
        )

        if not include_deleted:
            query = query.filter(User.deleted_at.is_(None))

        return query.first()

    def save_user(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return user

    # =========================================================
    # VISITOR LOG MANAGEMENT
    # =========================================================

    def get_visitor_logs(
        self,
        search: str | None,
        visitor_type: str | None,
        date_from: date | None,
        date_to: date | None,
        page: int,
        page_size: int,
    ) -> dict:
        query = (
            self.db.query(VisitorLog)
            .options(joinedload(VisitorLog.user))
            .outerjoin(
                User,
                VisitorLog.user_id == User.id,
            )
        )

        if search:
            normalized_search = f"%{search.strip().lower()}%"

            query = query.filter(
                or_(
                    func.lower(VisitorLog.session_id).like(
                        normalized_search
                    ),
                    func.lower(
                        func.coalesce(
                            VisitorLog.ip_address,
                            "",
                        )
                    ).like(normalized_search),
                    func.lower(
                        func.coalesce(
                            VisitorLog.browser,
                            "",
                        )
                    ).like(normalized_search),
                    func.lower(
                        func.coalesce(
                            VisitorLog.operating_system,
                            "",
                        )
                    ).like(normalized_search),
                    func.lower(VisitorLog.visited_page).like(
                        normalized_search
                    ),
                    func.lower(
                        func.coalesce(
                            User.first_name,
                            "",
                        )
                    ).like(normalized_search),
                    func.lower(
                        func.coalesce(
                            User.last_name,
                            "",
                        )
                    ).like(normalized_search),
                    func.lower(
                        func.coalesce(
                            User.email,
                            "",
                        )
                    ).like(normalized_search),
                )
            )

        if visitor_type == "guest":
            query = query.filter(VisitorLog.user_id.is_(None))

        elif visitor_type == "registered":
            query = query.filter(VisitorLog.user_id.is_not(None))

        if date_from:
            start_datetime = datetime.combine(
                date_from,
                time.min,
            )

            query = query.filter(
                VisitorLog.visited_at >= start_datetime
            )

        if date_to:
            end_datetime = datetime.combine(
                date_to + timedelta(days=1),
                time.min,
            )

            query = query.filter(
                VisitorLog.visited_at < end_datetime
            )

        query = query.order_by(
            desc(VisitorLog.visited_at)
        )

        total = query.count()
        total_pages = ceil(total / page_size) if total > 0 else 1

        offset = (page - 1) * page_size

        logs = (
            query
            .offset(offset)
            .limit(page_size)
            .all()
        )

        return {
            "items": logs,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def delete_visitor_logs_before(
        self,
        before_date: date,
    ) -> int:
        cutoff_datetime = datetime.combine(
            before_date,
            time.min,
        )

        deleted_count = (
            self.db.query(VisitorLog)
            .filter(
                VisitorLog.visited_at < cutoff_datetime
            )
            .delete(synchronize_session=False)
        )

        self.db.commit()

        return deleted_count

    def create_visitor_log(
        self,
        *,
        session_id: str,
        ip_address: str | None,
        browser: str | None,
        operating_system: str | None,
        visited_page: str,
        user_id: int | None,
    ) -> VisitorLog:
        visitor_log = VisitorLog(
            session_id=session_id,
            ip_address=ip_address,
            browser=browser,
            operating_system=operating_system,
            visited_page=visited_page,
            user_id=user_id,
        )

        self.db.add(visitor_log)
        self.db.commit()
        self.db.refresh(visitor_log)

        return visitor_log

    # =========================================================
    # STATISTICS
    # =========================================================

    def get_statistics(self) -> dict:
        now = datetime.now().astimezone()
        today_start = now.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

        week_start = today_start - timedelta(
            days=today_start.weekday()
        )

        month_start = today_start.replace(day=1)

        user_base = self.db.query(User).filter(
            User.role == Role.REGISTERED
        )

        total_registered_users = (
            user_base
            .filter(User.deleted_at.is_(None))
            .count()
        )

        total_active_users = (
            user_base
            .filter(
                User.deleted_at.is_(None),
                User.is_active.is_(True),
            )
            .count()
        )

        total_inactive_users = (
            user_base
            .filter(
                User.deleted_at.is_(None),
                User.is_active.is_(False),
            )
            .count()
        )

        total_locked_users = (
            user_base
            .filter(
                User.deleted_at.is_(None),
                User.is_locked.is_(True),
            )
            .count()
        )

        total_soft_deleted_users = (
            user_base
            .filter(User.deleted_at.is_not(None))
            .count()
        )

        total_visitor_logs = (
            self.db.query(func.count(VisitorLog.id))
            .scalar()
            or 0
        )

        total_guest_visitor_logs = (
            self.db.query(func.count(VisitorLog.id))
            .filter(VisitorLog.user_id.is_(None))
            .scalar()
            or 0
        )

        total_registered_visitor_logs = (
            self.db.query(func.count(VisitorLog.id))
            .filter(VisitorLog.user_id.is_not(None))
            .scalar()
            or 0
        )

        total_unique_guest_sessions = (
            self.db.query(
                func.count(
                    func.distinct(VisitorLog.session_id)
                )
            )
            .filter(VisitorLog.user_id.is_(None))
            .scalar()
            or 0
        )

        visits_today = (
            self.db.query(func.count(VisitorLog.id))
            .filter(
                VisitorLog.visited_at >= today_start
            )
            .scalar()
            or 0
        )

        visits_this_week = (
            self.db.query(func.count(VisitorLog.id))
            .filter(
                VisitorLog.visited_at >= week_start
            )
            .scalar()
            or 0
        )

        visits_this_month = (
            self.db.query(func.count(VisitorLog.id))
            .filter(
                VisitorLog.visited_at >= month_start
            )
            .scalar()
            or 0
        )

        comparison_total = (
            total_registered_users +
            total_guest_visitor_logs
        )

        if comparison_total > 0:
            registered_percentage = round(
                (
                    total_registered_users /
                    comparison_total
                ) * 100,
                2,
            )

            guest_percentage = round(
                (
                    total_guest_visitor_logs /
                    comparison_total
                ) * 100,
                2,
            )
        else:
            registered_percentage = 0
            guest_percentage = 0

        guest_difference = (
            total_guest_visitor_logs -
            total_registered_users
        )

        return {
            "total_registered_users": total_registered_users,
            "total_active_users": total_active_users,
            "total_inactive_users": total_inactive_users,
            "total_locked_users": total_locked_users,
            "total_soft_deleted_users": total_soft_deleted_users,
            "total_visitor_logs": total_visitor_logs,
            "total_guest_visitor_logs": (
                total_guest_visitor_logs
            ),
            "total_registered_visitor_logs": (
                total_registered_visitor_logs
            ),
            "total_unique_guest_sessions": (
                total_unique_guest_sessions
            ),
            "visits_today": visits_today,
            "visits_this_week": visits_this_week,
            "visits_this_month": visits_this_month,
            "registered_percentage": registered_percentage,
            "guest_percentage": guest_percentage,
            "guest_difference": guest_difference,
        }