import uuid

from datetime import datetime
from datetime import timedelta
from datetime import timezone

from sqlalchemy.orm import Session

from app.enums import ImportJobStatus
from app.models.dataset_import_job import (
    DatasetImportJob,
)
from app.repositories.dataset_import_job_repository import (
    DatasetImportJobRepository,
)
from app.services.dataset_service import (
    DatasetService,
)


class DatasetImportJobService:

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.db = db

        self.repository = (
            DatasetImportJobRepository(
                db
            )
        )

    # =====================================================
    # CREATE JOB
    # =====================================================

    def create_job(
        self,
    ) -> DatasetImportJob:

        active_job = (
            self.db.query(
                DatasetImportJob
            )
            .filter(
                DatasetImportJob.status.in_(
                    [
                        ImportJobStatus.QUEUED,
                        ImportJobStatus.RUNNING,
                    ]
                )
            )
            .first()
        )

        if active_job is not None:

            raise ValueError(
                "Another dataset import job "
                "is already running."
            )

        job = DatasetImportJob(
            status=(
                ImportJobStatus.QUEUED
            ),
            current_stage="QUEUED",
            progress_percentage=0,
        )

        return self.repository.create(
            job
        )

    # =====================================================
    # GET JOB
    # =====================================================

    def get_job(
        self,
        job_id: uuid.UUID,
    ) -> DatasetImportJob | None:

        return self.repository.get_by_id(
            job_id
        )

    # =====================================================
    # RUN JOB
    # =====================================================

    def run_job(
        self,
        job_id: uuid.UUID,
    ) -> None:

        job = self.repository.get_by_id(
            job_id
        )

        if job is None:
            return

        started_at = datetime.now(
            timezone.utc
        )

        try:
            job.status = (
                ImportJobStatus.RUNNING
            )

            job.current_stage = (
                "REGISTERING_DATASETS"
            )

            job.started_at = started_at
            job.error_message = None

            self.repository.update(job)

            dataset_service = DatasetService(
                self.db
            )

            registration_result = (
                dataset_service
                .import_datasets()
            )

            pending_files = (
                dataset_service.repository
                .get_pending_files()
            )

            job.total_files = len(
                pending_files
            )

            job.skipped_files = int(
                registration_result.get(
                    "duplicates",
                    0,
                )
            )

            if job.total_files == 0:

                job.status = (
                    ImportJobStatus.COMPLETED
                )

                job.current_stage = (
                    "COMPLETED"
                )

                job.progress_percentage = 100

                job.finished_at = (
                    datetime.now(
                        timezone.utc
                    )
                )

                job.estimated_seconds_remaining = 0

                job.estimated_finish_at = (
                    job.finished_at
                )

                self.repository.update(job)

                return

            def update_progress(
                processed: int,
                total: int,
                dataset,
                stage: str,
                result: dict | None,
            ) -> None:

                current_job = (
                    self.repository
                    .get_by_id(
                        job_id
                    )
                )

                if current_job is None:
                    return

                now = datetime.now(
                    timezone.utc
                )

                current_job.total_files = total

                current_job.processed_files = (
                    processed
                )

                current_job.current_filename = (
                    dataset.filename
                )

                current_job.current_stage = (
                    stage
                )

                if result:

                    result_status = str(
                        result.get(
                            "status",
                            "",
                        )
                    ).upper()

                    if result_status in {
                        "COMPLETED",
                        "ALREADY INDEXED",
                    }:
                        current_job.completed_files += 1

                    elif result_status == "FAILED":
                        current_job.failed_files += 1

                # File progress contributes 90%.
                file_progress = (
                    processed / total
                ) * 90

                # Active stage contributes up to 10%.
                stage_weights = {
                    "STARTING": 0,
                    "EXTRACTING": 1,
                    "CLEANING": 2,
                    "METADATA_EXTRACTION": 3,
                    "CASE_REGISTRATION": 4,
                    "CHUNKING": 5,
                    "INDEXING": 6,
                    "VECTOR_STORAGE": 8,
                    "CHUNK_STORAGE": 9,
                    "COMPLETED": 10,
                }

                stage_progress = (
                    stage_weights.get(
                        stage,
                        0,
                    )
                    / total
                )

                percentage = min(
                    file_progress
                    + stage_progress,
                    99,
                )

                current_job.progress_percentage = (
                    round(
                        percentage,
                        2,
                    )
                )

                elapsed_seconds = max(
                    (
                        now -
                        started_at
                    ).total_seconds(),
                    1,
                )

                if processed > 0:

                    average_seconds = (
                        elapsed_seconds
                        / processed
                    )

                    remaining_files = max(
                        total -
                        processed,
                        0,
                    )

                    remaining_seconds = int(
                        average_seconds
                        * remaining_files
                    )

                    current_job.average_seconds_per_file = (
                        round(
                            average_seconds,
                            2,
                        )
                    )

                    current_job.estimated_seconds_remaining = (
                        remaining_seconds
                    )

                    current_job.estimated_finish_at = (
                        now
                        + timedelta(
                            seconds=(
                                remaining_seconds
                            )
                        )
                    )

                self.repository.update(
                    current_job
                )

            results = (
                dataset_service
                .process_pending_documents(
                    progress_callback=(
                        update_progress
                    )
                )
            )

            failed_count = len(
                [
                    result
                    for result in results
                    if str(
                        result.get(
                            "status",
                            "",
                        )
                    ).upper()
                    == "FAILED"
                ]
            )

            completed_count = (
                len(results)
                - failed_count
            )

            finished_at = datetime.now(
                timezone.utc
            )

            final_job = (
                self.repository
                .get_by_id(
                    job_id
                )
            )

            if final_job is None:
                return

            final_job.processed_files = len(
                results
            )

            final_job.completed_files = (
                completed_count
            )

            final_job.failed_files = (
                failed_count
            )

            final_job.progress_percentage = 100

            final_job.current_filename = None

            final_job.current_stage = (
                "COMPLETED"
                if failed_count == 0
                else "COMPLETED_WITH_ERRORS"
            )

            final_job.status = (
                ImportJobStatus.COMPLETED
                if failed_count == 0
                else ImportJobStatus
                .COMPLETED_WITH_ERRORS
            )

            final_job.finished_at = (
                finished_at
            )

            final_job.estimated_seconds_remaining = 0

            final_job.estimated_finish_at = (
                finished_at
            )

            self.repository.update(
                final_job
            )

        except Exception as error:

            self.db.rollback()

            failed_job = (
                self.repository
                .get_by_id(
                    job_id
                )
            )

            if failed_job is None:
                return

            failed_job.status = (
                ImportJobStatus.FAILED
            )

            failed_job.current_stage = (
                "FAILED"
            )

            failed_job.error_message = str(
                error
            )

            failed_job.finished_at = (
                datetime.now(
                    timezone.utc
                )
            )

            failed_job.estimated_seconds_remaining = 0

            self.repository.update(
                failed_job
            )