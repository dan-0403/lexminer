import uuid

from sqlalchemy.orm import Session

from app.models.dataset_import_job import (
    DatasetImportJob,
)


class DatasetImportJobRepository:

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.db = db

    def create(
        self,
        job: DatasetImportJob,
    ) -> DatasetImportJob:

        self.db.add(job)

        self.db.commit()

        self.db.refresh(job)

        return job

    def get_by_id(
        self,
        job_id: uuid.UUID,
    ) -> DatasetImportJob | None:

        return self.db.get(
            DatasetImportJob,
            job_id,
        )

    def update(
        self,
        job: DatasetImportJob,
    ) -> DatasetImportJob:

        self.db.add(job)

        self.db.commit()

        self.db.refresh(job)

        return job