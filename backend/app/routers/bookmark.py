from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Path
from fastapi import Query
from fastapi import status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import (
    get_current_active_user,
)
from app.models.user import User
from app.schemas.bookmark_schema import (
    BookmarkListResponse,
)
from app.schemas.bookmark_schema import (
    BookmarkMutationResponse,
)
from app.schemas.bookmark_schema import (
    BookmarkStatusResponse,
)
from app.schemas.bookmark_schema import (
    BookmarkYearsResponse,
)
from app.services.bookmark_service import (
    BookmarkService,
)


router = APIRouter(
    prefix="/api/user/bookmarks",
    tags=[
        "User Bookmarks",
    ],
)


# =====================================================
# LIST BOOKMARKS
# =====================================================

@router.get(
    "",
    response_model=(
        BookmarkListResponse
    ),
    status_code=(
        status.HTTP_200_OK
    ),
    summary=(
        "List authenticated user bookmarks"
    ),
)
def get_bookmarks(
    page: int = Query(
        default=1,
        ge=1,
    ),

    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),

    search: str | None = Query(
        default=None,
        max_length=300,
    ),

    year: int | None = Query(
        default=None,
        ge=1900,
        le=2100,
    ),

    sort: str = Query(
        default="newest",
        pattern="^(newest|oldest)$",
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_active_user
    ),
) -> BookmarkListResponse:

    service = (
        BookmarkService(
            db
        )
    )

    try:
        result = (
            service
            .get_user_bookmarks(
                user=current_user,
                page=page,
                page_size=page_size,
                search=search,
                year=year,
                sort=sort,
            )
        )

        return BookmarkListResponse(
            **result
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=str(
                exc
            ),
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(
                exc
            ),
        ) from exc


# =====================================================
# BOOKMARK YEARS
# =====================================================

@router.get(
    "/years",
    response_model=(
        BookmarkYearsResponse
    ),
    status_code=(
        status.HTTP_200_OK
    ),
    summary=(
        "Get years represented in bookmarks"
    ),
)
def get_bookmark_years(
    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_active_user
    ),
) -> BookmarkYearsResponse:

    service = (
        BookmarkService(
            db
        )
    )

    result = (
        service
        .get_bookmarked_years(
            current_user
        )
    )

    return BookmarkYearsResponse(
        **result
    )


# =====================================================
# BOOKMARK STATUS
# =====================================================

@router.get(
    "/{case_id}/status",
    response_model=(
        BookmarkStatusResponse
    ),
    status_code=(
        status.HTTP_200_OK
    ),
    summary=(
        "Get bookmark status for a case"
    ),
)
def get_bookmark_status(
    case_id: int = Path(
        ge=1,
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_active_user
    ),
) -> BookmarkStatusResponse:

    service = (
        BookmarkService(
            db
        )
    )

    try:
        result = (
            service
            .get_bookmark_status(
                user=current_user,
                case_id=case_id,
            )
        )

        return BookmarkStatusResponse(
            **result
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=str(
                exc
            ),
        ) from exc


# =====================================================
# ADD BOOKMARK
# =====================================================

@router.post(
    "/{case_id}",
    response_model=(
        BookmarkMutationResponse
    ),
    status_code=(
        status.HTTP_200_OK
    ),
    summary=(
        "Bookmark a case"
    ),
)
def add_bookmark(
    case_id: int = Path(
        ge=1,
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_active_user
    ),
) -> BookmarkMutationResponse:

    service = (
        BookmarkService(
            db
        )
    )

    try:
        result = (
            service
            .add_bookmark(
                user=current_user,
                case_id=case_id,
            )
        )

        return BookmarkMutationResponse(
            **result
        )

    except ValueError as exc:
        message = str(
            exc
        )

        if (
            message
            == "Case not found."
        ):
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_404_NOT_FOUND
                ),
                detail=message,
            ) from exc

        raise HTTPException(
            status_code=(
                status
                .HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=message,
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(
                exc
            ),
        ) from exc


# =====================================================
# REMOVE BOOKMARK
# =====================================================

@router.delete(
    "/{case_id}",
    response_model=(
        BookmarkMutationResponse
    ),
    status_code=(
        status.HTTP_200_OK
    ),
    summary=(
        "Remove a case bookmark"
    ),
)
def remove_bookmark(
    case_id: int = Path(
        ge=1,
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_active_user
    ),
) -> BookmarkMutationResponse:

    service = (
        BookmarkService(
            db
        )
    )

    try:
        result = (
            service
            .remove_bookmark(
                user=current_user,
                case_id=case_id,
            )
        )

        return BookmarkMutationResponse(
            **result
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=str(
                exc
            ),
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(
                exc
            ),
        ) from exc