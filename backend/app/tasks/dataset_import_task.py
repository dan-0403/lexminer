import uuid

from app.core.database import SessionLocal
from app.services.dataset_import_job_service import (
    DatasetImportJobService,
)


def run_dataset_import_job(
    job_id: uuid.UUID,
) -> None:

    db = SessionLocal()

    try:
        service = (
            DatasetImportJobService(
                db
            )
        )

        service.run_job(
            job_id
        )

    finally:
        db.close()