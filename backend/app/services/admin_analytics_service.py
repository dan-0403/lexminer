from typing import Any

from sqlalchemy.orm import Session

from app.ai.vector_store import VectorStore
from app.enums import ImportStatus

from app.repositories.case_chunk_repository import (
    CaseChunkRepository,
)
from app.repositories.case_repository import (
    CaseRepository,
)
from app.repositories.dataset_repository import (
    DatasetRepository,
)
from app.repositories.user_repository import (
    UserRepository,
)
from app.repositories.visitor_log_repository import (
    VisitorLogRepository,
)


class AdminAnalyticsService:

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.db = db

        self.user_repository = (
            UserRepository(db)
        )

        self.visitor_log_repository = (
            VisitorLogRepository(db)
        )

        self.dataset_repository = (
            DatasetRepository(db)
        )

        self.case_repository = (
            CaseRepository(db)
        )

        self.case_chunk_repository = (
            CaseChunkRepository(db)
        )

    # =====================================================
    # GET SYSTEM ANALYTICS
    # =====================================================

    def get_analytics(
        self,
    ) -> dict[str, Any]:

        return {
            "users": (
                self._get_user_analytics()
            ),

            "visitors": (
                self._get_visitor_analytics()
            ),

            "datasets": (
                self._get_dataset_analytics()
            ),

            "search_index": (
                self._get_search_index_analytics()
            ),

            "most_visited_pages": (
                self._get_most_visited_pages()
            ),

            "recent_dataset_imports": (
                self._get_recent_dataset_imports()
            ),
        }

    # =====================================================
    # USER ANALYTICS
    # =====================================================

    def _get_user_analytics(
        self,
    ) -> dict[str, int]:

        total_users = (
            self.user_repository
            .count_all()
            or 0
        )

        active_users = (
            self.user_repository
            .count_all(
                is_active=True,
                is_locked=False,
            )
            or 0
        )

        inactive_users = (
            self.user_repository
            .count_all(
                is_active=False,
                is_locked=False,
            )
            or 0
        )

        locked_users = (
            self.user_repository
            .count_all(
                is_locked=True,
            )
            or 0
        )

        return {
            "total": int(
                total_users
            ),

            "active": int(
                active_users
            ),

            "inactive": int(
                inactive_users
            ),

            "locked": int(
                locked_users
            ),
        }

    # =====================================================
    # VISITOR ANALYTICS
    # =====================================================

    def _get_visitor_analytics(
        self,
    ) -> dict[str, int]:

        try:
            total_page_visits = (
                self.visitor_log_repository
                .count_guest_visits()
                or 0
            )

        except Exception as error:
            print(
                "[WARNING] Unable to count "
                f"guest visits: {error}"
            )

            total_page_visits = 0

        try:
            unique_visitors = (
                self.visitor_log_repository
                .count_unique_guest_visitors()
                or 0
            )

        except Exception as error:
            print(
                "[WARNING] Unable to count "
                f"unique visitors: {error}"
            )

            unique_visitors = 0

        return {
            "total_page_visits": int(
                total_page_visits
            ),

            "unique_visitors": int(
                unique_visitors
            ),
        }

    # =====================================================
    # DATASET ANALYTICS
    # =====================================================

    def _get_dataset_analytics(
        self,
    ) -> dict[str, int]:

        total_datasets = (
            self.dataset_repository
            .count_filtered()
            or 0
        )

        completed_datasets = (
            self.dataset_repository
            .count_filtered(
                status=(
                    ImportStatus.COMPLETED
                ),
            )
            or 0
        )

        pending_datasets = (
            self.dataset_repository
            .count_filtered(
                status=(
                    ImportStatus.PENDING
                ),
            )
            or 0
        )

        failed_datasets = (
            self.dataset_repository
            .count_filtered(
                status=(
                    ImportStatus.FAILED
                ),
            )
            or 0
        )

        processing_datasets = (
            self._count_processing_datasets()
        )

        indexed_datasets = (
            self.dataset_repository
            .count_filtered(
                is_indexed=True,
            )
            or 0
        )

        not_indexed_datasets = (
            self.dataset_repository
            .count_filtered(
                is_indexed=False,
            )
            or 0
        )

        return {
            "total": int(
                total_datasets
            ),

            "completed": int(
                completed_datasets
            ),

            "pending": int(
                pending_datasets
            ),

            "failed": int(
                failed_datasets
            ),

            "processing": int(
                processing_datasets
            ),

            "indexed": int(
                indexed_datasets
            ),

            "not_indexed": int(
                not_indexed_datasets
            ),
        }

    # =====================================================
    # COUNT PROCESSING DATASETS
    # =====================================================

    def _count_processing_datasets(
        self,
    ) -> int:

        processing_statuses = [
            ImportStatus.EXTRACTING,
            ImportStatus.CLEANING,
            ImportStatus.CHUNKING,
            ImportStatus.INDEXING,
        ]

        total = 0

        for processing_status in (
            processing_statuses
        ):

            try:
                count = (
                    self.dataset_repository
                    .count_filtered(
                        status=(
                            processing_status
                        ),
                    )
                    or 0
                )

                total += int(
                    count
                )

            except Exception as error:
                print(
                    "[WARNING] Unable to count "
                    f"{processing_status} "
                    f"datasets: {error}"
                )

        return total

    # =====================================================
    # SEARCH INDEX ANALYTICS
    # =====================================================

    def _get_search_index_analytics(
        self,
    ) -> dict[str, Any]:

        try:
            total_cases = (
                self.case_repository
                .count_all()
                or 0
            )

        except Exception as error:
            print(
                "[WARNING] Unable to count "
                f"cases: {error}"
            )

            total_cases = 0

        try:
            total_chunks = (
                self.case_chunk_repository
                .count_all()
                or 0
            )

        except Exception as error:
            print(
                "[WARNING] Unable to count "
                f"case chunks: {error}"
            )

            total_chunks = 0

        try:
            total_vectors = (
                VectorStore.count()
                or 0
            )

        except Exception as error:
            print(
                "[WARNING] Unable to count "
                f"vectors: {error}"
            )

            total_vectors = 0

        vector_sync_difference = abs(
            int(total_chunks)
            - int(total_vectors)
        )

        is_vector_index_synced = (
            int(total_chunks)
            == int(total_vectors)
        )

        return {
            "total_cases": int(
                total_cases
            ),

            "total_chunks": int(
                total_chunks
            ),

            "total_vectors": int(
                total_vectors
            ),

            "vector_sync_difference": int(
                vector_sync_difference
            ),

            "is_vector_index_synced": (
                is_vector_index_synced
            ),
        }

    # =====================================================
    # MOST VISITED PAGES
    # =====================================================

    def _get_most_visited_pages(
        self,
    ) -> list[dict[str, Any]]:

        try:
            pages = (
                self.visitor_log_repository
                .top_pages(
                    limit=5,
                )
            )

        except Exception as error:
            print(
                "[WARNING] Unable to retrieve "
                f"most visited pages: {error}"
            )

            return []

        results: list[
            dict[str, Any]
        ] = []

        for page in pages or []:

            if isinstance(
                page,
                dict,
            ):
                page_path = (
                    page.get(
                        "page_path"
                    )
                    or page.get(
                        "path"
                    )
                    or page.get(
                        "page"
                    )
                    or "Unknown"
                )

                visit_count = (
                    page.get(
                        "visit_count"
                    )
                    or page.get(
                        "visits"
                    )
                    or page.get(
                        "count"
                    )
                    or 0
                )

            elif hasattr(
                page,
                "_mapping",
            ):
                page_mapping = (
                    page._mapping
                )

                page_path = (
                    page_mapping.get(
                        "page_path"
                    )
                    or page_mapping.get(
                        "path"
                    )
                    or page_mapping.get(
                        "page"
                    )
                    or "Unknown"
                )

                visit_count = (
                    page_mapping.get(
                        "visit_count"
                    )
                    or page_mapping.get(
                        "visits"
                    )
                    or page_mapping.get(
                        "count"
                    )
                    or 0
                )

            elif isinstance(
                page,
                (
                    tuple,
                    list,
                ),
            ):
                page_path = (
                    page[0]
                    if len(page) >= 1
                    else "Unknown"
                )

                visit_count = (
                    page[1]
                    if len(page) >= 2
                    else 0
                )

            else:
                page_path = (
                    getattr(
                        page,
                        "page_path",
                        None,
                    )
                    or getattr(
                        page,
                        "path",
                        None,
                    )
                    or getattr(
                        page,
                        "page",
                        None,
                    )
                    or "Unknown"
                )

                visit_count = (
                    getattr(
                        page,
                        "visit_count",
                        None,
                    )
                    or getattr(
                        page,
                        "visits",
                        None,
                    )
                    or getattr(
                        page,
                        "count",
                        None,
                    )
                    or 0
                )

            results.append(
                {
                    "page_path": str(
                        page_path
                    ),

                    "visit_count": int(
                        visit_count
                    ),
                }
            )

        return results

    # =====================================================
    # RECENT DATASET IMPORTS
    # =====================================================

    def _get_recent_dataset_imports(
        self,
    ) -> list[dict[str, Any]]:

        try:
            datasets = (
                self.dataset_repository
                .get_recent_imports(
                    limit=5,
                )
            )

        except Exception as error:
            print(
                "[WARNING] Unable to retrieve "
                f"recent dataset imports: {error}"
            )

            return []

        results: list[
            dict[str, Any]
        ] = []

        for dataset in datasets or []:

            import_status = getattr(
                dataset,
                "import_status",
                None,
            )

            if hasattr(
                import_status,
                "value",
            ):
                import_status = (
                    import_status.value
                )

            imported_at = getattr(
                dataset,
                "imported_at",
                None,
            )

            indexed_at = getattr(
                dataset,
                "indexed_at",
                None,
            )

            last_processed_at = getattr(
                dataset,
                "last_processed_at",
                None,
            )

            results.append(
                {
                    "dataset_id": str(
                        dataset.id
                    ),

                    "filename": str(
                        dataset.filename
                    ),

                    "year": int(
                        dataset.year
                    ),

                    "month": str(
                        dataset.month
                    ),

                    "file_size": int(
                        dataset.file_size
                        or 0
                    ),

                    "import_status": str(
                        import_status
                        or ImportStatus.PENDING.value
                    ),

                    "current_stage": (
                        dataset.current_stage
                        or "AWAITING_PROCESSING"
                    ),

                    "error_message": (
                        dataset.error_message
                    ),

                    "chunk_count": int(
                        dataset.chunk_count
                        or 0
                    ),

                    "processing_attempts": int(
                        dataset.processing_attempts
                        or 0
                    ),

                    "is_indexed": bool(
                        dataset.is_indexed
                    ),

                    "imported_at": (
                        imported_at.isoformat()
                        if imported_at
                        else None
                    ),

                    "indexed_at": (
                        indexed_at.isoformat()
                        if indexed_at
                        else None
                    ),

                    "last_processed_at": (
                        last_processed_at.isoformat()
                        if last_processed_at
                        else None
                    ),
                }
            )

        return results