import re
from typing import Any

from app.ai.legal_understanding import (
    LEGAL_UNDERSTANDING,
)


class LegalUnderstanding:

    """
    Identifies possible legal issues from a user's
    factual description and expands the semantic query.

    The implementation safely supports entries that may
    omit facts, legal issues, keywords, or related terms.
    """

    MIN_MATCH_SCORE = 2

    # =====================================================
    # UNDERSTAND LEGAL QUERY
    # =====================================================

    @classmethod
    def understand(
        cls,
        query: str,
    ) -> dict[str, Any]:

        normalized_query = (
            cls._normalize_text(
                query
            )
        )

        if not normalized_query:
            return {
                "expanded_query": "",
                "matched_issues": [],
            }

        query_lower = (
            normalized_query.lower()
        )

        expanded_terms: list[str] = [
            normalized_query
        ]

        matched_issues: list[str] = []

        for issue, raw_data in (
            LEGAL_UNDERSTANDING.items()
        ):

            if not isinstance(
                raw_data,
                dict,
            ):
                continue

            data: dict[str, Any] = (
                raw_data
            )

            # -----------------------------------------
            # Safely retrieve possible matching terms
            # -----------------------------------------

            facts = cls._normalize_string_list(
                data.get(
                    "facts",
                    [],
                )
            )

            keywords = (
                cls._normalize_string_list(
                    data.get(
                        "keywords",
                        [],
                    )
                )
            )

            scenarios = (
                cls._normalize_string_list(
                    data.get(
                        "scenarios",
                        [],
                    )
                )
            )

            search_terms = (
                cls._merge_unique_strings(
                    facts,
                    keywords,
                    scenarios,
                )
            )

            if not search_terms:
                continue

            score = 0

            for term in search_terms:

                if cls._term_matches_query(
                    term=term,
                    query_lower=query_lower,
                ):
                    score += 1

            # -----------------------------------------
            # Determine minimum score
            #
            # Entries with only one available term
            # should still be allowed to match.
            # -----------------------------------------

            required_score = min(
                cls.MIN_MATCH_SCORE,
                len(search_terms),
            )

            if score < required_score:
                continue

            normalized_issue = (
                cls._normalize_text(
                    issue
                )
            )

            if normalized_issue:
                matched_issues.append(
                    normalized_issue
                )

            # -----------------------------------------
            # Add legal expansion terms
            # -----------------------------------------

            legal_issues = (
                cls._normalize_string_list(
                    data.get(
                        "legal_issues",
                        [],
                    )
                )
            )

            related_terms = (
                cls._normalize_string_list(
                    data.get(
                        "related_terms",
                        [],
                    )
                )
            )

            legal_concepts = (
                cls._normalize_string_list(
                    data.get(
                        "legal_concepts",
                        [],
                    )
                )
            )

            expanded_terms.extend(
                legal_issues
            )

            expanded_terms.extend(
                related_terms
            )

            expanded_terms.extend(
                legal_concepts
            )

        unique_expanded_terms = (
            cls._merge_unique_strings(
                expanded_terms
            )
        )

        unique_matched_issues = (
            cls._merge_unique_strings(
                matched_issues
            )
        )

        return {
            "expanded_query": " ".join(
                unique_expanded_terms
            ),
            "matched_issues": (
                unique_matched_issues
            ),
        }

    # =====================================================
    # TERM MATCHING
    # =====================================================

    @staticmethod
    def _term_matches_query(
        term: str,
        query_lower: str,
    ) -> bool:

        normalized_term = (
            LegalUnderstanding
            ._normalize_text(
                term
            )
            .lower()
        )

        if not normalized_term:
            return False

        # /*
        #  * Use escaped matching with flexible whitespace.
        #  *
        #  * This works better than wrapping the whole term
        #  * in \\b boundaries because legal phrases can
        #  * contain punctuation such as:
        #  *
        #  * G.R.
        #  * A.C.
        #  * A.M.
        #  * employer-employee
        #  */
        escaped_term = re.escape(
            normalized_term
        )

        flexible_pattern = (
            escaped_term.replace(
                r"\ ",
                r"\s+",
            )
        )

        try:
            return (
                re.search(
                    flexible_pattern,
                    query_lower,
                    flags=re.IGNORECASE,
                )
                is not None
            )

        except re.error:
            return (
                normalized_term
                in query_lower
            )

    # =====================================================
    # NORMALIZE TEXT
    # =====================================================

    @staticmethod
    def _normalize_text(
        value: Any,
    ) -> str:

        if value is None:
            return ""

        return " ".join(
            str(value)
            .strip()
            .split()
        )

    # =====================================================
    # NORMALIZE STRING LIST
    # =====================================================

    @classmethod
    def _normalize_string_list(
        cls,
        value: Any,
    ) -> list[str]:

        if value is None:
            return []

        if isinstance(
            value,
            str,
        ):
            normalized = (
                cls._normalize_text(
                    value
                )
            )

            return (
                [normalized]
                if normalized
                else []
            )

        if not isinstance(
            value,
            (
                list,
                tuple,
                set,
            ),
        ):
            return []

        normalized_items: list[str] = []

        for item in value:

            normalized_item = (
                cls._normalize_text(
                    item
                )
            )

            if normalized_item:
                normalized_items.append(
                    normalized_item
                )

        return normalized_items

    # =====================================================
    # MERGE UNIQUE STRINGS
    # =====================================================

    @classmethod
    def _merge_unique_strings(
        cls,
        *collections: list[str],
    ) -> list[str]:

        merged: list[str] = []

        seen: set[str] = set()

        for collection in collections:

            for item in collection:

                normalized_item = (
                    cls._normalize_text(
                        item
                    )
                )

                if not normalized_item:
                    continue

                comparison_key = (
                    normalized_item.lower()
                )

                if comparison_key in seen:
                    continue

                seen.add(
                    comparison_key
                )

                merged.append(
                    normalized_item
                )

        return merged