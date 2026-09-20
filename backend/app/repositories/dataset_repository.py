from uuid import UUID

from sqlalchemy.orm import Session

from app.crud.dataset_crud import DatasetCRUD
from app.enums import ImportStatus
from app.models.dataset_file import DatasetFile


class DatasetRepository:

    def __init__(
        self,
        db: Session,
    ):
        self.db = db

    # =====================================================
    # CREATE
    # =====================================================

    def create(
        self,
        dataset: DatasetFile,
    ) -> DatasetFile:

        return DatasetCRUD.create(
            db=self.db,
            dataset=dataset,
        )

    # =====================================================
    # GET BY ID
    # =====================================================

    def get_by_id(
        self,
        dataset_id,
    ) -> DatasetFile | None:

        return self.db.get(
            DatasetFile,
            dataset_id,
        )

    # =====================================================
    # GET BY FILE PATH
    # =====================================================

    def get_by_file_path(
        self,
        file_path: str,
    ) -> DatasetFile | None:

        return DatasetCRUD.get_by_file_path(
            db=self.db,
            file_path=file_path,
        )

    # =====================================================
    # GET ALL DATASETS
    # =====================================================

    def get_all(
        self,
        status: ImportStatus | None = None,
        filename: str | None = None,
        year: int | None = None,
        month: str | None = None,
        is_indexed: bool | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[DatasetFile]:

        return DatasetCRUD.get_all(
            db=self.db,
            status=status,
            filename=filename,
            year=year,
            month=month,
            is_indexed=is_indexed,
            skip=skip,
            limit=limit,
        )

    # =====================================================
    # COUNT FILTERED DATASETS
    # =====================================================

    def count_filtered(
        self,
        status: ImportStatus | None = None,
        filename: str | None = None,
        year: int | None = None,
        month: str | None = None,
        is_indexed: bool | None = None,
    ) -> int:

        return DatasetCRUD.count_filtered(
            db=self.db,
            status=status,
            filename=filename,
            year=year,
            month=month,
            is_indexed=is_indexed,
        )

    # =====================================================
    # GET PENDING FILES
    # =====================================================

    def get_pending_files(
        self,
    ) -> list[DatasetFile]:

        return DatasetCRUD.get_pending_files(
            db=self.db,
        )

    # =====================================================
    # GET FAILED FILES
    # =====================================================

    def get_failed_files(
        self,
    ) -> list[DatasetFile]:

        return DatasetCRUD.get_failed_files(
            db=self.db,
        )

    # =====================================================
    # UPDATE
    # =====================================================

    def update(
        self,
        dataset: DatasetFile,
    ) -> DatasetFile:

        return DatasetCRUD.update(
            db=self.db,
            dataset=dataset,
        )

    # =====================================================
    # UPDATE IMPORT STATUS
    # =====================================================

    def update_import_status(
        self,
        dataset: DatasetFile,
        status: ImportStatus,
    ) -> DatasetFile:

        return DatasetCRUD.update_import_status(
            db=self.db,
            dataset=dataset,
            status=status,
        )

    # =====================================================
    # DELETE
    # =====================================================

    def delete(
        self,
        dataset: DatasetFile,
    ) -> None:

        DatasetCRUD.delete(
            db=self.db,
            dataset=dataset,
        )

            # =====================================================
    # GET RECENT DATASET IMPORTS
    # =====================================================

    def get_recent_imports(
        self,
        limit: int = 5,
    ) -> list[DatasetFile]:

        return DatasetCRUD.get_recent_imports(
            db=self.db,
            limit=limit,
        )