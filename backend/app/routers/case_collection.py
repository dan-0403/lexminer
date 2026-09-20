from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.config import settings
from app.core.database import get_db
from app.schemas.case_collection_schema import (
    CaseCollectionArchiveResponse,
)
from app.schemas.case_collection_schema import (
    CollectionMonthCasesResponse,
)
from app.services.case_collection_service import (
    CaseCollectionService,
)


router = APIRouter(
    prefix="/api/user/case-collection",
    tags=[
        "Public Case Collection",
    ],
)


# =====================================================
# GET ARCHIVE CALENDAR
# =====================================================

@router.get(
    "/archive",
    response_model=(
        CaseCollectionArchiveResponse
    ),
    status_code=(
        status.HTTP_200_OK
    ),
    summary=(
        "Get case decision archive by year and month"
    ),
)
def get_case_archive(
    start_year: int = Query(
        default=(
            settings.DATASET_MIN_YEAR
        ),
        ge=(
            settings.DATASET_MIN_YEAR
        ),
        le=(
            settings.DATASET_MAX_YEAR
        ),
        description=(
            "First archive year to include."
        ),
    ),

    end_year: int = Query(
        default=(
            settings.DATASET_MAX_YEAR
        ),
        ge=(
            settings.DATASET_MIN_YEAR
        ),
        le=(
            settings.DATASET_MAX_YEAR
        ),
        description=(
            "Last archive year to include."
        ),
    ),

    db: Session = Depends(
        get_db
    ),
) -> CaseCollectionArchiveResponse:

    service = (
        CaseCollectionService(
            db
        )
    )

    try:

        result = service.get_archive(
            start_year=(
                start_year
            ),
            end_year=(
                end_year
            ),
        )

        return (
            CaseCollectionArchiveResponse(
                **result
            )
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
                .HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(
                exc
            ),
        ) from exc


# =====================================================
# GET CASES BY YEAR AND MONTH
# =====================================================

@router.get(
    "/cases",
    response_model=(
        CollectionMonthCasesResponse
    ),
    status_code=(
        status.HTTP_200_OK
    ),
    summary=(
        "Get case decisions for a selected month"
    ),
)
def get_collection_cases(
    year: int = Query(
        ge=(
            settings.DATASET_MIN_YEAR
        ),
        le=(
            settings.DATASET_MAX_YEAR
        ),
        description=(
            "Decision year."
        ),
    ),

    month: int = Query(
        ge=1,
        le=12,
        description=(
            "Decision month from 1 to 12."
        ),
    ),

    db: Session = Depends(
        get_db
    ),
) -> CollectionMonthCasesResponse:

    service = (
        CaseCollectionService(
            db
        )
    )

    try:

        result = (
            service
            .get_month_cases(
                year=year,
                month=month,
            )
        )

        return (
            CollectionMonthCasesResponse(
                **result
            )
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
                .HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(
                exc
            ),
        ) from exc


# =====================================================
# VIEW ORIGINAL CASE PDF INLINE
# =====================================================

# =====================================================
# VIEW DATASET PDF INLINE
# =====================================================

@router.get(
    "/datasets/{dataset_id}/pdf",
    status_code=(
        status.HTTP_200_OK
    ),
    summary=(
        "View an original dataset PDF inline"
    ),
    response_class=FileResponse,
)
def view_dataset_pdf(
    dataset_id: UUID,

    db: Session = Depends(
        get_db
    ),
) -> FileResponse:

    service = (
        CaseCollectionService(
            db
        )
    )

    try:

        pdf_path = (
            service
            .get_dataset_pdf(
                dataset_id
            )
        )

        return FileResponse(
            path=str(
                pdf_path
            ),

            media_type=(
                "application/pdf"
            ),

            filename=(
                pdf_path.name
            ),

            content_disposition_type=(
                "inline"
            ),

            headers={
                "Cache-Control": (
                    "private, max-age=3600"
                ),

                "X-Content-Type-Options": (
                    "nosniff"
                ),
            },
        )

    except ValueError as exc:

        message = str(
            exc
        )

        if message in {
            "Dataset file not found.",
            "Original dataset PDF not found.",
        }:

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
                .HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(
                exc
            ),
        ) from exc