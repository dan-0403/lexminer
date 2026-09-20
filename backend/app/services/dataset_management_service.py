from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException
from fastapi import status
from fastapi.responses import FileResponse

from app.ai.vector_store import VectorStore
from app.enums import ImportStatus
from app.models.dataset_file import DatasetFile
from app.repositories.case_chunk_repository import (
    CaseChunkRepository,
)
from app.repositories.case_repository import (
    CaseRepository,
)
from app.repositories.dataset_repository import (
    DatasetRepository,
)
from app.services.dataset_service import (
    DatasetService,
)


class DatasetManagementService:

    def __init__(
        self,
        db,
    ) -> None:

        self.repository = DatasetRepository(db)

        self.case_repository = CaseRepository(db)

        self.case_chunk_repository = (
            CaseChunkRepository(db)
        )

        self.dataset_service = DatasetService(db)

    # =====================================================
    # LIST DATASETS
    # =====================================================

    def get_datasets(
        self,
        status_filter: ImportStatus | None = None,
        filename: str | None = None,
        year: int | None = None,
        month: str | None = None,
        is_indexed: bool | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> dict:

        if skip < 0:

            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "Skip must not be negative."
                ),
            )

        if limit < 1 or limit > 100:

            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "Limit must be between 1 and 100."
                ),
            )

        clean_filename = (
            filename.strip()
            if filename
            else None
        )

        clean_month = (
            month.strip()
            if month
            else None
        )

        datasets = self.repository.get_all(
            status=status_filter,
            filename=clean_filename,
            year=year,
            month=clean_month,
            is_indexed=is_indexed,
            skip=skip,
            limit=limit,
        )

        total = self.repository.count_filtered(
            status=status_filter,
            filename=clean_filename,
            year=year,
            month=clean_month,
            is_indexed=is_indexed,
        )

        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "datasets": [
                self._serialize_dataset(
                    dataset
                )
                for dataset in datasets
            ],
        }

    # =====================================================
    # GET DATASET DETAIL
    # =====================================================

    def get_dataset(
        self,
        dataset_id: UUID,
    ) -> dict:

        dataset = self._get_dataset_or_404(
            dataset_id
        )

        case = (
            self.case_repository
            .get_by_pdf_path(
                dataset.file_path
            )
        )

        response = self._serialize_dataset(
            dataset
        )

        response["case"] = None

        if case is not None:

            response["case"] = {
                "id": case.id,
                "title": case.title,
                "case_number": (
                    case.case_number
                ),
                "case_type": (
                    case.case_type.value
                    if (
                        case.case_type
                        and hasattr(
                            case.case_type,
                            "value",
                        )
                    )
                    else (
                        str(case.case_type)
                        if case.case_type
                        else None
                    )
                ),
                "division": case.division,
                "decision_date": (
                    case.decision_date
                    .isoformat()
                    if case.decision_date
                    else None
                ),
                "ponencia": case.ponencia,
                "stored_chunks": (
                    self.case_chunk_repository
                    .count_by_case_id(
                        case.id
                    )
                ),
                "stored_vectors": (
                    VectorStore.count_by_case_id(
                        case.id
                    )
                ),
            }

        response["pdf_url"] = (
            f"/api/admin/datasets/"
            f"{dataset.id}/pdf"
        )

        response["download_url"] = (
            f"/api/admin/datasets/"
            f"{dataset.id}/download"
        )

        return response

    # =====================================================
    # PROCESS DATASET
    # =====================================================

    def process_dataset(
        self,
        dataset_id: UUID,
    ) -> dict:

        dataset = self._get_dataset_or_404(
            dataset_id
        )

        self._validate_file_exists(
            dataset
        )

        if dataset.is_indexed:

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Dataset has already been indexed. "
                    "Use the reprocess endpoint instead."
                ),
            )

        if (
            dataset.import_status
            != ImportStatus.PENDING
        ):

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Only pending datasets can be processed."
                ),
            )

        result = self.dataset_service.process_dataset(
            dataset
        )

        updated_dataset = self._get_dataset_or_404(
            dataset_id
        )

        if result.get("status") == "Failed":

            return {
                "dataset_id": updated_dataset.id,
                "import_status": (
                    updated_dataset.import_status
                ),
                "message": (
                    result.get("error")
                    or updated_dataset.error_message
                    or "Dataset processing failed."
                ),
            }

        return {
            "dataset_id": updated_dataset.id,
            "import_status": (
                updated_dataset.import_status
            ),
            "message": (
                "Dataset processed successfully."
            ),
        }

    # =====================================================
    # RETRY FAILED DATASET
    # =====================================================

    def retry_dataset(
        self,
        dataset_id: UUID,
    ) -> dict:

        dataset = self._get_dataset_or_404(
            dataset_id
        )

        self._validate_file_exists(
            dataset
        )

        if (
            dataset.import_status
            != ImportStatus.FAILED
        ):

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Only failed datasets can be retried."
                ),
            )

        self._remove_indexed_case_data(
            dataset
        )

        dataset.import_status = (
            ImportStatus.PENDING
        )

        dataset.current_stage = None
        dataset.error_message = None
        dataset.is_indexed = False
        dataset.indexed_at = None
        dataset.chunk_count = 0
        dataset.last_processed_at = None

        self.repository.update(
            dataset
        )

        result = self.dataset_service.process_dataset(
            dataset
        )

        updated_dataset = self._get_dataset_or_404(
            dataset_id
        )

        if result.get("status") == "Failed":

            return {
                "dataset_id": updated_dataset.id,
                "import_status": (
                    updated_dataset.import_status
                ),
                "message": (
                    result.get("error")
                    or updated_dataset.error_message
                    or "Dataset retry failed."
                ),
            }

        return {
            "dataset_id": updated_dataset.id,
            "import_status": (
                updated_dataset.import_status
            ),
            "message": (
                "Dataset retried successfully."
            ),
        }

    # =====================================================
    # REPROCESS DATASET
    # =====================================================

    def reprocess_dataset(
        self,
        dataset_id: UUID,
    ) -> dict:

        dataset = self._get_dataset_or_404(
            dataset_id
        )

        self._validate_file_exists(
            dataset
        )

        self._remove_indexed_case_data(
            dataset
        )

        dataset.import_status = (
            ImportStatus.PENDING
        )

        dataset.current_stage = None
        dataset.error_message = None
        dataset.is_indexed = False
        dataset.indexed_at = None
        dataset.chunk_count = 0
        dataset.last_processed_at = None

        self.repository.update(
            dataset
        )

        result = self.dataset_service.process_dataset(
            dataset
        )

        updated_dataset = self._get_dataset_or_404(
            dataset_id
        )

        if result.get("status") == "Failed":

            return {
                "dataset_id": updated_dataset.id,
                "import_status": (
                    updated_dataset.import_status
                ),
                "message": (
                    result.get("error")
                    or updated_dataset.error_message
                    or "Dataset reprocessing failed."
                ),
            }

        return {
            "dataset_id": updated_dataset.id,
            "import_status": (
                updated_dataset.import_status
            ),
            "message": (
                "Dataset reprocessed successfully."
            ),
        }

    # =====================================================
    # DELETE DATASET
    # =====================================================

    def delete_dataset(
        self,
        dataset_id: UUID,
        delete_file: bool = False,
    ) -> dict:

        dataset = self._get_dataset_or_404(
            dataset_id
        )

        cleanup_summary = (
            self._remove_indexed_case_data(
                dataset
            )
        )

        file_deleted = False
        file_path = Path(dataset.file_path)

        if delete_file and file_path.exists():

            try:

                file_path.unlink()
                file_deleted = True

            except OSError as error:

                raise HTTPException(
                    status_code=(
                        status.HTTP_500_INTERNAL_SERVER_ERROR
                    ),
                    detail=(
                        "Database records were cleaned, "
                        "but the PDF could not be deleted: "
                        f"{error}"
                    ),
                ) from error

        deleted_dataset_id = dataset.id

        self.repository.delete(
            dataset
        )

        return {
            "dataset_id": deleted_dataset_id,
            "deleted_chunks": (
                cleanup_summary[
                    "deleted_chunks"
                ]
            ),
            "deleted_vectors": (
                cleanup_summary[
                    "deleted_vectors"
                ]
            ),
            "deleted_case": (
                cleanup_summary[
                    "deleted_case"
                ]
            ),
            "deleted_file": file_deleted,
            "message": (
                "Dataset deleted successfully."
            ),
        }

    # =====================================================
    # OPEN PDF
    # =====================================================

    def open_pdf(
        self,
        dataset_id: UUID,
    ) -> FileResponse:

        dataset = self._get_dataset_or_404(
            dataset_id
        )

        file_path = self._validate_file_exists(
            dataset
        )

        return FileResponse(
            path=str(file_path),
            media_type="application/pdf",
            filename=dataset.filename,
            content_disposition_type="inline",
        )

    # =====================================================
    # DOWNLOAD PDF
    # =====================================================

    def download_pdf(
        self,
        dataset_id: UUID,
    ) -> FileResponse:

        dataset = self._get_dataset_or_404(
            dataset_id
        )

        file_path = self._validate_file_exists(
            dataset
        )

        return FileResponse(
            path=str(file_path),
            media_type="application/pdf",
            filename=dataset.filename,
            content_disposition_type=(
                "attachment"
            ),
        )

    # =====================================================
    # REMOVE CASE, CHUNKS, AND VECTORS
    # =====================================================

    def _remove_indexed_case_data(
        self,
        dataset: DatasetFile,
    ) -> dict:

        deleted_vectors = 0
        deleted_chunks = 0
        deleted_case = False

        case = (
            self.case_repository
            .get_by_pdf_path(
                dataset.file_path
            )
        )

        if case is None:

            try:

                deleted_vectors = (
                    VectorStore
                    .delete_by_dataset_id(
                        dataset.id
                    )
                )

            except Exception as error:

                raise HTTPException(
                    status_code=(
                        status.HTTP_500_INTERNAL_SERVER_ERROR
                    ),
                    detail=(
                        "Failed to delete dataset "
                        "vectors: "
                        f"{error}"
                    ),
                ) from error

            return {
                "deleted_vectors": (
                    deleted_vectors
                ),
                "deleted_chunks": 0,
                "deleted_case": False,
            }

        try:

            deleted_vectors = (
                VectorStore.delete_by_case_id(
                    case.id
                )
            )

            deleted_chunks = (
                self.case_chunk_repository
                .delete_by_case(
                    case.id
                )
            )

            self.case_repository.delete(
                case
            )

            deleted_case = True

        except Exception as error:

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Failed to remove indexed "
                    "dataset data: "
                    f"{error}"
                ),
            ) from error

        return {
            "deleted_vectors": (
                deleted_vectors
            ),
            "deleted_chunks": (
                deleted_chunks
            ),
            "deleted_case": deleted_case,
        }

    # =====================================================
    # GET DATASET OR 404
    # =====================================================

    def _get_dataset_or_404(
        self,
        dataset_id: UUID,
    ) -> DatasetFile:

        dataset = self.repository.get_by_id(
            dataset_id
        )

        if dataset is None:

            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail="Dataset not found.",
            )

        return dataset

    # =====================================================
    # VALIDATE PDF FILE
    # =====================================================

    def _validate_file_exists(
        self,
        dataset: DatasetFile,
    ) -> Path:

        if not dataset.file_path:

            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail=(
                    "Dataset PDF path is missing."
                ),
            )

        file_path = Path(
            dataset.file_path
        ).resolve()

        if not file_path.exists():

            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail=(
                    "Dataset PDF file was not found."
                ),
            )

        if not file_path.is_file():

            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "Dataset PDF path does not point "
                    "to a file."
                ),
            )

        if file_path.suffix.lower() != ".pdf":

            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "Dataset file is not a PDF."
                ),
            )

        return file_path

    # =====================================================
    # SERIALIZE DATASET
    # =====================================================

    @staticmethod
    def _serialize_dataset(
        dataset: DatasetFile,
    ) -> dict:

        import_status = (
            dataset.import_status.value
            if (
                dataset.import_status
                and hasattr(
                    dataset.import_status,
                    "value",
                )
            )
            else (
                str(dataset.import_status)
                if dataset.import_status
                else None
            )
        )

        return {
            "id": dataset.id,
            "filename": dataset.filename,
            "year": dataset.year,
            "month": dataset.month,
            "file_size": dataset.file_size,
            "import_status": import_status,
            "current_stage": (
                dataset.current_stage
            ),
            "error_message": (
                dataset.error_message
            ),
            "chunk_count": (
                dataset.chunk_count or 0
            ),
            "processing_attempts": (
                dataset.processing_attempts
                or 0
            ),
            "is_indexed": (
                dataset.is_indexed
            ),
            "imported_at": (
                dataset.imported_at
            ),
            "indexed_at": (
                dataset.indexed_at
            ),
            "last_processed_at": (
                dataset.last_processed_at
            ),
            "updated_at": getattr(
                dataset,
                "updated_at",
                None,
            ),
        }