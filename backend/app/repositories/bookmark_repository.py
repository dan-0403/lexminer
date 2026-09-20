from sqlalchemy import asc
from sqlalchemy import desc
from sqlalchemy import func
from sqlalchemy.orm import Query
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.models.bookmark import Bookmark
from app.models.case import Case


class BookmarkRepository:
    """
    Handle database operations for user bookmarks.
    """

    def __init__(
        self,
        db: Session,
    ) -> None:
        self.db = db

    # =====================================================
    # GET BY USER AND CASE
    # =====================================================

    def get_by_user_and_case(
        self,
        user_id: int,
        case_id: int,
    ) -> Bookmark | None:

        return (
            self.db
            .query(
                Bookmark
            )
            .filter(
                Bookmark.user_id
                == user_id,

                Bookmark.case_id
                == case_id,
            )
            .first()
        )

    # =====================================================
    # CREATE
    # =====================================================

    def create(
        self,
        user_id: int,
        case_id: int,
    ) -> Bookmark:

        bookmark = Bookmark(
            user_id=user_id,
            case_id=case_id,
        )

        try:
            self.db.add(
                bookmark
            )

            self.db.commit()

            self.db.refresh(
                bookmark
            )

            return bookmark

        except Exception:
            self.db.rollback()
            raise

    # =====================================================
    # DELETE
    # =====================================================

    def delete(
        self,
        bookmark: Bookmark,
    ) -> None:

        try:
            self.db.delete(
                bookmark
            )

            self.db.commit()

        except Exception:
            self.db.rollback()
            raise

    # =====================================================
    # BASE LIST QUERY
    # =====================================================

    def _build_user_query(
        self,
        user_id: int,
        search: str | None = None,
        year: int | None = None,
    ) -> Query:

        query = (
            self.db
            .query(
                Bookmark
            )
            .join(
                Case,
                Case.id
                == Bookmark.case_id,
            )
            .options(
                joinedload(
                    Bookmark.case
                )
            )
            .filter(
                Bookmark.user_id
                == user_id
            )
        )

        normalized_search = str(
            search or ""
        ).strip()

        if normalized_search:
            search_pattern = (
                f"%{normalized_search}%"
            )

            query = query.filter(
                (
                    Case.title.ilike(
                        search_pattern
                    )
                )
                |
                (
                    Case.case_number.ilike(
                        search_pattern
                    )
                )
                |
                (
                    Case.ponencia.ilike(
                        search_pattern
                    )
                )
            )

        if year is not None:
            query = query.filter(
                Case.year
                == year
            )

        return query

    # =====================================================
    # COUNT USER BOOKMARKS
    # =====================================================

    def count_user_bookmarks(
        self,
        user_id: int,
        search: str | None = None,
        year: int | None = None,
    ) -> int:

        query = self._build_user_query(
            user_id=user_id,
            search=search,
            year=year,
        )

        return int(
            query.count()
        )

    # =====================================================
    # LIST USER BOOKMARKS
    # =====================================================

    def list_user_bookmarks(
        self,
        user_id: int,
        page: int,
        page_size: int,
        search: str | None = None,
        year: int | None = None,
        sort: str = "newest",
    ) -> list[Bookmark]:

        query = self._build_user_query(
            user_id=user_id,
            search=search,
            year=year,
        )

        if sort == "oldest":
            query = query.order_by(
                asc(
                    Bookmark.created_at
                ),
                asc(
                    Bookmark.id
                ),
            )
        else:
            query = query.order_by(
                desc(
                    Bookmark.created_at
                ),
                desc(
                    Bookmark.id
                ),
            )

        offset = (
            page - 1
        ) * page_size

        return (
            query
            .offset(
                offset
            )
            .limit(
                page_size
            )
            .all()
        )

    # =====================================================
    # GET AVAILABLE YEARS
    # =====================================================

    def get_bookmarked_years(
        self,
        user_id: int,
    ) -> list[int]:

        rows = (
            self.db
            .query(
                Case.year
            )
            .join(
                Bookmark,
                Bookmark.case_id
                == Case.id,
            )
            .filter(
                Bookmark.user_id
                == user_id,

                Case.year.isnot(
                    None
                ),
            )
            .distinct()
            .order_by(
                Case.year.desc()
            )
            .all()
        )

        return [
            int(
                row[0]
            )
            for row in rows
            if row[0] is not None
        ]