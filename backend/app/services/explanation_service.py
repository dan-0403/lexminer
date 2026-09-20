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
from app.schemas.explanation_schema import (
    CaseExplanationRequest,
)


logger = logging.getLogger(__name__)


class ExplanationService:
    """
    Generate a grounded explanation of a Philippine
    Supreme Court decision using OpenAI.

    The explanation uses all readable indexed chunks
    belonging to the selected case.
    """

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
    # GENERATE EXPLANATION
    # =====================================================

    def generate_explanation(
        self,
        request: CaseExplanationRequest,
    ) -> dict[str, Any]:

        # -------------------------------------------------
        # VALIDATE CASE ID
        # -------------------------------------------------

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

        # -------------------------------------------------
        # RETRIEVE CASE
        # -------------------------------------------------

        case = (
            self.case_repository
            .get_by_id(case_id)
        )

        if case is None:

            raise ValueError(
                "Case not found."
            )

        # -------------------------------------------------
        # RETRIEVE ALL INDEXED CHUNKS
        # -------------------------------------------------

        chunks = (
            self.chunk_repository
            .get_by_case_id(case_id)
        )

        if not chunks:

            raise ValueError(
                "No indexed chunks found "
                "for this case."
            )

        # -------------------------------------------------
        # ORDER CHUNKS
        # -------------------------------------------------

        ordered_chunks = sorted(
            chunks,
            key=lambda chunk: (
                chunk.chunk_number
            ),
        )

        # -------------------------------------------------
        # KEEP READABLE CHUNKS
        # -------------------------------------------------

        readable_chunks = [
            chunk
            for chunk in ordered_chunks
            if str(
                chunk.chunk_text or ""
            ).strip()
        ]

        if not readable_chunks:

            raise ValueError(
                "The indexed chunks contain "
                "no readable text."
            )

        # -------------------------------------------------
        # BUILD COMPLETE CASE CONTEXT
        # -------------------------------------------------

        context_parts: list[str] = []

        used_chunks = []

        for chunk in readable_chunks:

            original_text = str(
                chunk.chunk_text or ""
            ).strip()

            if not original_text:
                continue

            cleaned_text = (
                self._normalize_chunk_text(
                    original_text
                )
            )

            if not cleaned_text:
                continue

            context_parts.append(
                (
                    f"[Chunk "
                    f"{chunk.chunk_number}]\n"
                    f"{cleaned_text}"
                )
            )

            used_chunks.append(
                chunk
            )

        if not context_parts:

            raise ValueError(
                "The case contains no readable "
                "text for explanation generation."
            )

        case_text = (
            "\n\n".join(
                context_parts
            )
        )

        # -------------------------------------------------
        # BUILD PROMPT
        # -------------------------------------------------

        prompt = (
            PromptBuilder
            .build_case_explanation_prompt(
                case_title=(
                    case.title
                    or "Untitled Case"
                ),
                case_text=case_text,
            )
        )

        # -------------------------------------------------
        # LOG CONTEXT
        # -------------------------------------------------

        logger.info(
            (
                "Complete explanation context prepared | "
                "case_id=%s | "
                "chunks=%s | "
                "case_characters=%s | "
                "prompt_characters=%s | "
                "chunk_numbers=%s"
            ),
            case_id,
            len(used_chunks),
            len(case_text),
            len(prompt),
            [
                chunk.chunk_number
                for chunk in used_chunks
            ],
        )

        # -------------------------------------------------
        # GENERATE EXPLANATION
        # -------------------------------------------------

        try:

            explanation = (
                OpenAIGenerator
                .generate_explanation(
                    prompt
                )
            )

        except RuntimeError:

            raise

        except Exception as exc:

            logger.exception(
                (
                    "Unexpected OpenAI explanation "
                    "failure for case_id=%s."
                ),
                case_id,
            )

            raise RuntimeError(
                "Failed to generate case "
                "explanation."
            ) from exc

        # -------------------------------------------------
        # VALIDATE EXPLANATION
        # -------------------------------------------------

        explanation = str(
            explanation or ""
        ).strip()

        if not explanation:

            raise RuntimeError(
                "OpenAI returned an empty "
                "explanation."
            )

        # -------------------------------------------------
        # BUILD CITATIONS
        # -------------------------------------------------

        citations = []

        for chunk in used_chunks:

            citations.append(
                {
                    "chunk_number": (
                        chunk.chunk_number
                    ),
                    "excerpt": (
                        self._create_excerpt(
                            chunk.chunk_text
                        )
                    ),
                    "document_id": (
                        chunk.chroma_document_id
                    ),
                }
            )

        # -------------------------------------------------
        # BUILD RESPONSE
        # -------------------------------------------------

        return {
            "case": {
                "id": case.id,

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

            "retrieved_chunks": (
                len(used_chunks)
            ),

            "context_characters": (
                len(case_text)
            ),

            "selected_chunk_numbers": [
                chunk.chunk_number
                for chunk
                in used_chunks
            ],

            "hallucination_protection": True,

            "explanation": explanation,

            "citations": citations,
        }

    # =====================================================
    # NORMALIZE CHUNK TEXT
    # =====================================================

    @staticmethod
    def _normalize_chunk_text(
        value: Any,
    ) -> str:
        """
        Normalize whitespace without intentionally
        truncating the case content.
        """

        text = str(
            value or ""
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

        return "\n".join(lines)

    # =====================================================
    # CREATE CITATION EXCERPT
    # =====================================================

    @staticmethod
    def _create_excerpt(
        value: Any,
        limit: int = 260,
    ) -> str:
        """
        Create a short frontend citation preview.

        This does NOT modify the text sent to OpenAI.
        """

        text = " ".join(
            str(
                value or ""
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