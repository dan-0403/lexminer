from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.enums import ImportStatus
from app.models.dataset_file import DatasetFile


class DatasetCRUD:

    # =====================================================
    # CREATE
    # =====================================================

    @staticmethod
    def create(
        db: Session,
        dataset: DatasetFile,
    ) -> DatasetFile:

        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        return dataset

    # =====================================================
    # GET BY ID
    # =====================================================

    @staticmethod
    def get_by_id(
        db: Session,
        dataset_id: UUID,
    ) -> Optional[DatasetFile]:

        return (
            db.query(DatasetFile)
            .filter(
                DatasetFile.id == dataset_id
            )
            .first()
        )

    # =====================================================
    # GET BY FILE PATH
    # =====================================================

    @staticmethod
    def get_by_file_path(
        db: Session,
        file_path: str,
    ) -> Optional[DatasetFile]:

        return (
            db.query(DatasetFile)
            .filter(
                DatasetFile.file_path == file_path
            )
            .first()
        )

    # =====================================================
    # GET PENDING FILES
    # =====================================================

    @staticmethod
    def get_pending_files(
        db: Session,
    ) -> list[DatasetFile]:

        return (
            db.query(DatasetFile)
            .filter(
                DatasetFile.import_status
                == ImportStatus.PENDING
            )
            .order_by(
                DatasetFile.imported_at.asc()
            )
            .all()
        )

    # =====================================================
    # GET FAILED FILES
    # =====================================================

    @staticmethod
    def get_failed_files(
        db: Session,
    ) -> list[DatasetFile]:

        return (
            db.query(DatasetFile)
            .filter(
                DatasetFile.import_status
                == ImportStatus.FAILED
            )
            .order_by(
                DatasetFile.imported_at.asc()
            )
            .all()
        )

    # =====================================================
    # GET ALL DATASETS
    # =====================================================

    @staticmethod
    def get_all(
        db: Session,
        status: ImportStatus | None = None,
        filename: str | None = None,
        year: int | None = None,
        month: str | None = None,
        is_indexed: bool | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[DatasetFile]:

        query = db.query(DatasetFile)

        query = DatasetCRUD._apply_filters(
            query=query,
            status=status,
            filename=filename,
            year=year,
            month=month,
            is_indexed=is_indexed,
        )

        return (
            query
            .order_by(
                DatasetFile.imported_at.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    # =====================================================
    # COUNT FILTERED
    # =====================================================

    @staticmethod
    def count_filtered(
        db: Session,
        status: ImportStatus | None = None,
        filename: str | None = None,
        year: int | None = None,
        month: str | None = None,
        is_indexed: bool | None = None,
    ) -> int:

        query = db.query(func.count(DatasetFile.id))

        query = DatasetCRUD._apply_filters(
            query=query,
            status=status,
            filename=filename,
            year=year,
            month=month,
            is_indexed=is_indexed,
        )

        return query.scalar() or 0

    # =====================================================
    # UPDATE
    # =====================================================

    @staticmethod
    def update(
        db: Session,
        dataset: DatasetFile,
    ) -> DatasetFile:

        db.add(dataset)

        db.commit()

        db.refresh(dataset)

        return dataset

    # =====================================================
    # UPDATE IMPORT STATUS
    # =====================================================

    @staticmethod
    def update_import_status(
        db: Session,
        dataset: DatasetFile,
        status: ImportStatus,
    ) -> DatasetFile:

        dataset.import_status = status

        db.add(dataset)

        db.commit()

        db.refresh(dataset)

        return dataset

    # =====================================================
    # DELETE
    # =====================================================

    @staticmethod
    def delete(
        db: Session,
        dataset: DatasetFile,
    ) -> None:

        db.delete(dataset)

        db.commit()

    # =====================================================
    # PRIVATE FILTERS
    # =====================================================

    @staticmethod
    def _apply_filters(
        query,
        status: ImportStatus | None,
        filename: str | None,
        year: int | None,
        month: str | None,
        is_indexed: bool | None,
    ):

        if status is not None:

            query = query.filter(
                DatasetFile.import_status == status
            )

        if filename:

            query = query.filter(
                DatasetFile.filename.ilike(
                    f"%{filename.strip()}%"
                )
            )

        if year is not None:

            query = query.filter(
                DatasetFile.year == year
            )

        if month:

            query = query.filter(
                DatasetFile.month.ilike(
                    f"%{month.strip()}%"
                )
            )

        if is_indexed is not None:

            query = query.filter(
                DatasetFile.is_indexed == is_indexed
            )

        return query

        # =====================================================
    # GET RECENT DATASET IMPORTS
    # =====================================================

    @staticmethod
    def get_recent_imports(
        db: Session,
        limit: int = 5,
    ) -> list[DatasetFile]:

        return (
            db.query(
                DatasetFile
            )
            .order_by(
                DatasetFile.imported_at.desc()
            )
            .limit(limit)
            .all()
        )