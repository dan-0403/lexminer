from typing import Any

from sqlalchemy.orm import Session

from app.repositories.case_chunk_repository import (
    CaseChunkRepository,
)
from app.repositories.case_repository import (
    CaseRepository,
)
from app.schemas.case_viewer_schema import (
    CaseViewerRequest,
)
from app.services.match_highlight_service import (
    MatchHighlightService,
)


class CaseViewerService:
    """
    Return the reconstructed cleaned version of a
    Philippine Supreme Court decision.

    The service uses search context supplied from
    the semantic-search result and does not run
    another vector search.
    """

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.case_repository = (
            CaseRepository(db)
        )

        self.chunk_repository = (
            CaseChunkRepository(db)
        )

    # =====================================================
    # GET CASE VIEWER DATA
    # =====================================================

    def get_case(
        self,
        case_id: int,
        request: CaseViewerRequest,
    ) -> dict[str, Any]:

        if case_id < 1:
            raise ValueError(
                "Case ID must be greater than zero."
            )

        query = self._normalize_text(
            request.query
        )

        # -----------------------------------------
        # Retrieve case metadata
        # -----------------------------------------

        case = (
            self.case_repository.get_by_id(
                case_id
            )
        )

        if case is None:
            raise ValueError(
                "Case not found."
            )

        # -----------------------------------------
        # Retrieve authoritative database chunks
        # -----------------------------------------

        chunks = (
            self.chunk_repository
            .get_by_case_id(case_id)
        )

        if not chunks:
            raise ValueError(
                "No indexed chunks found "
                "for this case."
            )

        ordered_chunks = sorted(
            chunks,
            key=lambda chunk: (
                chunk.chunk_number
            ),
        )

        # -----------------------------------------
        # Build matched-context lookups
        # -----------------------------------------

        matched_by_number: dict[
            int,
            Any,
        ] = {}

        matched_by_document_id: dict[
            str,
            Any,
        ] = {}

        for matched_item in (
            request.matched_chunks
        ):
            matched_by_number[
                matched_item.chunk_number
            ] = matched_item

            if matched_item.document_id:
                matched_by_document_id[
                    matched_item.document_id
                ] = matched_item

        # -----------------------------------------
        # Serialize chunks
        # -----------------------------------------

        serialized_chunks: list[
            dict[str, Any]
        ] = []

        serialized_matched_chunks: list[
            dict[str, Any]
        ] = []

        for chunk in ordered_chunks:
            chunk_text = (
                self._normalize_chunk_text(
                    chunk.chunk_text
                )
            )

            if not chunk_text:
                continue

            document_id = (
                chunk.chroma_document_id
            )

            base_chunk = {
                "id": chunk.id,
                "chunk_number": (
                    chunk.chunk_number
                ),
                "text": chunk_text,
                "document_id": document_id,
            }

            serialized_chunks.append(
                base_chunk
            )

            matched_context = None

            if document_id:
                matched_context = (
                    matched_by_document_id.get(
                        document_id
                    )
                )

            if matched_context is None:
                matched_context = (
                    matched_by_number.get(
                        chunk.chunk_number
                    )
                )

            if matched_context is None:
                continue

            if (
                matched_context.document_id
                and document_id
                and matched_context.document_id
                != document_id
            ):
                continue

            matching_sentences = []

            if query:
                matching_sentences = (
                    MatchHighlightService
                    .find_matching_sentences(
                        query=query,
                        chunk_text=chunk_text,
                        limit=(
                            request.sentence_limit
                        ),
                        minimum_similarity=(
                            request
                            .minimum_similarity
                        ),
                    )
                )

            serialized_matched_chunks.append(
                {
                    **base_chunk,

                    "distance": self._safe_float(
                        matched_context.distance
                    ),

                    "original_distance": (
                        self._safe_float(
                            matched_context
                            .original_distance
                        )
                    ),

                    "expanded_distance": (
                        self._safe_float(
                            matched_context
                            .expanded_distance
                        )
                    ),

                    "best_vector_distance": (
                        self._safe_float(
                            matched_context
                            .best_vector_distance
                            or matched_context
                            .distance
                        )
                    ),

                    "vector_similarity_score": (
                        self._safe_float(
                            matched_context
                            .vector_similarity_score
                        )
                    ),

                    "reranker_score": (
                        self._safe_float(
                            matched_context
                            .reranker_score
                        )
                    ),

                    "reranker_applied": bool(
                        matched_context
                        .reranker_applied
                    ),

                    "retrieval_sources": list(
                        matched_context
                        .retrieval_sources
                        or []
                    ),

                    "matching_sentences": (
                        matching_sentences
                    ),
                }
            )

        if not serialized_chunks:
            raise ValueError(
                "The indexed chunks contain "
                "no readable text."
            )

        # -----------------------------------------
        # Reconstruct cleaned decision
        # -----------------------------------------

        cleaned_text = "\n\n".join(
            item["text"]
            for item in serialized_chunks
        )

        # -----------------------------------------
        # Serialize metadata
        # -----------------------------------------

        decision_date = getattr(
            case,
            "decision_date",
            None,
        )

        year = getattr(
            case,
            "year",
            None,
        )

        if year is None and decision_date:
            year = decision_date.year

        month = getattr(
            case,
            "month",
            None,
        )

        if month is None and decision_date:
            month = decision_date.strftime(
                "%B"
            )

        case_type = self._serialize_enum(
            getattr(
                case,
                "case_type",
                None,
            )
        )

        # -----------------------------------------
        # Return complete viewer response
        # -----------------------------------------

        return {
            "case": {
                "id": case.id,

                "title": (
                    case.title
                    or "Untitled Case"
                ),

                "case_type": case_type,

                "case_number": (
                    case.case_number
                ),

                "division": case.division,

                "decision_date": (
                    decision_date.isoformat()
                    if decision_date
                    else None
                ),

                "year": year,

                "month": month,

                "ponencia": case.ponencia,

                "pdf_path": case.pdf_path,

                "pdf_url": (
                    f"/api/user/cases/"
                    f"{case.id}/pdf"
                    if case.pdf_path
                    else None
                ),
            },

            "search_context": {
                "query": query,

                "expanded_query": (
                    self._normalize_text(
                        request.expanded_query
                    )
                    or query
                ),

                "similarity_score": (
                    self._safe_float(
                        request.similarity_score
                    )
                ),

                "matched_intents": (
                    self._clean_string_list(
                        request.matched_intents
                    )
                ),

                "matched_issues": (
                    self._clean_string_list(
                        request.matched_issues
                    )
                ),

                "matched_concepts": (
                    self._clean_string_list(
                        request.matched_concepts
                    )
                ),

                "matched_scenarios": (
                    self._clean_string_list(
                        request.matched_scenarios
                    )
                ),

                "requested_matched_chunks": len(
                    request.matched_chunks
                ),

                "processed_matched_chunks": len(
                    serialized_matched_chunks
                ),
            },

            "chunk_count": len(
                serialized_chunks
            ),

            "matched_chunk_count": len(
                serialized_matched_chunks
            ),

            "cleaned_case": cleaned_text,

            "chunks": serialized_chunks,

            "matched_chunks": (
                serialized_matched_chunks
            ),
        }

    # =====================================================
    # HELPERS
    # =====================================================

    @staticmethod
    def _normalize_text(
        value: Any,
    ) -> str:

        return " ".join(
            str(value or "")
            .strip()
            .split()
        )

    @staticmethod
    def _normalize_chunk_text(
        value: Any,
    ) -> str:

        return (
            str(value or "")
            .replace("\r\n", "\n")
            .replace("\r", "\n")
            .strip()
        )

    @staticmethod
    def _serialize_enum(
        value: Any,
    ) -> str | None:

        if value is None:
            return None

        return str(
            getattr(
                value,
                "value",
                value,
            )
        )

    @staticmethod
    def _safe_float(
        value: Any,
    ) -> float | None:

        if value is None:
            return None

        try:
            return float(value)
        except (
            TypeError,
            ValueError,
            OverflowError,
        ):
            return None

    @classmethod
    def _clean_string_list(
        cls,
        values: list[Any] | None,
    ) -> list[str]:

        cleaned_values: list[str] = []

        existing_values: set[str] = set()

        for value in values or []:
            cleaned_value = (
                cls._normalize_text(value)
            )

            if not cleaned_value:
                continue

            comparison_key = (
                cleaned_value.casefold()
            )

            if comparison_key in existing_values:
                continue

            existing_values.add(
                comparison_key
            )

            cleaned_values.append(
                cleaned_value
            )

        return cleaned_values