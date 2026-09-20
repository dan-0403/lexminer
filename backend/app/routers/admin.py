from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from fastapi import Query
from fastapi import status
from datetime import datetime

from uuid import UUID

from app.enums import ImportStatus

from app.enums import AuthProvider
from app.models.user import User
from app.enums.decision_month import DecisionMonth
from app.services.dataset_management_service import (
    DatasetManagementService,
)

from app.schemas.dataset_management_schema import (
    DatasetActionResponse,
    DatasetDeleteResponse,
    DatasetDetailResponse,
    DatasetListResponse,
    DatasetQueueResponse,
)

from app.schemas.admin_user_management_schema import (
    AdminUserManagementSummaryResponse,
    GuestVisitorLogListResponse,
    RegisteredUserActionResponse,
    RegisteredUserDeleteResponse,
    RegisteredUserDetailResponse,
    RegisteredUserListResponse,
)
from app.services.admin_user_management_service import (
    AdminUserManagementService,
)


from app.dependencies.auth import get_current_admin, require_role
from app.core.database import get_db
from app.enums.role import Role
from fastapi import File
from fastapi import Form
from fastapi import HTTPException
from fastapi import UploadFile


import uuid
from fastapi import BackgroundTasks

from app.schemas.dataset_import_job_schema import (
    DatasetImportJobCreateResponse,
    DatasetImportJobResponse,
)

from app.services.dataset_import_job_service import (
    DatasetImportJobService,
)

from app.tasks.dataset_import_task import (
    run_dataset_import_job,
)
from app.services.admin_dataset_service import (
    AdminDatasetService,
)

from app.services.dataset_queue_service import (
    DatasetQueueService,
)

from app.services.dataset_service import DatasetService

from app.schemas.visitor_log_schema import (
    VisitorLogCleanupResponse,
    VisitorLogListResponse,
    VisitorAnalyticsResponse,
)

from app.schemas.admin_user_schema import (
    AdminUserListResponse, 
    AdminUserResponse,
)
from app.schemas.vector_index_schema import (
    VectorIndexRebuildResponse,
)
from app.services.vector_index_service import (
    VectorIndexService,
)

from app.schemas.admin_analytics_schema import (
    AdminAnalyticsResponse,
)
from app.services.admin_analytics_service import (
    AdminAnalyticsService,
)
from app.schemas.admin_profile_schema import (
    AdminPasswordUpdateRequest,
    AdminPasswordUpdateResponse,
    AdminProfileResponse,
    AdminProfileUpdateRequest,
    AdminProfileUpdateResponse,
)
from app.services.admin_profile_service import (
    AdminProfileService,
)
router = APIRouter(
    prefix="/api/admin",
    tags=["Administration"],
)


@router.get("/dashboard")
def dashboard(
     admin=Depends(
        require_role(Role.ADMIN)
    )
):

    return {
        "message": "Welcome Administrator",
        "admin": {
            "id": admin.id,
            "name": f"{admin.first_name} {admin.last_name}",
            "email": admin.email,
            "role": admin.role.value,
        }
    }

#=====================================================
# IMPORT DATASETS AND INDEX DOCUMENTS
#====================================================
@router.post("/datasets/import")
def import_datasets(

    db: Session = Depends(get_db),

    admin=Depends
    (require_role(Role.ADMIN)),

    ):

    service = DatasetService(db)

    import_summary = service.import_datasets()

    indexing_summary = service.process_pending_documents()

    return {

        "import": import_summary,

        "indexed": indexing_summary,

    }

# =====================================================
# UPLOAD SUPREME COURT PDF DATASETS
# =====================================================

