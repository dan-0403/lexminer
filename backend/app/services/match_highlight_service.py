import re
from typing import Any, ClassVar

import numpy as np

from app.ai.embedder import (
    EmbeddingGenerator,
)


class MatchHighlightService:

    """
    Finds sentences inside previously matched chunks
    that are semantically related to the user's query.

    This service does not search ChromaDB and does not
    determine which chunks match. It only analyzes chunks
    that were already selected by semantic search.
    """

    ABBREVIATIONS: ClassVar[set[str]] = {
        "G.R.",
        "No.",
        "Nos.",
        "Atty.",
        "Attys.",
        "Gov.",
        "Sec.",
        "Art.",
        "Arts.",
        "Par.",
        "Pars.",
        "Inc.",
        "Corp.",
        "Co.",
        "Ltd.",
        "Mr.",
        "Mrs.",
        "Ms.",
        "Dr.",
        "J.",
        "JJ.",
        "C.J.",
    }

    # =====================================================
    # SPLIT SENTENCES
    # =====================================================

    @classmethod
    def split_sentences(
        cls,
        text: str,
    ) -> list[dict[str, Any]]:

        if not isinstance(text, str):
            return []

        if not text.strip():
            return []

        sentences: list[dict[str, Any]] = []

        sentence_start = 0
        text_length = len(text)
        index = 0

        while index < text_length:

            character = text[index]

            if character not in ".!?":
                index += 1
                continue

            punctuation_end = index + 1

            while (
                punctuation_end < text_length
                and text[punctuation_end] in ".!?"
            ):
                punctuation_end += 1

            candidate_text = text[
                sentence_start:punctuation_end
            ]

            last_token = cls._get_last_token(
                candidate_text
            )

            if last_token in cls.ABBREVIATIONS:
                index = punctuation_end
                continue

            previous_character = (
                text[index - 1]
                if index > 0
                else ""
            )

            next_character = (
                text[punctuation_end]
                if punctuation_end < text_length
                else ""
            )

            # Do not split decimal values such as 3.14.
            if (
                character == "."
                and previous_character.isdigit()
                and next_character.isdigit()
            ):
                index = punctuation_end
                continue

            is_sentence_boundary = (
                punctuation_end == text_length
                or text[punctuation_end].isspace()
            )

            if is_sentence_boundary:

                cls._append_sentence(
                    sentences=sentences,
                    original_text=text,
                    raw_start=sentence_start,
                    raw_end=punctuation_end,
                )

                sentence_start = punctuation_end

                while (
                    sentence_start < text_length
                    and text[sentence_start].isspace()
                ):
                    sentence_start += 1

            index = punctuation_end

        # Include remaining text without punctuation.
        if sentence_start < text_length:
            cls._append_sentence(
                sentences=sentences,
                original_text=text,
                raw_start=sentence_start,
                raw_end=text_length,
            )

        return sentences

    # =====================================================
    # FIND MATCHING SENTENCES
    # =====================================================

    @classmethod
    def find_matching_sentences(
        cls,
        query: str,
        chunk_text: str,
        limit: int = 2,
        minimum_similarity: float = 0.40,
    ) -> list[dict[str, Any]]:

        if not isinstance(query, str):
            raise TypeError(
                "Search query must be a string."
            )

        cleaned_query = query.strip()

        if not cleaned_query:
            raise ValueError(
                "Search query cannot be empty."
            )

        if not isinstance(chunk_text, str):
            raise TypeError(
                "Chunk text must be a string."
            )

        if not chunk_text.strip():
            return []

        if limit < 1:
            raise ValueError(
                "Limit must be greater than zero."
            )

        if not -1.0 <= minimum_similarity <= 1.0:
            raise ValueError(
                "Minimum similarity must be between "
                "-1.0 and 1.0."
            )

        sentences = cls.split_sentences(
            chunk_text
        )

        if not sentences:
            return []

        sentence_texts = [
            sentence["text"]
            for sentence in sentences
        ]

        query_embedding = np.asarray(
            EmbeddingGenerator.generate(
                cleaned_query
            ),
            dtype=np.float32,
        )

        sentence_embeddings = (
            EmbeddingGenerator.generate_batch(
                sentence_texts
            )
        )

        if query_embedding.ndim != 1:
            raise ValueError(
                "Query embedding must be "
                "one-dimensional."
            )

        if sentence_embeddings.ndim != 2:
            raise ValueError(
                "Sentence embeddings must be "
                "two-dimensional."
            )

        if (
            sentence_embeddings.shape[0]
            != len(sentences)
        ):
            raise ValueError(
                "Sentence count and embedding count "
                "do not match."
            )

        if (
            sentence_embeddings.shape[1]
            != query_embedding.shape[0]
        ):
            raise ValueError(
                "Query and sentence embedding "
                "dimensions do not match."
            )

        scored_sentences: list[
            dict[str, Any]
        ] = []

        for sentence, sentence_embedding in zip(
            sentences,
            sentence_embeddings,
        ):

            # Because embeddings are normalized,
            # dot product equals cosine similarity.
            similarity_score = float(
                np.dot(
                    query_embedding,
                    sentence_embedding,
                )
            )

            if (
                similarity_score
                < minimum_similarity
            ):
                continue

            scored_sentences.append(
                {
                    "text": sentence["text"],
                    "start": sentence["start"],
                    "end": sentence["end"],
                    "similarity_score": round(
                        similarity_score,
                        6,
                    ),
                }
            )

        scored_sentences.sort(
            key=lambda item: item[
                "similarity_score"
            ],
            reverse=True,
        )

        return scored_sentences[:limit]

    # =====================================================
    # APPEND SENTENCE
    # =====================================================

    @staticmethod
    def _append_sentence(
        sentences: list[dict[str, Any]],
        original_text: str,
        raw_start: int,
        raw_end: int,
    ) -> None:

        raw_text = original_text[
            raw_start:raw_end
        ]

        if not raw_text.strip():
            return

        leading_whitespace = (
            len(raw_text)
            - len(raw_text.lstrip())
        )

        trailing_whitespace = (
            len(raw_text)
            - len(raw_text.rstrip())
        )

        start = (
            raw_start
            + leading_whitespace
        )

        end = (
            raw_end
            - trailing_whitespace
        )

        if start >= end:
            return

        sentences.append(
            {
                "text": original_text[start:end],
                "start": start,
                "end": end,
            }
        )

    # =====================================================
    # GET LAST TOKEN
    # =====================================================

    @staticmethod
    def _get_last_token(
        text: str,
    ) -> str:

        tokens = re.findall(
            r"\S+",
            text.strip(),
        )

        if not tokens:
            return ""

        return tokens[-1]