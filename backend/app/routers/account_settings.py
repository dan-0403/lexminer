from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import (
    get_current_active_user,
)
from app.models.user import User
from app.schemas.account_settings_schema import (
    ChangePasswordRequest,
)
from app.schemas.account_settings_schema import (
    ChangePasswordResponse,
)
from app.services.account_settings_service import (
    AccountSettingsService,
)


router = APIRouter(
    prefix="/api/user/account-settings",
    tags=[
        "User Account Settings",
    ],
)


# =====================================================
# CHANGE PASSWORD
# =====================================================

@router.put(
    "/password",
    response_model=(
        ChangePasswordResponse
    ),
    status_code=(
        status.HTTP_200_OK
    ),
    summary=(
        "Change authenticated user password"
    ),
)
def change_password(
    request: ChangePasswordRequest,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_active_user
    ),
) -> ChangePasswordResponse:

    service = (
        AccountSettingsService(
            db
        )
    )

    try:
        result = service.change_password(
            user=current_user,

            current_password=(
                request.current_password
            ),

            new_password=(
                request.new_password
            ),

            confirm_password=(
                request.confirm_password
            ),
        )

        return ChangePasswordResponse(
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