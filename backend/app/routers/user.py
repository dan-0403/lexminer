from fastapi import APIRouter
from fastapi import Depends
from fastapi import Request
from sqlalchemy.orm import Session
from pathlib import Path 
from app.dependencies.auth import (
    get_current_user,
    require_role,
)
from fastapi.responses import FileResponse

from app.enums.role import Role

from app.core.database import get_db
from app.schemas.match_explanation_schema import (
    MatchExplanationRequest,
)

from app.services.match_explanation_service import (
    MatchExplanationService,
)
from app.repositories.case_repository import CaseRepository
from app.schemas.search_schema import SearchRequest
from app.services.search_service import SearchService
from app.schemas.case_request_schema import CaseRequest
from app.services.explanation_service import ExplanationService
from app.schemas.summary_schema import SummaryRequest
from app.services.summary_service import SummaryService
from app.services.case_viewer_service import CaseViewerService
from app.schemas.case_viewer_schema import CaseViewerResponse, CaseViewerRequest
from app.schemas.explanation_schema import CaseExplanationRequest
from fastapi import (
    APIRouter,
    HTTPException,
    status,
)
from app.schemas.search_schema import (
    SearchRequest,
    SemanticSearchResponse,
)




router = APIRouter(
    prefix="/api/user",
    tags=["User Services"],
)


@router.post(
    "/search",
    response_model=SemanticSearchResponse,
)
def semantic_search(
    request: SearchRequest,
    db: Session = Depends(
        get_db
    ),
):

    service = SearchService(
        db
    )

    try:
        return service.semantic_search(
            query=request.query,
            limit=request.limit,
            filters=request.filters,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error
# ==========================================================
# GET CLEANED CASE VIEWER
# PUBLIC
# ==========================================================
@router.post(
    "/case-viewer/cases/{case_id}",
    response_model=CaseViewerResponse,
    status_code=status.HTTP_200_OK,
    summary="Get complete cleaned case viewer",
)
def case_viewer(
    case_id: int,
    request: CaseViewerRequest,
    db: Session = Depends(get_db),
) -> CaseViewerResponse:

    service = CaseViewerService(db)

    try:
        result = service.get_case(
            case_id=case_id,
            request=request,
        )

        return CaseViewerResponse(
            **result
        )

    except ValueError as exc:
        message = str(exc)

        if message == "Case not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            ) from exc

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message,
        ) from exc

# ==========================================================
# GENERATE CASE SUMMARY
# REGISTERED USER ONLY
# ==========================================================

@router.post(
    "/case-viewer/generate-summary",
    status_code=status.HTTP_200_OK,
    summary="Generate AI case summary",
)
def generate_summary(
    request: SummaryRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(
        require_role(Role.REGISTERED)
    ),
):

    service = SummaryService(db)

    try:
        return service.generate_summary(
            case_id=request.case_id
        )

    except ValueError as exc:
        message = str(exc)

        if message == "Case not found.":
            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
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
            detail=str(exc),
        ) from exc


# ==========================================================
# GENERATE WHY-IT-MATCHED EXPLANATION
# REGISTERED USER ONLY
# ==========================================================

@router.post(
    "/case-viewer/generate-explanation",
    status_code=(
        status.HTTP_200_OK
    ),
    summary=(
        "Generate AI case explanation"
    ),
)
def generate_explanation(
    request: CaseExplanationRequest,

    db: Session = Depends(
        get_db
    ),

    _current_user=Depends(
        require_role(
            Role.REGISTERED
        )
    ),
):

    service = (
        ExplanationService(
            db
        )
    )

    try:

        return (
            service
            .generate_explanation(
                request=request
            )
        )

    except ValueError as exc:

        message = str(
            exc
        )

        if message == (
            "Case not found."
        ):

            raise HTTPException(
                status_code=(
                    status
                    .HTTP_404_NOT_FOUND
                ),
                detail=message,
            ) from exc

        if message == (
            "No indexed chunks found "
            "for this case."
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
                .HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(
                exc
            ),
        ) from exc

    # ==========================================================
# GENERATE MATCH EXPLANATION
# REGISTERED USER ONLY
# ==========================================================

@router.post(
    "/case-viewer/generate-match-explanation",
    status_code=status.HTTP_200_OK,
    summary="Generate AI explanation of search match",
)
def generate_match_explanation(
    request: MatchExplanationRequest,
    db: Session = Depends(
        get_db
    ),
    _current_user=Depends(
        require_role(
            Role.REGISTERED
        )
    ),
):
    """
    Generate an AI explanation of why the selected
    Supreme Court decision matched the user's search.

    The MatchExplanationService:
    - validates the case
    - verifies the matched chunk numbers
    - retrieves the actual indexed chunks from PostgreSQL
    - builds the match explanation prompt
    - calls OpenAIGenerator.generate_match_explanation()
    """

    service = (
        MatchExplanationService(
            db
        )
    )

    try:

        return (
            service
            .generate_match_explanation(
                request=request
            )
        )

    except ValueError as exc:

        message = str(
            exc
        )

        # -------------------------------------------------
        # CASE NOT FOUND
        # -------------------------------------------------

        if message == (
            "Case not found."
        ):

            raise HTTPException(
                status_code=(
                    status
                    .HTTP_404_NOT_FOUND
                ),
                detail=message,
            ) from exc

        # -------------------------------------------------
        # NO INDEXED CHUNKS
        # -------------------------------------------------

        if message == (
            "No indexed chunks found "
            "for this case."
        ):

            raise HTTPException(
                status_code=(
                    status
                    .HTTP_404_NOT_FOUND
                ),
                detail=message,
            ) from exc

        # -------------------------------------------------
        # NO MATCHED PASSAGES
        # -------------------------------------------------

        if message == (
            "No matched passages were supplied "
            "for this search result."
        ):

            raise HTTPException(
                status_code=(
                    status
                    .HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=message,
            ) from exc

        # -------------------------------------------------
        # GENERAL VALIDATION ERROR
        # -------------------------------------------------

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


# ==========================================================
# VIEW ORIGINAL PDF
# PUBLIC
# ==========================================================

@router.get(
    "/cases/{case_id}/pdf",
    summary="View original Supreme Court PDF",
)
def view_original_case_pdf(
    case_id: int,
    db: Session = Depends(get_db),
):

    repository = CaseRepository(db)

    case = repository.get_by_id(
        case_id
    )

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )

    if not case.pdf_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original PDF is unavailable.",
        )

    pdf_path = Path(
        case.pdf_path
    ).resolve()

    if (
        not pdf_path.exists()
        or not pdf_path.is_file()
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original PDF file was not found.",
        )

    if pdf_path.suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail="The stored file is not a PDF.",
        )

    return FileResponse(
        path=pdf_path,

        media_type="application/pdf",

        filename=pdf_path.name,

        content_disposition_type="inline",
    )