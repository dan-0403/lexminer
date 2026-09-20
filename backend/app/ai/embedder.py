import threading
from typing import ClassVar, Sequence

import numpy as np
from numpy.typing import NDArray
from sentence_transformers import SentenceTransformer

from app.core.config import settings


class EmbeddingGenerator:
    """
    Generates normalized embeddings for legal queries and
    Supreme Court decision chunks.

    Query embeddings and document embeddings are generated
    separately so retrieval-oriented models can apply the
    appropriate encoding behavior.
    """

    MODEL_NAME: ClassVar[str] = (
        settings.LEGAL_EMBEDDING_MODEL
    )

    BATCH_SIZE: ClassVar[int] = max(
        settings.LEGAL_EMBEDDING_BATCH_SIZE,
        1,
    )

    QUERY_INSTRUCTION: ClassVar[str] = (
        "Represent this sentence for searching relevant passages: "
    )

    _model: ClassVar[SentenceTransformer | None] = None

    _model_lock: ClassVar[threading.Lock] = (
        threading.Lock()
    )

    # =====================================================
    # GET MODEL
    # =====================================================

    @classmethod
    def get_model(
        cls,
    ) -> SentenceTransformer:

        if cls._model is not None:
            return cls._model

        with cls._model_lock:
            if cls._model is None:
                cls._model = SentenceTransformer(
                    cls.MODEL_NAME
                )

        return cls._model

    # =====================================================
    # NORMALIZE TEXT
    # =====================================================

    @staticmethod
    def _normalize_text(
        text: str,
    ) -> str:

        if not isinstance(text, str):
            raise TypeError(
                "Text must be a string."
            )

        normalized = " ".join(
            text.strip().split()
        )

        if not normalized:
            raise ValueError(
                "Text cannot be empty."
            )

        return normalized

    # =====================================================
    # NORMALIZE TEXT COLLECTION
    # =====================================================

    @classmethod
    def _normalize_texts(
        cls,
        texts: Sequence[str],
    ) -> list[str]:

        if isinstance(texts, str):
            raise TypeError(
                "Texts must be a sequence, not one string."
            )

        if not texts:
            raise ValueError(
                "Texts cannot be empty."
            )

        return [
            cls._normalize_text(text)
            for text in texts
        ]

    # =====================================================
    # GENERATE QUERY EMBEDDING
    # =====================================================

    @classmethod
    def generate_query(
        cls,
        text: str,
    ) -> list[float]:

        normalized = cls._normalize_text(
            text
        )

        prepared_query = (
            f"{cls.QUERY_INSTRUCTION}"
            f"{normalized}"
        )

        embedding = cls.get_model().encode(
            prepared_query,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )

        array = np.asarray(
            embedding,
            dtype=np.float32,
        )

        if array.ndim != 1:
            raise ValueError(
                "Expected one query embedding."
            )

        return [
            float(value)
            for value in array
        ]

    # =====================================================
    # GENERATE DOCUMENT EMBEDDING
    # =====================================================

    @classmethod
    def generate_document(
        cls,
        text: str,
    ) -> list[float]:

        normalized = cls._normalize_text(
            text
        )

        embedding = cls.get_model().encode(
            normalized,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )

        array = np.asarray(
            embedding,
            dtype=np.float32,
        )

        if array.ndim != 1:
            raise ValueError(
                "Expected one document embedding."
            )

        return [
            float(value)
            for value in array
        ]

    # =====================================================
    # GENERATE DOCUMENT BATCH
    # =====================================================

    @classmethod
    def generate_document_batch(
        cls,
        texts: Sequence[str],
    ) -> NDArray[np.float32]:

        normalized_texts = (
            cls._normalize_texts(
                texts
            )
        )

        embeddings = cls.get_model().encode(
            normalized_texts,
            batch_size=cls.BATCH_SIZE,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )

        array = np.asarray(
            embeddings,
            dtype=np.float32,
        )

        if array.ndim != 2:
            raise ValueError(
                "Expected a two-dimensional embedding array."
            )

        return array

    # =====================================================
    # BACKWARD COMPATIBILITY
    # =====================================================

    @classmethod
    def generate(
        cls,
        text: str,
    ) -> list[float]:

        return cls.generate_query(
            text
        )

    @classmethod
    def generate_batch(
        cls,
        texts: Sequence[str],
    ) -> NDArray[np.float32]:

        return cls.generate_document_batch(
            texts
        )

    # =====================================================
    # EMBEDDING DIMENSION
    # =====================================================

    @classmethod
    def get_embedding_dimension(
        cls,
    ) -> int:

        dimension = (
            cls.get_model()
            .get_embedding_dimension()
        )

        if dimension is None:
            raise RuntimeError(
                "The model did not report its embedding dimension."
            )

        return int(dimension)

    # =====================================================
    # RESET MODEL
    # =====================================================

    @classmethod
    def reset_model(
        cls,
    ) -> None:

        with cls._model_lock:
            cls._model = None