@router.post(
    "/datasets/upload-pdfs",
    status_code=status.HTTP_200_OK,
)
async def upload_pdfs(
    year: int = Form(...),
    month: DecisionMonth = Form(...),
    files: list[UploadFile] = File(...),
    admin=Depends(
        require_role(Role.ADMIN)
    ),
):
    service = AdminDatasetService()

    try:
        return await service.upload_pdfs(
            year=year,
            month=month,
            files=files,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error



# =====================================================
# GET PAGINATED DATASET QUEUE
# =====================================================

@router.get(
    "/datasets/queue",
    response_model=DatasetQueueResponse,
    status_code=status.HTTP_200_OK,
)
def get_dataset_queue(
    queue_status: str | None = Query(
        default=None,
        pattern="^(PENDING|FAILED)$",
    ),
    filename: str | None = Query(
        default=None,
        min_length=1,
        max_length=255,
    ),
    year: int | None = Query(
        default=None,
        ge=1900,
        le=2100,
    ),
    month: str | None = Query(
        default=None,
        min_length=1,
        max_length=20,
    ),
    skip: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=25,
        ge=1,
        le=100,
    ),
    db: Session = Depends(
        get_db
    ),
    _admin=Depends(
        require_role(
            Role.ADMIN
        )
    ),
):

    service = DatasetQueueService(
        db
    )

    return service.get_queue(
        queue_status=queue_status,
        filename=filename,
        year=year,
        month=month,
        skip=skip,
        limit=limit,
    )
# =====================================================
# LIST DATASETS
# =====================================================

@router.get(
    "/datasets",
    response_model=DatasetListResponse,
    status_code=status.HTTP_200_OK,
)
def get_datasets(
    import_status: ImportStatus | None = Query(
        default=None,
        description=(
            "Filter datasets by import status."
        ),
    ),
    filename: str | None = Query(
        default=None,
        min_length=1,
        max_length=255,
        description=(
            "Search datasets by filename."
        ),
    ),
    year: int | None = Query(
        default=None,
        ge=1900,
        le=2100,
        description=(
            "Filter datasets by year."
        ),
    ),
    month: str | None = Query(
        default=None,
        min_length=1,
        max_length=20,
        description=(
            "Filter datasets by month."
        ),
    ),
    is_indexed: bool | None = Query(
        default=None,
        description=(
            "Filter indexed or unindexed datasets."
        ),
    ),
    skip: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
):

    service = DatasetManagementService(db)

    return service.get_datasets(
        status_filter=import_status,
        filename=filename,
        year=year,
        month=month,
        is_indexed=is_indexed,
        skip=skip,
        limit=limit,
    )


# =====================================================
# VIEW DATASET DETAILS
# =====================================================

@router.get(
    "/datasets/{dataset_id}",
    response_model=DatasetDetailResponse,
)
def get_dataset(
    dataset_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
):
    service = DatasetService(db)

    result = service.get_dataset_detail(
        dataset_id
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Dataset was not found.",
        )

    return result

# =====================================================
# PROCESS DATASET
# =====================================================

@router.post(
    "/datasets/{dataset_id}/process",
    response_model=DatasetActionResponse,
    status_code=status.HTTP_200_OK,
)
def process_dataset(
    dataset_id: UUID,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
):

    service = DatasetManagementService(db)

    return service.process_dataset(
        dataset_id=dataset_id
    )


# =====================================================
# RETRY FAILED DATASET
# =====================================================

@router.post(
    "/datasets/{dataset_id}/retry",
    response_model=DatasetActionResponse,
    status_code=status.HTTP_200_OK,
)
def retry_dataset(
    dataset_id: UUID,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
):

    service = DatasetManagementService(db)

    return service.retry_dataset(
        dataset_id=dataset_id
    )


# =====================================================
# REPROCESS DATASET
# =====================================================

@router.post(
    "/datasets/{dataset_id}/reprocess",
    response_model=DatasetActionResponse,
    status_code=status.HTTP_200_OK,
)
def reprocess_dataset(
    dataset_id: UUID,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
):

    service = DatasetManagementService(db)

    return service.reprocess_dataset(
        dataset_id=dataset_id
    )

# =====================================================
# DELETE DATASET
# =====================================================

@router.delete(
    "/datasets/{dataset_id}",
    response_model=DatasetDeleteResponse,
    status_code=status.HTTP_200_OK,
)
def delete_dataset(
    dataset_id: UUID,
    delete_file: bool = Query(
        default=False,
        description=(
            "Also delete the PDF file from disk."
        ),
    ),
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
):

    service = DatasetManagementService(db)

    return service.delete_dataset(
        dataset_id=dataset_id,
        delete_file=delete_file,
    )

# =====================================================
# OPEN DATASET PDF
# =====================================================

