from datetime import date
from typing import Any

from sqlalchemy import extract, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.case import Case


class CaseRepository:
    """
    Repository for creating, retrieving, filtering,
    updating, and deleting Supreme Court case records.
    """

    def __init__(
        self,
        db: Session,
    ) -> None:
        self.db = db

    # =====================================================
    # CREATE CASE
    # =====================================================

    def create(
        self,
        title: str | None,
        case_type: Any,
        case_number: str | None,
        year: int | None,
        month: int | None,
        division: str | None,
        decision_date: date | None,
        ponencia: str | None,
        pdf_path: str,
    ) -> Case:
        """
        Creates a case unless an existing record is found
        using the normalized case number or PDF path.
        """

        normalized_title = (
            self._normalize_optional_text(
                title
            )
        )

        normalized_case_number = (
            self._normalize_optional_text(
                case_number
            )
        )

        normalized_month = month

        if normalized_month is not None:
            try:
                normalized_month = int(normalized_month)
            except (TypeError, ValueError):
                month_map = {
                    "january": 1,
                    "february": 2,
                    "march": 3,
                    "april": 4,
                    "may": 5,
                    "june": 6,
                    "july": 7,
                    "august": 8,
                    "september": 9,
                    "october": 10,
                    "november": 11,
                    "december": 12,
                }

                normalized_month = month_map.get(
                    str(month).strip().lower()
                )

        if normalized_month is not None and not 1 <= normalized_month <= 12:
            raise ValueError("Month must be between 1 and 12.")

        normalized_division = (
            self._normalize_optional_text(
                division
            )
        )

        normalized_ponencia = (
            self._normalize_optional_text(
                ponencia
            )
        )

        normalized_pdf_path = (
            self._normalize_optional_text(
                pdf_path
            )
        )

        if not normalized_pdf_path:
            raise ValueError(
                "A valid PDF path is required."
            )

        existing_case: Case | None = None

        if normalized_case_number:
            existing_case = (
                self.get_by_case_number(
                    normalized_case_number
                )
            )

        if existing_case is None:
            existing_case = (
                self.get_by_pdf_path(
                    normalized_pdf_path
                )
            )

        if existing_case is not None:
            return existing_case

        case = Case(
            title=(
                normalized_title
                or "Untitled Case"
            ),

            case_type=case_type,

            case_number=(
                normalized_case_number
            ),

            year=year,

            month=normalized_month,

            division=normalized_division,

            decision_date=decision_date,

            ponencia=normalized_ponencia,

            pdf_path=normalized_pdf_path,
        )

        try:

            self.db.add(case)

            self.db.commit()

            self.db.refresh(case)

            return case

        except SQLAlchemyError:

            self.db.rollback()

            raise

    # =====================================================
    # GET BY CASE NUMBER
    # =====================================================

    def get_by_case_number(
        self,
        case_number: str | None,
    ) -> Case | None:
        """
        Finds an exact case-number match after applying
        punctuation-insensitive normalization.
        """

        normalized_case_number = (
            self._normalize_case_number(
                case_number
            )
        )

        if not normalized_case_number:
            return None

        normalized_database_value = (
            self._normalized_case_number_expression()
        )

        return (
            self.db
            .query(Case)
            .filter(
                normalized_database_value
                == normalized_case_number
            )
            .first()
        )

    # =====================================================
    # SEARCH BY CASE NUMBER
    # =====================================================

    def search_by_case_number(
        self,
        case_number: str,
        limit: int = 20,
    ) -> list[Case]:
        """
        Searches case numbers using a punctuation-insensitive
        partial match.

        Examples that can match the same stored value:

        - G.R. No. 123456
        - GR 123456
        - grno123456
        - 123456
        """

        normalized_case_number = (
            self._normalize_case_number(
                case_number
            )
        )

        if not normalized_case_number:
            return []

        safe_limit = min(
            max(
                int(limit),
                1,
            ),
            100,
        )

        normalized_database_value = (
            self._normalized_case_number_expression()
        )

        return (
            self.db
            .query(Case)
            .filter(
                normalized_database_value.ilike(
                    f"%{normalized_case_number}%"
                )
            )
            .order_by(
                Case.decision_date.desc(),
                Case.id.desc(),
            )
            .limit(safe_limit)
            .all()
        )

    # =====================================================
    # GET BY PDF PATH
    # =====================================================

    def get_by_pdf_path(
        self,
        pdf_path: str | None,
    ) -> Case | None:
        """
        Finds a case using its normalized PDF path.
        """

        normalized_pdf_path = (
            self._normalize_optional_text(
                pdf_path
            )
        )

        if not normalized_pdf_path:
            return None

        return (
            self.db
            .query(Case)
            .filter(
                Case.pdf_path
                == normalized_pdf_path
            )
            .first()
        )

    # =====================================================
    # GET BY ID
    # =====================================================

    def get_by_id(
        self,
        case_id: int,
    ) -> Case | None:
        """
        Retrieves one case by positive integer ID.
        """

        normalized_case_id = (
            self._normalize_positive_integer(
                case_id
            )
        )

        if normalized_case_id is None:
            return None

        return (
            self.db
            .query(Case)
            .filter(
                Case.id
                == normalized_case_id
            )
            .first()
        )

    # =====================================================
    # GET BY IDS
    # =====================================================

    def get_by_ids(
        self,
        case_ids: list[int],
    ) -> list[Case]:
        """
        Retrieves all matching case records.
        """

        normalized_case_ids = (
            self._normalize_case_ids(
                case_ids
            )
        )

        if not normalized_case_ids:
            return []

        return (
            self.db
            .query(Case)
            .filter(
                Case.id.in_(
                    normalized_case_ids
                )
            )
            .all()
        )

    # =====================================================
    # GET ALL CASES
    # =====================================================

    def get_all(
        self,
    ) -> list[Case]:
        """
        Retrieves every stored Supreme Court case,
        ordered by decision date and ID.
        """

        return (
            self.db
            .query(Case)
            .order_by(
                Case.decision_date.desc(),
                Case.id.desc(),
            )
            .all()
        )

    # =====================================================
    # GET CASES BY IDS WITH OPTIONAL FILTERS
    # =====================================================

    def get_by_ids_filtered(
        self,
        case_ids: list[int],
        year: int | None = None,
        division: str | None = None,
        case_number: str | None = None,
    ) -> list[Case]:
        """
        Retrieves candidate cases and applies optional
        PostgreSQL metadata filters.

        All filters are optional.

        Supported filters:

        - decision year
        - Supreme Court division
        - partial or complete case number
        """

        normalized_case_ids = (
            self._normalize_case_ids(
                case_ids
            )
        )

        if not normalized_case_ids:
            return []

        query = (
            self.db
            .query(Case)
            .filter(
                Case.id.in_(
                    normalized_case_ids
                )
            )
        )

        # -------------------------------------------------
        # YEAR FILTER
        # -------------------------------------------------

        normalized_year = (
            self._normalize_year(
                year
            )
        )

        if normalized_year is not None:
            query = query.filter(
                extract(
                    "year",
                    Case.decision_date,
                )
                == normalized_year
            )

        # -------------------------------------------------
        # DIVISION FILTER
        # -------------------------------------------------

        normalized_division = (
            self._normalize_optional_text(
                division
            )
        )

        if normalized_division:
            query = query.filter(
                Case.division.ilike(
                    f"%{self._escape_like_value(normalized_division)}%",
                    escape="\\",
                )
            )

        # -------------------------------------------------
        # CASE NUMBER FILTER
        # -------------------------------------------------

        normalized_case_number = (
            self._normalize_case_number(
                case_number
            )
        )

        if normalized_case_number:
            normalized_database_value = (
                self._normalized_case_number_expression()
            )

            query = query.filter(
                normalized_database_value.ilike(
                    f"%{normalized_case_number}%"
                )
            )

        return (
            query
            .order_by(
                Case.decision_date.desc(),
                Case.id.desc(),
            )
            .all()
        )

    # =====================================================
    # COUNT ALL CASES
    # =====================================================

    def count_all(
        self,
    ) -> int:
        """
        Returns the total number of stored cases.
        """

        return (
            self.db
            .query(Case)
            .count()
        )

    # =====================================================
    # UPDATE
    # =====================================================

    def update(
        self,
        case: Case,
    ) -> Case:
        """
        Persists modifications to an existing case.
        """

        if case is None:
            raise ValueError(
                "A case record is required."
            )

        try:
            self.db.add(case)

            self.db.commit()

            self.db.refresh(case)

            return case

        except SQLAlchemyError:
            self.db.rollback()

            raise

    # =====================================================
    # DELETE
    # =====================================================

    def delete(
        self,
        case: Case,
    ) -> None:
        """
        Deletes a case record.
        """

        if case is None:
            raise ValueError(
                "A case record is required."
            )

        try:
            self.db.delete(case)

            self.db.commit()

        except SQLAlchemyError:
            self.db.rollback()

            raise

    # =====================================================
    # GET BY EXACT NORMALIZED CASE NUMBER
    # =====================================================

    def get_by_case_number_exact(
        self,
        case_number: str | None,
    ) -> Case | None:
        """
        Backward-compatible alias for the existing exact,
        punctuation-insensitive case-number lookup.
        """

        return self.get_by_case_number(
            case_number
        )

    # =====================================================
    # COUNT CASES BY YEAR AND MONTH
    # =====================================================

    def count_by_year_and_month(
        self,
        start_year: int,
        end_year: int,
    ) -> list[Any]:
        """
        Counts PDF-backed cases grouped by year and month.

        This method uses the stored Case.year and Case.month
        columns. The Case model must define both columns.
        """

        normalized_start_year = (
            self._normalize_year(
                start_year
            )
        )

        normalized_end_year = (
            self._normalize_year(
                end_year
            )
        )

        if (
            normalized_start_year is None
            or normalized_end_year is None
        ):
            return []

        if (
            normalized_end_year
            < normalized_start_year
        ):
            raise ValueError(
                "End year must be greater than or "
                "equal to start year."
            )

        return (
            self.db
            .query(
                Case.year.label(
                    "year"
                ),
                Case.month.label(
                    "month"
                ),
                func.count(
                    Case.id
                ).label(
                    "case_count"
                ),
            )
            .filter(
                Case.year
                >= normalized_start_year,
                Case.year
                <= normalized_end_year,
                Case.pdf_path.isnot(
                    None
                ),
                func.trim(
                    Case.pdf_path
                )
                != "",
            )
            .group_by(
                Case.year,
                Case.month,
            )
            .order_by(
                Case.year.desc(),
                Case.month.asc(),
            )
            .all()
        )

    # =====================================================
    # GET CASES BY YEAR AND MONTH
    # =====================================================

    def get_by_year_and_month(
        self,
        year: int,
        month: int,
    ) -> list[Case]:
        """
        Retrieves PDF-backed cases for one year and month.

        Supports integer, numeric-string, full month-name,
        and abbreviated month-name database values.
        """

        normalized_year = (
            self._normalize_year(
                year
            )
        )

        normalized_month = (
            self._normalize_positive_integer(
                month
            )
        )

        if normalized_year is None:
            return []

        if (
            normalized_month is None
            or normalized_month < 1
            or normalized_month > 12
        ):
            raise ValueError(
                "Month must be between 1 and 12."
            )

        query = (
            self.db
            .query(Case)
            .filter(
                Case.year
                == normalized_year,
                Case.pdf_path.isnot(
                    None
                ),
                func.trim(
                    Case.pdf_path
                )
                != "",
            )
        )

        try:
            month_python_type = (
                Case.month
                .type
                .python_type
            )

        except (
            AttributeError,
            NotImplementedError,
        ):
            month_python_type = str

        if month_python_type is int:
            query = query.filter(
                Case.month
                == normalized_month
            )

        else:
            month_names = {
                1: "January",
                2: "February",
                3: "March",
                4: "April",
                5: "May",
                6: "June",
                7: "July",
                8: "August",
                9: "September",
                10: "October",
                11: "November",
                12: "December",
            }

            month_name = (
                month_names[
                    normalized_month
                ]
            )

            month_abbreviation = (
                month_name[:3]
            )

            query = query.filter(
                func.lower(
                    func.trim(
                        Case.month
                    )
                ).in_(
                    [
                        str(
                            normalized_month
                        ),
                        month_name.lower(),
                        month_abbreviation.lower(),
                    ]
                )
            )

        return (
            query
            .order_by(
                Case.decision_date.desc(),
                Case.case_number.asc(),
                Case.id.desc(),
            )
            .all()
        )

    # =====================================================
    # NORMALIZED CASE-NUMBER DATABASE EXPRESSION
    # =====================================================

    @staticmethod
    def _normalized_case_number_expression():
        """
        Produces a PostgreSQL expression that removes common
        case-number punctuation and spacing.

        Stored value:
            G.R. No. 123456

        Normalized value:
            grno123456
        """

        expression = func.lower(
            func.coalesce(
                Case.case_number,
                "",
            )
        )

        characters_to_remove = (
            " ",
            ".",
            ",",
            "-",
            "_",
            "/",
            "\\",
            ":",
            ";",
            "(",
            ")",
            "[",
            "]",
        )

        for character in characters_to_remove:
            expression = func.replace(
                expression,
                character,
                "",
            )

        return expression

    # =====================================================
    # NORMALIZE CASE NUMBER
    # =====================================================

    @staticmethod
    def _normalize_case_number(
        value: str | None,
    ) -> str | None:
        """
        Normalizes user-supplied case numbers so that minor
        punctuation and spacing differences do not prevent
        matching.
        """

        normalized = (
            CaseRepository
            ._normalize_optional_text(
                value
            )
        )

        if not normalized:
            return None

        characters_to_remove = (
            " ",
            ".",
            ",",
            "-",
            "_",
            "/",
            "\\",
            ":",
            ";",
            "(",
            ")",
            "[",
            "]",
        )

        normalized = (
            normalized.lower()
        )

        for character in characters_to_remove:
            normalized = normalized.replace(
                character,
                "",
            )

        return normalized or None

    # =====================================================
    # NORMALIZE CASE IDS
    # =====================================================

    @staticmethod
    def _normalize_case_ids(
        case_ids: list[int] | None,
    ) -> list[int]:
        """
        Converts case IDs to unique positive integers while
        preserving their original order.
        """

        if not case_ids:
            return []

        normalized_ids: list[int] = []

        seen_ids: set[int] = set()

        for case_id in case_ids:
            normalized_id = (
                CaseRepository
                ._normalize_positive_integer(
                    case_id
                )
            )

            if normalized_id is None:
                continue

            if normalized_id in seen_ids:
                continue

            seen_ids.add(
                normalized_id
            )

            normalized_ids.append(
                normalized_id
            )

        return normalized_ids

    # =====================================================
    # NORMALIZE POSITIVE INTEGER
    # =====================================================

    @staticmethod
    def _normalize_positive_integer(
        value: Any,
    ) -> int | None:
        """
        Converts a value to a positive integer.
        """

        if isinstance(
            value,
            bool,
        ):
            return None

        try:
            normalized_value = int(
                value
            )

        except (
            TypeError,
            ValueError,
        ):
            return None

        if normalized_value <= 0:
            return None

        return normalized_value

    # =====================================================
    # NORMALIZE YEAR
    # =====================================================

    @staticmethod
    def _normalize_year(
        value: Any,
    ) -> int | None:
        """
        Validates an optional four-digit year.
        """

        if value is None or value == "":
            return None

        normalized_year = (
            CaseRepository
            ._normalize_positive_integer(
                value
            )
        )

        if normalized_year is None:
            raise ValueError(
                "Year must be a valid integer."
            )

        if (
            normalized_year < 1900
            or normalized_year > 2100
        ):
            raise ValueError(
                "Year must be between 1900 and 2100."
            )

        return normalized_year

    # =====================================================
    # NORMALIZE OPTIONAL TEXT
    # =====================================================

    @staticmethod
    def _normalize_optional_text(
        value: Any,
    ) -> str | None:
        """
        Trims a value and collapses repeated whitespace.
        """

        if value is None:
            return None

        normalized = " ".join(
            str(value)
            .strip()
            .split()
        )

        return normalized or None

    # =====================================================
    # ESCAPE SQL LIKE VALUE
    # =====================================================

    @staticmethod
    def _escape_like_value(
        value: str,
    ) -> str:
        """
        Escapes SQL LIKE wildcard characters so user-entered
        percent and underscore symbols are treated literally.
        """

        return (
            value
            .replace(
                "\\",
                "\\\\",
            )
            .replace(
                "%",
                "\\%",
            )
            .replace(
                "_",
                "\\_",
            )
        )