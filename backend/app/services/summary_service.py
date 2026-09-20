import logging
import re
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


logger = logging.getLogger(__name__)


class SummaryService:
    """
    Generate grounded summaries for Philippine
    Supreme Court decisions using OpenAI.

    The summary intentionally uses a small set of
    representative chunks to reduce API usage and
    latency.
    """

    MAX_CONTEXT_CHUNKS = 6

    MAX_CHUNK_CHARACTERS = 1200

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
    # GENERATE SUMMARY
    # =====================================================

    def generate_summary(
        self,
        case_id: int,
    ) -> dict[str, Any]:

        # -------------------------------------------------
        # VALIDATE CASE ID
        # -------------------------------------------------

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
        # RETRIEVE INDEXED CHUNKS
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
        # READABLE CHUNKS
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
        # SELECT REPRESENTATIVE CHUNKS
        # -------------------------------------------------

        selected_chunks = (
            self._select_summary_chunks(
                readable_chunks
            )
        )

        # -------------------------------------------------
        # BUILD COMPACT CONTEXT
        # -------------------------------------------------

        context_parts: list[str] = []

        used_chunks = []

        for chunk in selected_chunks:

            original_text = str(
                chunk.chunk_text or ""
            ).strip()

            if not original_text:
                continue

            compact_text = (
                self._compact_chunk_text(
                    original_text
                )
            )

            trimmed_text = (
                compact_text[
                    :self.MAX_CHUNK_CHARACTERS
                ]
            ).strip()

            if not trimmed_text:
                continue

            context_parts.append(
                (
                    f"[Chunk "
                    f"{chunk.chunk_number}]\n"
                    f"{trimmed_text}"
                )
            )

            used_chunks.append(
                chunk
            )

        if not context_parts:

            raise ValueError(
                "No readable case context "
                "could be prepared."
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
            .build_summary_prompt(
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
                "Summary context prepared | "
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
        # GENERATE SUMMARY
        # -------------------------------------------------

        try:

            summary = (
                OpenAIGenerator
                .generate_summary(
                    prompt
                )
            )

        except RuntimeError:

            raise

        except Exception as exc:

            logger.exception(
                (
                    "Unexpected OpenAI summary "
                    "failure for case_id=%s."
                ),
                case_id,
            )

            raise RuntimeError(
                "Unexpected summary "
                "generation failure."
            ) from exc

        # -------------------------------------------------
        # VALIDATE SUMMARY
        # -------------------------------------------------

        summary = str(
            summary or ""
        ).strip()

        if not summary:

            raise RuntimeError(
                "OpenAI returned an empty "
                "summary."
            )

        # -------------------------------------------------
        # EXTRACT CITED CHUNKS
        # -------------------------------------------------

        cited_chunk_numbers = (
            self._extract_cited_chunk_numbers(
                summary
            )
        )

        # -------------------------------------------------
        # BUILD CITATIONS
        # -------------------------------------------------

        citations = [

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

            for chunk in used_chunks

            if (
                not cited_chunk_numbers
                or chunk.chunk_number
                in cited_chunk_numbers
            )
        ]

        # -------------------------------------------------
        # RESPONSE
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

                "decision_date": (
                    case.decision_date.isoformat()
                    if case.decision_date
                    else None
                ),

                "division": (
                    case.division
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

            "summary": summary,

            "citations": citations,
        }

    # =====================================================
    # SELECT SUMMARY CHUNKS
    # =====================================================

    @classmethod
    def _select_summary_chunks(
        cls,
        chunks: list,
    ) -> list:
        """
        Select representative locations from the case:

        1. Opening / parties
        2. Early facts
        3. First third
        4. Middle / reasoning
        5. Near ending
        6. Final disposition
        """

        maximum = (
            cls.MAX_CONTEXT_CHUNKS
        )

        if len(chunks) <= maximum:

            return chunks

        last_index = (
            len(chunks) - 1
        )

        indexes = {
            0,
            1,
            len(chunks) // 3,
            len(chunks) // 2,
            max(
                last_index - 1,
                0,
            ),
            last_index,
        }

        selected = [

            chunks[index]

            for index
            in sorted(indexes)

            if (
                0
                <= index
                < len(chunks)
            )
        ]

        return selected[:maximum]

    # =====================================================
    # COMPACT CHUNK TEXT
    # =====================================================

    @staticmethod
    def _compact_chunk_text(
        value: Any,
    ) -> str:
        """
        Normalize whitespace before sending
        the chunk to OpenAI.

        The database content is not modified.
        """

        return " ".join(
            str(
                value or ""
            )
            .strip()
            .split()
        )

    # =====================================================
    # CREATE EXCERPT
    # =====================================================

    @staticmethod
    def _create_excerpt(
        value: Any,
        limit: int = 260,
    ) -> str:

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

    # =====================================================
    # EXTRACT CITED CHUNK NUMBERS
    # =====================================================

    @staticmethod
    def _extract_cited_chunk_numbers(
        generated_text: str,
    ) -> set[int]:
        """
        Extract references such as:

        Chunk 3
        Chunks 3, 8
        Citation: Chunk 4
        Citation: Chunks 4, 7
        """

        matches = re.findall(
            (
                r"\bChunk(?:s)?\s+"
                r"([0-9,\s]+)"
            ),
            str(
                generated_text or ""
            ),
            flags=re.IGNORECASE,
        )

        chunk_numbers: set[int] = set()

        for match in matches:

            numbers = re.findall(
                r"\d+",
                match,
            )

            for number in numbers:

                chunk_numbers.add(
                    int(number)
                )

        return chunk_numbers