@router.get(
    "/datasets/{dataset_id}/pdf",
    summary="Open dataset PDF",
    response_class=FileResponse,
)
def open_dataset_pdf(
    dataset_id: UUID,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
):

    service = DatasetManagementService(db)

    return service.open_pdf(
        dataset_id=dataset_id
    )

# =====================================================
# DOWNLOAD DATASET PDF
# =====================================================

@router.get(
    "/datasets/{dataset_id}/download",
    summary="Download dataset PDF",
    response_class=FileResponse,
)
def download_dataset_pdf(
    dataset_id: UUID,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
):

    service = DatasetManagementService(db)

    return service.download_pdf(
        dataset_id=dataset_id
    )

# =====================================================
# REBUILD VECTOR INDEX
# =====================================================

@router.post(
    "/datasets/vector-index/rebuild",
    response_model=VectorIndexRebuildResponse,
    status_code=status.HTTP_200_OK,
    summary="Rebuild ChromaDB vector index",
)
def rebuild_vector_index(
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
) -> VectorIndexRebuildResponse:

    service = VectorIndexService(db)

    result = service.rebuild_vector_index()

    return VectorIndexRebuildResponse(
        **result
    )

# =====================================================
# SYSTEM ANALYTICS
# =====================================================

@router.get(
    "/analytics",
    response_model=AdminAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get admin system analytics",
)
def get_system_analytics(
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
) -> AdminAnalyticsResponse:

    service = AdminAnalyticsService(db)

    result = service.get_analytics()

    return AdminAnalyticsResponse(
        **result
    )

# =====================================================
# Admin  Profile
# =====================================================
@router.get(
    "/profile",
    response_model=AdminProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get admin profile",
)
def get_admin_profile(
    db: Session = Depends(get_db),
    admin: User = Depends(
        require_role(Role.ADMIN)
    ),
) -> AdminProfileResponse:

    service = AdminProfileService(db)

    result = service.get_profile(
        admin
    )

    return AdminProfileResponse(
        **result
    )

@router.put(
    "/profile",
    response_model=(
        AdminProfileUpdateResponse
    ),
    status_code=status.HTTP_200_OK,
    summary="Update admin profile",
)
def update_admin_profile(
    payload: AdminProfileUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(
        require_role(Role.ADMIN)
    ),
) -> AdminProfileUpdateResponse:

    service = AdminProfileService(db)

    result = service.update_profile(
        admin=admin,
        payload=payload,
    )

    return AdminProfileUpdateResponse(
        **result
    )

@router.put(
    "/profile/password",
    response_model=(
        AdminPasswordUpdateResponse
    ),
    status_code=status.HTTP_200_OK,
    summary="Update admin password",
)
def update_admin_password(
    payload: AdminPasswordUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(
        require_role(Role.ADMIN)
    ),
) -> AdminPasswordUpdateResponse:

    service = AdminProfileService(db)

    result = service.update_password(
        admin=admin,
        payload=payload,
    )

    return AdminPasswordUpdateResponse(
        **result
    )

@router.post(
    "/datasets/import-jobs",
    response_model=(
        DatasetImportJobCreateResponse
    ),
    status_code=status.HTTP_202_ACCEPTED,
)
def create_dataset_import_job(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(
            Role.ADMIN
        )
    ),
):

    service = DatasetImportJobService(
        db
    )

    try:
        job = service.create_job()

    except ValueError as error:

        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    background_tasks.add_task(
        run_dataset_import_job,
        job.id,
    )

    return {
        "job_id": job.id,
        "status": job.status,
        "message": (
            "Dataset import job started."
        ),
    }

@router.get(
    "/datasets/import-jobs/{job_id}",
    response_model=(
        DatasetImportJobResponse
    ),
)
def get_dataset_import_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(
            Role.ADMIN
        )
    ),
):

    service = DatasetImportJobService(
        db
    )

    job = service.get_job(
        job_id
    )

    if job is None:

        raise HTTPException(
            status_code=404,
            detail=(
                "Dataset import job "
                "was not found."
            ),
        )

    return job

# =====================================================
# GET USER MANAGEMENT SUMMARY
# =====================================================

@router.get(
    "/user-management/summary",
    response_model=AdminUserManagementSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user management summary",
)
def get_user_management_summary(
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
) -> AdminUserManagementSummaryResponse:

    service = AdminUserManagementService(
        db
    )

    result = (
        service.get_management_summary()
    )

    return (
        AdminUserManagementSummaryResponse(
            **result
        )
    )

