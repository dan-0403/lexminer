from fastapi import APIRouter
from fastapi import Depends
from fastapi import Request
from fastapi import status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_optional_current_user
from app.models.user import User
from app.schemas.visitor_log import (
    VisitorLogCreateRequest,
    VisitorLogCreateResponse,
    VisitorLogResponse,
)
from app.services.visitor_log_service import VisitorLogService


router = APIRouter(
    prefix="/api/visitor-logs",
    tags=["Visitor Logs"],
)


@router.post(
    "",
    response_model=VisitorLogCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record visitor activity",
)
def create_visitor_log(
    payload: VisitorLogCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(
        get_optional_current_user
    ),
) -> VisitorLogCreateResponse:
    service = VisitorLogService(
        db
    )

    visitor_log = service.create_visit(
        request_data=payload,
        http_request=request,
        current_user=current_user,
    )

    return VisitorLogCreateResponse(
        success=True,
        message="Visitor activity recorded successfully.",
        visitor_log=VisitorLogResponse.model_validate(
            visitor_log
        ),
    )