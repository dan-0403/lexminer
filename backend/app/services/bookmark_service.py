import math
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.bookmark import Bookmark
from app.models.user import User
from app.repositories.bookmark_repository import (
    BookmarkRepository,
)
from app.repositories.case_repository import (
    CaseRepository,
)


class BookmarkService:
    """
    Manage authenticated user bookmarks.
    """

    MAX_PAGE_SIZE = 100

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.bookmark_repository = (
            BookmarkRepository(
                db
            )
        )

        self.case_repository = (
            CaseRepository(
                db
            )
        )

    # =====================================================
    # ADD BOOKMARK
    # =====================================================

    def add_bookmark(
        self,
        user: User,
        case_id: int,
    ) -> dict[str, Any]:

        self._validate_user(
            user
        )

        self._validate_case_id(
            case_id
        )

        case = (
            self.case_repository
            .get_by_id(
                case_id
            )
        )

        if case is None:
            raise ValueError(
                "Case not found."
            )

        existing_bookmark = (
            self.bookmark_repository
            .get_by_user_and_case(
                user_id=user.id,
                case_id=case_id,
            )
        )

        if existing_bookmark:
            return {
                "bookmarked": True,

                "bookmark_id": (
                    existing_bookmark.id
                ),

                "message": (
                    "This case is already bookmarked."
                ),
            }

        try:
            bookmark = (
                self.bookmark_repository
                .create(
                    user_id=user.id,
                    case_id=case_id,
                )
            )

        except IntegrityError:
            existing_bookmark = (
                self.bookmark_repository
                .get_by_user_and_case(
                    user_id=user.id,
                    case_id=case_id,
                )
            )

            if existing_bookmark:
                return {
                    "bookmarked": True,

                    "bookmark_id": (
                        existing_bookmark.id
                    ),

                    "message": (
                        "This case is already bookmarked."
                    ),
                }

            raise RuntimeError(
                "The bookmark could not be created."
            )

        except Exception as exc:
            raise RuntimeError(
                "The bookmark could not be created."
            ) from exc

        return {
            "bookmarked": True,

            "bookmark_id": (
                bookmark.id
            ),

            "message": (
                "Case bookmarked successfully."
            ),
        }

    # =====================================================
    # REMOVE BOOKMARK
    # =====================================================

    def remove_bookmark(
        self,
        user: User,
        case_id: int,
    ) -> dict[str, Any]:

        self._validate_user(
            user
        )

        self._validate_case_id(
            case_id
        )

        bookmark = (
            self.bookmark_repository
            .get_by_user_and_case(
                user_id=user.id,
                case_id=case_id,
            )
        )

        if bookmark is None:
            return {
                "bookmarked": False,

                "bookmark_id": None,

                "message": (
                    "This case was not bookmarked."
                ),
            }

        try:
            self.bookmark_repository.delete(
                bookmark
            )

        except Exception as exc:
            raise RuntimeError(
                "The bookmark could not be removed."
            ) from exc

        return {
            "bookmarked": False,

            "bookmark_id": None,

            "message": (
                "Bookmark removed successfully."
            ),
        }

    # =====================================================
    # STATUS
    # =====================================================

    def get_bookmark_status(
        self,
        user: User,
        case_id: int,
    ) -> dict[str, Any]:

        self._validate_user(
            user
        )

        self._validate_case_id(
            case_id
        )

        bookmark = (
            self.bookmark_repository
            .get_by_user_and_case(
                user_id=user.id,
                case_id=case_id,
            )
        )

        return {
            "case_id": (
                case_id
            ),

            "bookmarked": (
                bookmark is not None
            ),

            "bookmark_id": (
                bookmark.id
                if bookmark
                else None
            ),
        }

    # =====================================================
    # LIST BOOKMARKS
    # =====================================================

    def get_user_bookmarks(
        self,
        user: User,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        year: int | None = None,
        sort: str = "newest",
    ) -> dict[str, Any]:

        self._validate_user(
            user
        )

        if page < 1:
            raise ValueError(
                "Page must be greater than zero."
            )

        if (
            page_size < 1
            or page_size
            > self.MAX_PAGE_SIZE
        ):
            raise ValueError(
                "Page size must be between 1 and "
                f"{self.MAX_PAGE_SIZE}."
            )

        normalized_sort = str(
            sort or "newest"
        ).strip().lower()

        if normalized_sort not in {
            "newest",
            "oldest",
        }:
            raise ValueError(
                "Sort must be either newest or oldest."
            )

        if (
            year is not None
            and (
                year < 1900
                or year > 2100
            )
        ):
            raise ValueError(
                "Year must be between 1900 and 2100."
            )

        normalized_search = (
            " ".join(
                str(
                    search or ""
                )
                .strip()
                .split()
            )
            or None
        )

        total_items = (
            self.bookmark_repository
            .count_user_bookmarks(
                user_id=user.id,
                search=normalized_search,
                year=year,
            )
        )

        total_pages = (
            math.ceil(
                total_items
                / page_size
            )
            if total_items > 0
            else 0
        )

        bookmarks = (
            self.bookmark_repository
            .list_user_bookmarks(
                user_id=user.id,
                page=page,
                page_size=page_size,
                search=normalized_search,
                year=year,
                sort=normalized_sort,
            )
        )

        items = [
            self._serialize_bookmark(
                bookmark
            )
            for bookmark in bookmarks
        ]

        return {
            "page": page,

            "page_size": (
                page_size
            ),

            "total_items": (
                total_items
            ),

            "total_pages": (
                total_pages
            ),

            "items": items,
        }

    # =====================================================
    # AVAILABLE YEARS
    # =====================================================

    def get_bookmarked_years(
        self,
        user: User,
    ) -> dict[str, list[int]]:

        self._validate_user(
            user
        )

        years = (
            self.bookmark_repository
            .get_bookmarked_years(
                user_id=user.id
            )
        )

        return {
            "years": years,
        }

    # =====================================================
    # SERIALIZE BOOKMARK
    # =====================================================

    @staticmethod
    def _serialize_bookmark(
        bookmark: Bookmark,
    ) -> dict[str, Any]:

        case = bookmark.case

        if case is None:
            raise RuntimeError(
                "The bookmarked case could not be loaded."
            )

        return {
            "id": (
                bookmark.id
            ),

            "bookmarked_at": (
                bookmark.created_at
            ),

            "case": {
                "id": (
                    case.id
                ),

                "title": (
                    case.title
                    or "Untitled Case"
                ),

                "case_number": (
                    case.case_number
                    or "Case number unavailable"
                ),

                "year": (
                    case.year
                ),

                "month": (
                    case.month
                ),

                "decision_date": (
                    case.decision_date.isoformat()
                    if case.decision_date
                    else None
                ),

                "division": (
                    case.division
                ),

                "ponencia": (
                    case.ponencia
                ),

                "case_type": (
                    getattr(
                        case,
                        "case_type",
                        None,
                    )
                ),

                "pdf_url": (
                    f"/api/user/cases/"
                    f"{case.id}/pdf"
                ),
            },
        }

    # =====================================================
    # VALIDATION
    # =====================================================

    @staticmethod
    def _validate_user(
        user: User,
    ) -> None:

        if user is None:
            raise ValueError(
                "User not found."
            )

        if not user.is_active:
            raise ValueError(
                "Inactive user account."
            )

        if (
            user.deleted_at
            is not None
        ):
            raise ValueError(
                "Deleted user account."
            )

    @staticmethod
    def _validate_case_id(
        case_id: int,
    ) -> None:

        if case_id < 1:
            raise ValueError(
                "Case ID must be greater than zero."
            )