@router.get(
    "/user-management/users",
    response_model=RegisteredUserListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get registered users",
)
def get_registered_users(
    skip: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=25,
        ge=1,
        le=100,
    ),
    search: str | None = Query(
        default=None,
        max_length=255,
    ),
    is_active: bool | None = Query(
        default=None,
    ),
    is_locked: bool | None = Query(
        default=None,
    ),
    is_verified: bool | None = Query(
        default=None,
    ),
    auth_provider: AuthProvider | None = Query(
        default=None,
    ),
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
) -> RegisteredUserListResponse:

    service = AdminUserManagementService(
        db
    )

    result = service.get_registered_users(
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
        is_locked=is_locked,
        is_verified=is_verified,
        auth_provider=auth_provider,
    )

    return RegisteredUserListResponse(
        **result
    )

@router.get(
    "/user-management/users/{user_id}",
    response_model=RegisteredUserDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get registered user detail",
)
def get_registered_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(
        require_role(Role.ADMIN)
    ),
) -> RegisteredUserDetailResponse:

    service = AdminUserManagementService(
        db
    )

    user = service.get_registered_user(
        user_id
    )

    return RegisteredUserDetailResponse.model_validate(
        user
    )

@router.post(
    "/user-management/users/{user_id}/activate",
    response_model=RegisteredUserActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Activate registered user",
)
def activate_registered_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
) -> RegisteredUserActionResponse:

    service = AdminUserManagementService(
        db
    )

    result = service.activate_user(
        user_id
    )

    return RegisteredUserActionResponse(
        **result
    )

@router.post(
    "/user-management/users/{user_id}/deactivate",
    response_model=RegisteredUserActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Deactivate registered user",
)
def deactivate_registered_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
) -> RegisteredUserActionResponse:

    service = AdminUserManagementService(
        db
    )

    result = service.deactivate_user(
        user_id
    )

    return RegisteredUserActionResponse(
        **result
    )

@router.post(
    "/user-management/users/{user_id}/lock",
    response_model=RegisteredUserActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Lock registered user",
)
def lock_registered_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
) -> RegisteredUserActionResponse:

    service = AdminUserManagementService(
        db
    )

    result = service.lock_user(
        user_id
    )

    return RegisteredUserActionResponse(
        **result
    )

@router.post(
    "/user-management/users/{user_id}/unlock",
    response_model=RegisteredUserActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Unlock registered user",
)
def unlock_registered_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
) -> RegisteredUserActionResponse:

    service = AdminUserManagementService(
        db
    )

    result = service.unlock_user(
        user_id
    )

    return RegisteredUserActionResponse(
        **result
    )

@router.delete(
    "/user-management/users/{user_id}",
    response_model=RegisteredUserDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Soft-delete registered user",
)
def delete_registered_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
) -> RegisteredUserDeleteResponse:

    service = AdminUserManagementService(
        db
    )

    result = service.delete_user(
        user_id
    )

    return RegisteredUserDeleteResponse(
        **result
    )

@router.get(
    "/user-management/guest-logs",
    response_model=GuestVisitorLogListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get guest visitor logs",
)
def get_guest_visitor_logs(
    session_id: str | None = Query(
        default=None,
        max_length=255,
    ),
    browser: str | None = Query(
        default=None,
        max_length=150,
    ),
    operating_system: str | None = Query(
        default=None,
        max_length=150,
    ),
    visited_page: str | None = Query(
        default=None,
        max_length=255,
    ),
    date_from: datetime | None = Query(
        default=None,
    ),
    date_to: datetime | None = Query(
        default=None,
    ),
    skip: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=25,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
    _admin=Depends(
        require_role(Role.ADMIN)
    ),
) -> GuestVisitorLogListResponse:

    if (
        date_from is not None
        and date_to is not None
        and date_from > date_to
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The date_from value cannot be later "
                "than date_to."
            ),
        )

    service = AdminUserManagementService(
        db
    )

    result = service.get_guest_visitor_logs(
        session_id=session_id,
        browser=browser,
        operating_system=operating_system,
        visited_page=visited_page,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )

    return GuestVisitorLogListResponse(
        **result
    )

