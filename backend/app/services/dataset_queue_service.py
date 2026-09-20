from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.enums import ImportStatus
from app.models.dataset_file import DatasetFile


class DatasetQueueService:

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.db = db

    # =====================================================
    # GET PAGINATED PENDING / FAILED QUEUE
    # =====================================================

    def get_queue(
        self,
        queue_status: str | None = None,
        filename: str | None = None,
        year: int | None = None,
        month: str | None = None,
        skip: int = 0,
        limit: int = 25,
    ) -> dict[str, Any]:

        safe_skip = max(
            int(skip or 0),
            0,
        )

        safe_limit = min(
            max(
                int(limit or 25),
                1,
            ),
            100,
        )

        # Only records that belong in the queue.
        base_query = (
            self.db.query(
                DatasetFile
            )
            .filter(
                DatasetFile.import_status.in_(
                    [
                        ImportStatus.PENDING,
                        ImportStatus.FAILED,
                    ]
                )
            )
        )

        # Summary is calculated before the page filters.
        pending_count = (
            self.db.query(
                func.count(
                    DatasetFile.id
                )
            )
            .filter(
                DatasetFile.import_status
                == ImportStatus.PENDING
            )
            .scalar()
            or 0
        )

        failed_count = (
            self.db.query(
                func.count(
                    DatasetFile.id
                )
            )
            .filter(
                DatasetFile.import_status
                == ImportStatus.FAILED
            )
            .scalar()
            or 0
        )

        query = base_query

        # =================================================
        # QUEUE STATUS FILTER
        # =================================================

        if queue_status:

            normalized_status = (
                str(queue_status)
                .strip()
                .upper()
            )

            if normalized_status == "PENDING":

                query = query.filter(
                    DatasetFile.import_status
                    == ImportStatus.PENDING
                )

            elif normalized_status == "FAILED":

                query = query.filter(
                    DatasetFile.import_status
                    == ImportStatus.FAILED
                )

        # =================================================
        # FILENAME FILTER
        # =================================================

        if filename:

            normalized_filename = (
                str(filename)
                .strip()
                .lower()
            )

            if normalized_filename:

                query = query.filter(
                    func.lower(
                        DatasetFile.filename
                    ).contains(
                        normalized_filename
                    )
                )

        # =================================================
        # YEAR FILTER
        # =================================================

        if year is not None:

            query = query.filter(
                DatasetFile.year
                == int(year)
            )

        # =================================================
        # MONTH FILTER
        # =================================================

        if month:

            normalized_month = (
                str(month)
                .strip()
                .lower()
            )

            if normalized_month:

                query = query.filter(
                    func.lower(
                        DatasetFile.month
                    )
                    == normalized_month
                )

        # Total after filters, before pagination.
        filtered_total = (
            query.count()
        )

        records = (
            query
            .order_by(
                DatasetFile.last_processed_at
                .desc()
                .nullslast(),

                DatasetFile.imported_at
                .desc(),

                DatasetFile.filename
                .asc(),
            )
            .offset(
                safe_skip
            )
            .limit(
                safe_limit
            )
            .all()
        )

        items = [
            self._serialize_dataset(
                dataset
            )
            for dataset in records
        ]

        return {
            "summary": {
                "pending": int(
                    pending_count
                ),
                "failed": int(
                    failed_count
                ),
                "total": int(
                    pending_count
                    + failed_count
                ),
            },
            "total": int(
                filtered_total
            ),
            "skip": safe_skip,
            "limit": safe_limit,
            "items": items,
        }

    # =====================================================
    # SERIALIZE DATASET FILE
    # =====================================================

    @staticmethod
    def _serialize_dataset(
        dataset: DatasetFile,
    ) -> dict[str, Any]:

        import_status = (
            dataset.import_status
        )

        if hasattr(
            import_status,
            "value",
        ):
            status_value = str(
                import_status.value
            )
        else:
            status_value = str(
                import_status
            )

        normalized_status = (
            status_value
            .strip()
            .upper()
        )

        return {
            "key": (
                f"{normalized_status.lower()}:"
                f"{dataset.id}"
            ),

            "dataset_id": (
                dataset.id
            ),

            "filename": (
                dataset.filename
            ),

            "file_path": (
                dataset.file_path
            ),

            "year": (
                dataset.year
            ),

            "month": (
                dataset.month
            ),

            "file_size": (
                dataset.file_size
                or 0
            ),

            "queue_status": (
                normalized_status
            ),

            "import_status": (
                dataset.import_status
            ),

            "current_stage": (
                dataset.current_stage
                or (
                    "AWAITING_PROCESSING"
                    if normalized_status
                    == "PENDING"
                    else "FAILED"
                )
            ),

            "error_message": (
                dataset.error_message
            ),

            "chunk_count": (
                dataset.chunk_count
                or 0
            ),

            "is_indexed": bool(
                dataset.is_indexed
            ),

            "processing_attempts": (
                dataset.processing_attempts
                or 0
            ),

            # DatasetFile has imported_at,
            # but no uploaded_at column.
            # Use imported_at as the queue creation time.
            "uploaded_at": (
                dataset.imported_at
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
        }