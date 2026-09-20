import calendar
import logging
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.dataset_file import (
    DatasetFile,
)
from app.repositories.dataset_file_repository import (
    DatasetFileRepository,
)


logger = logging.getLogger(
    __name__
)


class CaseCollectionService:
    """
    Build a public year-and-month collection directly
    from DatasetFile records.

    This service does not use the Case model.
    """

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.dataset_file_repository = (
            DatasetFileRepository(
                db
            )
        )

        self.dataset_root = (
            settings
            .resolved_dataset_path
        )

        self.minimum_year = int(
            settings.DATASET_MIN_YEAR
        )

        self.maximum_year = int(
            settings.DATASET_MAX_YEAR
        )

    # =====================================================
    # VALIDATE DATASET ROOT
    # =====================================================

    def _validate_dataset_root(
        self,
    ) -> None:

        if not self.dataset_root.exists():

            raise RuntimeError(
                "The configured dataset directory "
                "does not exist: "
                f"{self.dataset_root}"
            )

        if not self.dataset_root.is_dir():

            raise RuntimeError(
                "The configured dataset path is not "
                "a directory: "
                f"{self.dataset_root}"
            )

    # =====================================================
    # GET ARCHIVE
    # =====================================================

    def get_archive(
        self,
        start_year: int | None = None,
        end_year: int | None = None,
    ) -> dict[str, Any]:

        self._validate_dataset_root()

        resolved_start_year = (
            int(start_year)
            if start_year is not None
            else self.minimum_year
        )

        resolved_end_year = (
            int(end_year)
            if end_year is not None
            else self.maximum_year
        )

        if (
            resolved_start_year
            < self.minimum_year
        ):

            raise ValueError(
                "Start year cannot be earlier than "
                f"{self.minimum_year}."
            )

        if (
            resolved_end_year
            > self.maximum_year
        ):

            raise ValueError(
                "End year cannot be later than "
                f"{self.maximum_year}."
            )

        if (
            resolved_end_year
            < resolved_start_year
        ):

            raise ValueError(
                "End year must be greater than or "
                "equal to the start year."
            )

        dataset_files = (
            self.dataset_file_repository
            .get_all()
        )

        file_counts: dict[
            tuple[int, int],
            int,
        ] = {}

        total_available_files = 0

        for dataset_file in dataset_files:

            year = (
                self._normalize_year(
                    dataset_file.year
                )
            )

            month = (
                self._normalize_month(
                    dataset_file.month
                )
            )

            if (
                year is None
                or month is None
            ):
                continue

            if (
                year
                < resolved_start_year
                or year
                > resolved_end_year
            ):
                continue

            pdf_path = (
                self.resolve_pdf_path(
                    dataset_file
                )
            )

            if pdf_path is None:
                continue

            key = (
                year,
                month,
            )

            file_counts[
                key
            ] = (
                file_counts.get(
                    key,
                    0,
                )
                + 1
            )

            total_available_files += 1

        years: list[
            dict[str, Any]
        ] = []

        for year in range(
            resolved_end_year,
            resolved_start_year - 1,
            -1,
        ):

            months: list[
                dict[str, Any]
            ] = []

            for month_number in range(
                1,
                13,
            ):

                file_count = (
                    file_counts.get(
                        (
                            year,
                            month_number,
                        ),
                        0,
                    )
                )

                months.append(
                    {
                        "month": (
                            month_number
                        ),

                        "month_name": (
                            calendar
                            .month_name[
                                month_number
                            ]
                        ),

                        "short_name": (
                            calendar
                            .month_abbr[
                                month_number
                            ]
                        ),

                        "has_cases": (
                            file_count > 0
                        ),

                        "case_count": (
                            file_count
                        ),
                    }
                )

            years.append(
                {
                    "year": (
                        year
                    ),

                    "has_cases": any(
                        month[
                            "has_cases"
                        ]
                        for month in months
                    ),

                    "case_count": sum(
                        month[
                            "case_count"
                        ]
                        for month in months
                    ),

                    "months": (
                        months
                    ),
                }
            )

        return {
            "start_year": (
                resolved_start_year
            ),

            "end_year": (
                resolved_end_year
            ),

            "dataset_path": str(
                self.dataset_root
            ),

            "total_available_cases": (
                total_available_files
            ),

            "years": (
                years
            ),
        }

    # =====================================================
    # GET MONTH FILES
    # =====================================================

    def get_month_cases(
        self,
        year: int,
        month: int,
    ) -> dict[str, Any]:

        self._validate_dataset_root()

        normalized_year = (
            self._normalize_year(
                year
            )
        )

        normalized_month = (
            self._normalize_month(
                month
            )
        )

        if normalized_year is None:

            raise ValueError(
                "Year must be a valid integer."
            )

        if (
            normalized_year
            < self.minimum_year
            or normalized_year
            > self.maximum_year
        ):

            raise ValueError(
                "Year must be between "
                f"{self.minimum_year} and "
                f"{self.maximum_year}."
            )

        if normalized_month is None:

            raise ValueError(
                "Month must be between 1 and 12."
            )

        month_name = (
            calendar.month_name[
                normalized_month
            ]
        )

        dataset_files = (
            self.dataset_file_repository
            .get_by_year_and_month(
                year=(
                    normalized_year
                ),
                month_name=(
                    month_name
                ),
            )
        )

        serialized_files: list[
            dict[str, Any]
        ] = []

        for dataset_file in dataset_files:

            pdf_path = (
                self.resolve_pdf_path(
                    dataset_file
                )
            )

            if pdf_path is None:
                continue

            serialized_files.append(
                {
                    "id": str(
                        dataset_file.id
                    ),

                    "title": (
                        self._create_title(
                            dataset_file.filename
                        )
                    ),

                    "case_type": (
                        None
                    ),

                    "case_number": (
                        self._extract_case_number(
                            dataset_file.filename
                        )
                    ),

                    "division": (
                        None
                    ),

                    "ponencia": (
                        None
                    ),

                    "decision_date": (
                        None
                    ),

                    "pdf_filename": (
                        dataset_file.filename
                    ),

                    "pdf_url": (
                        "/api/user/"
                        "case-collection/"
                        f"datasets/"
                        f"{dataset_file.id}/pdf"
                    ),

                    "file_size": (
                        int(
                            dataset_file
                            .file_size
                            or 0
                        )
                    ),

                    "is_indexed": (
                        bool(
                            dataset_file
                            .is_indexed
                        )
                    ),

                    "import_status": (
                        self
                        ._serialize_import_status(
                            dataset_file
                        )
                    ),
                }
            )

        return {
            "year": (
                normalized_year
            ),

            "month": (
                normalized_month
            ),

            "month_name": (
                month_name
            ),

            "case_count": len(
                serialized_files
            ),

            "cases": (
                serialized_files
            ),
        }

    # =====================================================
    # GET DATASET FILE
    # =====================================================

    def get_dataset_file(
        self,
        dataset_id: UUID,
    ) -> DatasetFile:

        dataset_file = (
            self.dataset_file_repository
            .get_by_id(
                dataset_id
            )
        )

        if dataset_file is None:

            raise ValueError(
                "Dataset file not found."
            )

        return dataset_file

    # =====================================================
    # GET PDF
    # =====================================================

    def get_dataset_pdf(
        self,
        dataset_id: UUID,
    ) -> Path:

        self._validate_dataset_root()

        dataset_file = (
            self.get_dataset_file(
                dataset_id
            )
        )

        pdf_path = (
            self.resolve_pdf_path(
                dataset_file
            )
        )

        if pdf_path is None:

            raise ValueError(
                "Original dataset PDF not found."
            )

        return pdf_path

    # =====================================================
    # RESOLVE PDF PATH
    # =====================================================

    def resolve_pdf_path(
        self,
        dataset_file: DatasetFile,
    ) -> Path | None:

        raw_path = str(
            dataset_file.file_path
            or ""
        ).strip()

        if not raw_path:
            return None

        supplied_path = Path(
            raw_path
        )

        candidates: list[
            Path
        ] = []

        if supplied_path.is_absolute():

            candidates.append(
                supplied_path
            )

        else:

            candidates.extend(
                [
                    self.dataset_root
                    / supplied_path,

                    Path.cwd()
                    / supplied_path,

                    self.dataset_root
                    / supplied_path.name,
                ]
            )

            supplied_parts = list(
                supplied_path.parts
            )

            lowered_parts = [
                part.lower()
                for part
                in supplied_parts
            ]

            dataset_folder_name = (
                self.dataset_root
                .name
                .lower()
            )

            if (
                dataset_folder_name
                in lowered_parts
            ):

                index = (
                    lowered_parts
                    .index(
                        dataset_folder_name
                    )
                )

                remaining_parts = (
                    supplied_parts[
                        index + 1:
                    ]
                )

                if remaining_parts:

                    candidates.append(
                        self.dataset_root
                        / Path(
                            *remaining_parts
                        )
                    )

        checked: set[
            str
        ] = set()

        for candidate in candidates:

            try:

                resolved = (
                    candidate
                    .expanduser()
                    .resolve()
                )

            except OSError:
                continue

            key = str(
                resolved
            )

            if key in checked:
                continue

            checked.add(
                key
            )

            if not self._is_inside_dataset(
                resolved
            ):
                continue

            if (
                resolved.exists()
                and resolved.is_file()
                and resolved
                .suffix
                .lower()
                == ".pdf"
            ):

                return resolved

        filename = (
            supplied_path.name
        )

        if not filename:
            return None

        try:

            for candidate in (
                self.dataset_root
                .rglob(
                    filename
                )
            ):

                resolved = (
                    candidate
                    .resolve()
                )

                if not self._is_inside_dataset(
                    resolved
                ):
                    continue

                if (
                    resolved.is_file()
                    and resolved
                    .suffix
                    .lower()
                    == ".pdf"
                ):

                    return resolved

        except OSError as exc:

            logger.warning(
                "Unable to search for PDF %s: %s",
                filename,
                exc,
            )

        return None

    # =====================================================
    # DATASET BOUNDARY CHECK
    # =====================================================

    def _is_inside_dataset(
        self,
        path: Path,
    ) -> bool:

        try:

            path.relative_to(
                self.dataset_root
            )

            return True

        except ValueError:

            return False

    # =====================================================
    # NORMALIZE YEAR
    # =====================================================

    @staticmethod
    def _normalize_year(
        value: Any,
    ) -> int | None:

        try:

            normalized = int(
                value
            )

        except (
            TypeError,
            ValueError,
        ):

            return None

        return (
            normalized
            if normalized > 0
            else None
        )

    # =====================================================
    # NORMALIZE MONTH
    # =====================================================

    @staticmethod
    def _normalize_month(
        value: Any,
    ) -> int | None:

        if isinstance(
            value,
            int,
        ):

            return (
                value
                if 1 <= value <= 12
                else None
            )

        normalized = str(
            value or ""
        ).strip().lower()

        if not normalized:
            return None

        if normalized.isdigit():

            numeric = int(
                normalized
            )

            return (
                numeric
                if 1 <= numeric <= 12
                else None
            )

        for month_number in range(
            1,
            13,
        ):

            if normalized in {
                calendar
                .month_name[
                    month_number
                ]
                .lower(),

                calendar
                .month_abbr[
                    month_number
                ]
                .lower(),
            }:

                return month_number

        return None

    # =====================================================
    # CREATE DISPLAY TITLE
    # =====================================================

    @staticmethod
    def _create_title(
        filename: str,
    ) -> str:

        title = (
            Path(
                filename
            )
            .stem
            .replace(
                "_",
                " ",
            )
            .replace(
                "-",
                " ",
            )
        )

        return (
            " ".join(
                title.split()
            )
            or "Untitled Decision"
        )

    # =====================================================
    # EXTRACT CASE NUMBER
    # =====================================================

    @staticmethod
    def _extract_case_number(
        filename: str,
    ) -> str:

        stem = (
            Path(
                filename
            )
            .stem
            .replace(
                "_",
                " ",
            )
        )

        normalized = (
            " ".join(
                stem.split()
            )
        )

        return (
            normalized
            or "Case number unavailable"
        )

    # =====================================================
    # IMPORT STATUS
    # =====================================================

    @staticmethod
    def _serialize_import_status(
        dataset_file: DatasetFile,
    ) -> str:

        value = (
            dataset_file
            .import_status
        )

        return str(
            getattr(
                value,
                "value",
                value,
            )
        )