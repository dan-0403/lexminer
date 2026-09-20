import logging
from typing import Any

from sqlalchemy.orm import Session

from app.ai.openai_generator import OpenAIGenerator
from app.ai.prompt_builder import PromptBuilder
from app.repositories.case_chunk_repository import (
    CaseChunkRepository,
)
from app.repositories.case_repository import (
    CaseRepository,
)
from app.schemas.match_explanation_schema import (
    MatchExplanationRequest,
)


logger = logging.getLogger(__name__)


class MatchExplanationService:
    """
    Generate an AI explanation of why a specific
    Philippine Supreme Court decision matched the
    user's semantic search.

    Important design rules:
    - Does NOT perform another semantic search.
    - Uses only chunks already identified by the
      search result.
    - Does NOT trust frontend passage text as the
      authoritative source.
    - Retrieves the actual chunk text from PostgreSQL.
    - Sends only the selected matching passages
      to OpenAIGenerator.
    - Uses the dedicated OpenAI match-explanation
      generation method.
    """

    # =====================================================
    # LIMITS
    # =====================================================

    # Maximum number of search-matched chunks that
    # will be supplied to the match explanation prompt.
    MAX_MATCHED_CHUNKS = 8

    # Maximum context size for the selected passages.
    #
    # This protects the generation request from becoming
    # unnecessarily large while still providing enough
    # evidence to explain the match.
    MAX_CONTEXT_CHARACTERS = 12_000

    # Maximum number of characters used only for
    # citation previews returned to the frontend.
    CITATION_EXCERPT_LENGTH = 260

    # =====================================================
    # INITIALIZATION
    # =====================================================

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
    # GENERATE MATCH EXPLANATION
    # =====================================================

    def generate_match_explanation(
        self,
        request: MatchExplanationRequest,
    ) -> dict[str, Any]:
        """
        Generate a grounded explanation of why the
        selected case matched the user's search.

        The service uses:
        - Original search query
        - Expanded query
        - Matched intents
        - Matched issues
        - Matched concepts
        - Matched scenarios
        - Search-selected chunk numbers

        The actual chunk text is always loaded from
        PostgreSQL rather than trusting text supplied
        by the frontend.
        """

        # =================================================
        # VALIDATE CASE ID
        # =================================================

        try:

            case_id = int(
                request.case_id
            )

        except (
            TypeError,
            ValueError,
        ) as exc:

            raise ValueError(
                "Invalid case ID."
            ) from exc

        if case_id < 1:

            raise ValueError(
                "Case ID must be greater than zero."
            )

        # =================================================
        # VALIDATE ORIGINAL QUERY
        # =================================================

        original_query = (
            str(
                request.query
                or ""
            )
            .strip()
        )

        if not original_query:

            raise ValueError(
                "Search query cannot be empty."
            )

        # =================================================
        # RETRIEVE CASE
        # =================================================

        case = (
            self.case_repository
            .get_by_id(case_id)
        )

        if case is None:

            raise ValueError(
                "Case not found."
            )

        # =================================================
        # RETRIEVE ALL INDEXED CHUNKS
        # =================================================
        #
        # We retrieve the database chunks so that the
        # frontend cannot replace or modify the actual
        # case evidence sent to OpenAI.
        #
        # =================================================

        chunks = (
            self.chunk_repository
            .get_by_case_id(case_id)
        )

        if not chunks:

            raise ValueError(
                "No indexed chunks found "
                "for this case."
            )

        # =================================================
        # ORDER DATABASE CHUNKS
        # =================================================

        ordered_chunks = sorted(
            chunks,
            key=lambda chunk: (
                int(
                    chunk.chunk_number
                    or 0
                )
            ),
        )

        # =================================================
        # BUILD DATABASE CHUNK LOOKUP
        # =================================================

        chunk_lookup: dict[int, Any] = {}

        for chunk in ordered_chunks:

            try:

                chunk_number = int(
                    chunk.chunk_number
                )

            except (
                TypeError,
                ValueError,
            ):

                continue

            if chunk_number < 0:
                continue

            chunk_lookup[
                chunk_number
            ] = chunk

        if not chunk_lookup:

            raise ValueError(
                "The case does not contain "
                "valid indexed chunk numbers."
            )

        # =================================================
        # EXTRACT REQUESTED MATCHED CHUNKS
        # =================================================
        #
        # These chunk numbers come from the search result.
        #
        # We do not trust the supplied text.
        #
        # Only the chunk number is used to locate the
        # authoritative PostgreSQL record.
        #
        # =================================================

        requested_chunks = (
            request.matched_chunks
            or []
        )

        if not requested_chunks:

            raise ValueError(
                "No matched passages were supplied "
                "for this search result."
            )

        requested_chunk_numbers: list[int] = []

        seen_chunk_numbers: set[int] = set()

        for item in requested_chunks:

            raw_chunk_number = getattr(
                item,
                "chunk_number",
                None,
            )

            try:

                chunk_number = int(
                    raw_chunk_number
                )

            except (
                TypeError,
                ValueError,
            ):

                continue

            if chunk_number < 0:
                continue

            if chunk_number in seen_chunk_numbers:
                continue

            if chunk_number not in chunk_lookup:
                continue

            seen_chunk_numbers.add(
                chunk_number
            )

            requested_chunk_numbers.append(
                chunk_number
            )

        if not requested_chunk_numbers:

            raise ValueError(
                "None of the supplied matched "
                "passages belong to this case."
            )

        # =================================================
        # LIMIT MATCHED CHUNKS
        # =================================================

        selected_chunk_numbers = (
            requested_chunk_numbers[
                : self.MAX_MATCHED_CHUNKS
            ]
        )

        selected_chunks = [
            chunk_lookup[
                chunk_number
            ]
            for chunk_number
            in selected_chunk_numbers
        ]

        # =================================================
        # KEEP ONLY READABLE DATABASE CHUNKS
        # =================================================

        readable_chunks = []

        for chunk in selected_chunks:

            chunk_text = str(
                getattr(
                    chunk,
                    "chunk_text",
                    "",
                )
                or ""
            ).strip()

            if not chunk_text:
                continue

            readable_chunks.append(
                (
                    chunk,
                    chunk_text,
                )
            )

        if not readable_chunks:

            raise ValueError(
                "The matched passages contain "
                "no readable case text."
            )

        # =================================================
        # BUILD MATCHED PASSAGE CONTEXT
        # =================================================
        #
        # This is the actual evidence sent to OpenAI.
        #
        # The database chunk text is authoritative.
        #
        # The citation preview limit is NOT applied here.
        #
        # =================================================

        context_parts: list[str] = []

        used_chunks: list[Any] = []

        total_characters = 0

        for (
            chunk,
            chunk_text,
        ) in readable_chunks:

            normalized_text = (
                self._normalize_chunk_text(
                    chunk_text
                )
            )

            if not normalized_text:
                continue

            formatted_chunk = (
                f"[Chunk "
                f"{chunk.chunk_number}]\n"
                f"{normalized_text}"
            )

            separator_length = (
                2
                if context_parts
                else 0
            )

            next_total = (
                total_characters
                + separator_length
                + len(formatted_chunk)
            )

            # -------------------------------------------------
            # Do not cut a chunk in the middle.
            #
            # A chunk is either included completely or not
            # included at all.
            # -------------------------------------------------

            if (
                next_total
                > self.MAX_CONTEXT_CHARACTERS
            ):

                logger.warning(
                    (
                        "Match explanation context "
                        "limit reached | "
                        "case_id=%s | "
                        "skipping_chunk=%s | "
                        "current_characters=%s | "
                        "limit=%s"
                    ),
                    case_id,
                    chunk.chunk_number,
                    total_characters,
                    self.MAX_CONTEXT_CHARACTERS,
                )

                continue

            context_parts.append(
                formatted_chunk
            )

            used_chunks.append(
                chunk
            )

            total_characters = (
                next_total
            )

        if not context_parts:

            raise ValueError(
                "The matched passages exceed the "
                "allowed explanation context size."
            )

        matched_passages = (
            "\n\n".join(
                context_parts
            )
        )

        # =================================================
        # NORMALIZE QUERY UNDERSTANDING DATA
        # =================================================

        expanded_query = (
            str(
                request.expanded_query
                or ""
            )
            .strip()
        )

        matched_intents = (
            self._normalize_string_list(
                request.matched_intents
            )
        )

        matched_issues = (
            self._normalize_string_list(
                request.matched_issues
            )
        )

        matched_concepts = (
            self._normalize_string_list(
                request.matched_concepts
            )
        )

        matched_scenarios = (
            self._normalize_string_list(
                request.matched_scenarios
            )
        )

        # =================================================
        # BUILD MATCH EXPLANATION PROMPT
        # =================================================

        prompt = (
            PromptBuilder
            .build_match_explanation_prompt(
                case_title=(
                    str(
                        case.title
                        or "Untitled Case"
                    ).strip()
                ),
                case_number=(
                    str(
                        case.case_number
                        or ""
                    ).strip()
                    or None
                ),
                query=(
                    original_query
                ),
                expanded_query=(
                    expanded_query
                    or None
                ),
                matched_intents=(
                    matched_intents
                ),
                matched_issues=(
                    matched_issues
                ),
                matched_concepts=(
                    matched_concepts
                ),
                matched_scenarios=(
                    matched_scenarios
                ),
                matched_passages=(
                    matched_passages
                ),
            )
        )

        # =================================================
        # LOG PREPARATION
        # =================================================

        logger.info(
            (
                "Match explanation context prepared | "
                "case_id=%s | "
                "case_number=%s | "
                "matched_chunks=%s | "
                "context_characters=%s | "
                "prompt_characters=%s"
            ),
            case_id,
            case.case_number,
            [
                chunk.chunk_number
                for chunk
                in used_chunks
            ],
            len(matched_passages),
            len(prompt),
        )

        # =================================================
        # GENERATE USING OPENAI GENERATOR DIRECTLY
        # =================================================

        try:

            explanation = (
                OpenAIGenerator
                .generate_match_explanation(
                    prompt
                )
            )

        except RuntimeError:

            raise

        except Exception as exc:

            logger.exception(
                (
                    "Unexpected match explanation "
                    "generation error | "
                    "case_id=%s"
                ),
                case_id,
            )

            raise RuntimeError(
                "Failed to generate the "
                "case match explanation."
            ) from exc

        # =================================================
        # VALIDATE GENERATED OUTPUT
        # =================================================

        if not explanation:

            raise RuntimeError(
                "The match explanation generator "
                "returned an empty response."
            )

        explanation = (
            str(
                explanation
            ).strip()
        )

        if not explanation:

            raise RuntimeError(
                "The match explanation generator "
                "returned an empty response."
            )

        # =================================================
        # BUILD CITATIONS
        # =================================================
        #
        # The citations come from the same database
        # chunks that were actually supplied to OpenAI.
        #
        # =================================================

        citations: list[dict[str, Any]] = []

        for chunk in used_chunks:

            chunk_text = str(
                getattr(
                    chunk,
                    "chunk_text",
                    "",
                )
                or ""
            ).strip()

            citations.append(
                {
                    "chunk_number": (
                        chunk.chunk_number
                    ),
                    "document_id": (
                        chunk.chroma_document_id
                    ),
                    "excerpt": (
                        self._create_excerpt(
                            chunk_text
                        )
                    ),
                }
            )

        # =================================================
        # RESPONSE
        # =================================================

        return {
            "case": {
                "id": (
                    case.id
                ),
                "title": (
                    case.title
                ),
                "case_number": (
                    case.case_number
                ),
                "division": (
                    case.division
                ),
                "decision_date": (
                    case.decision_date.isoformat()
                    if case.decision_date
                    else None
                ),
                "ponencia": (
                    case.ponencia
                ),
            },

            "query": (
                original_query
            ),

            "expanded_query": (
                expanded_query
                or None
            ),

            "matched_intents": (
                matched_intents
            ),

            "matched_issues": (
                matched_issues
            ),

            "matched_concepts": (
                matched_concepts
            ),

            "matched_scenarios": (
                matched_scenarios
            ),

            "matched_chunk_numbers": [
                chunk.chunk_number
                for chunk
                in used_chunks
            ],

            "retrieved_chunks": (
                len(used_chunks)
            ),

            "context_characters": (
                len(matched_passages)
            ),

            "hallucination_protection": True,

            "explanation": (
                explanation
            ),

            "citations": (
                citations
            ),
        }

    # =====================================================
    # NORMALIZE STRING LIST
    # =====================================================

    @staticmethod
    def _normalize_string_list(
        values: Any,
    ) -> list[str]:
        """
        Normalize a list of labels while preserving
        their original order and removing duplicates.
        """

        if not isinstance(
            values,
            list,
        ):

            return []

        normalized: list[str] = []

        seen: set[str] = set()

        for value in values:

            item = (
                str(
                    value
                    or ""
                )
                .strip()
            )

            if not item:
                continue

            key = item.lower()

            if key in seen:
                continue

            seen.add(
                key
            )

            normalized.append(
                item
            )

        return normalized

    # =====================================================
    # NORMALIZE CHUNK TEXT
    # =====================================================

    @staticmethod
    def _normalize_chunk_text(
        value: Any,
    ) -> str:
        """
        Normalize excessive whitespace while preserving
        the actual substantive chunk content.

        The text is not semantically rewritten and is
        not shortened here.
        """

        text = str(
            value
            or ""
        ).strip()

        if not text:
            return ""

        lines: list[str] = []

        for line in text.splitlines():

            cleaned_line = (
                " ".join(
                    line.split()
                )
            )

            if cleaned_line:

                lines.append(
                    cleaned_line
                )

        return "\n".join(
            lines
        )

    # =====================================================
    # CREATE CITATION EXCERPT
    # =====================================================

    @staticmethod
    def _create_excerpt(
        value: Any,
        limit: int = 260,
    ) -> str:
        """
        Create a short preview for the frontend citation.

        IMPORTANT:
        This limit is ONLY for the citation preview.

        It does NOT limit the content sent to OpenAI.
        """

        text = " ".join(
            str(
                value
                or ""
            )
            .strip()
            .split()
        )

        if len(text) <= limit:
            return text

        return (
            text[:limit]
            .rstrip()
            + "..."
        )