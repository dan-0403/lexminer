from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.dataset_file import (
    DatasetFile,
)


class DatasetFileRepository:
    """
    Repository for public access to imported
    dataset PDF metadata.
    """

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.db = db

    # =====================================================
    # GET ALL PDF DATASET FILES
    # =====================================================

    def get_all(
        self,
    ) -> list[DatasetFile]:

        return (
            self.db
            .query(
                DatasetFile
            )
            .filter(
                DatasetFile.file_path.isnot(
                    None
                ),
                func.trim(
                    DatasetFile.file_path
                )
                != "",
            )
            .order_by(
                DatasetFile.year.desc(),
                DatasetFile.month.asc(),
                DatasetFile.filename.asc(),
            )
            .all()
        )

    # =====================================================
    # GET BY ID
    # =====================================================

    def get_by_id(
        self,
        dataset_id: UUID,
    ) -> DatasetFile | None:

        return (
            self.db
            .query(
                DatasetFile
            )
            .filter(
                DatasetFile.id
                == dataset_id
            )
            .first()
        )

    # =====================================================
    # GET BY YEAR AND MONTH
    # =====================================================

    def get_by_year_and_month(
        self,
        year: int,
        month_name: str,
    ) -> list[DatasetFile]:

        return (
            self.db
            .query(
                DatasetFile
            )
            .filter(
                DatasetFile.year
                == year,

                func.lower(
                    func.trim(
                        DatasetFile.month
                    )
                )
                == month_name
                .strip()
                .lower(),

                DatasetFile.file_path.isnot(
                    None
                ),

                func.trim(
                    DatasetFile.file_path
                )
                != "",
            )
            .order_by(
                DatasetFile.filename.asc(),
                DatasetFile.imported_at.desc(),
            )
            .all()
        )