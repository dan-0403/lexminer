from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import HTTPException
from fastapi import UploadFile
from fastapi import status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import (
    get_current_active_user,
)
from app.models.user import User
from app.schemas.user_profile_schema import (
    ProfilePictureResponse,
)
from app.schemas.user_profile_schema import (
    UpdateUserProfileRequest,
)
from app.schemas.user_profile_schema import (
    UserProfileResponse,
)
from app.services.user_profile_service import (
    UserProfileService,
)


router = APIRouter(
    prefix="/api/user/profile",
    tags=[
        "User Profile",
    ],
)


# =====================================================
# GET PROFILE
# =====================================================

@router.get(
    "",
    response_model=(
        UserProfileResponse
    ),
    status_code=(
        status.HTTP_200_OK
    ),
)
def get_profile(
    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_active_user
    ),
) -> UserProfileResponse:

    service = (
        UserProfileService(
            db
        )
    )

    result = service.get_profile(
        current_user
    )

    return UserProfileResponse(
        **result
    )


# =====================================================
# UPDATE PROFILE
# =====================================================

@router.put(
    "",
    response_model=(
        UserProfileResponse
    ),
    status_code=(
        status.HTTP_200_OK
    ),
)
def update_profile(
    request: UpdateUserProfileRequest,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_active_user
    ),
) -> UserProfileResponse:

    service = (
        UserProfileService(
            db
        )
    )

    try:
        result = service.update_profile(
            user=current_user,
            first_name=(
                request.first_name
            ),
            last_name=(
                request.last_name
            ),
        )

        return UserProfileResponse(
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
# UPLOAD PROFILE PICTURE
# =====================================================

@router.post(
    "/picture",
    response_model=(
        ProfilePictureResponse
    ),
    status_code=(
        status.HTTP_200_OK
    ),
    summary=(
        "Upload user profile picture"
    ),
)
async def upload_profile_picture(
    file: UploadFile = File(
        ...,
        description=(
            "JPG, PNG, or WEBP profile image."
        ),
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_active_user
    ),
) -> ProfilePictureResponse:

    service = (
        UserProfileService(
            db
        )
    )

    try:
        result = (
            await service
            .upload_profile_picture(
                user=current_user,
                file=file,
            )
        )

        return ProfilePictureResponse(
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

    except OSError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "LexMiner could not save "
                "the profile picture."
            ),
        ) from exc

    finally:
        await file.close()


# =====================================================
# DELETE PROFILE PICTURE
# =====================================================

@router.delete(
    "/picture",
    response_model=(
        ProfilePictureResponse
    ),
    status_code=(
        status.HTTP_200_OK
    ),
)
def delete_profile_picture(
    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_active_user
    ),
) -> ProfilePictureResponse:

    service = (
        UserProfileService(
            db
        )
    )

    result = (
        service
        .delete_profile_picture(
            current_user
        )
    )

    return ProfilePictureResponse(
        **result
    )