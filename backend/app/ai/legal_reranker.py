import threading
from typing import Any, ClassVar

import numpy as np
import torch
from sentence_transformers import CrossEncoder

from app.core.config import settings


class LegalReranker:
    """
    Reranks semantic retrieval candidates using the original
    user query and each candidate case chunk.
    """

    ENABLED: ClassVar[bool] = (
        settings.LEGAL_RERANKER_ENABLED
    )

    MODEL_NAME: ClassVar[str] = (
        settings.LEGAL_RERANKER_MODEL
    )

    BATCH_SIZE: ClassVar[int] = max(
        settings.LEGAL_RERANKER_BATCH_SIZE,
        1,
    )

    MAX_LENGTH: ClassVar[int] = max(
        settings.LEGAL_RERANKER_MAX_LENGTH,
        64,
    )

    _model: ClassVar[CrossEncoder | None] = None

    _lock: ClassVar[threading.Lock] = (
        threading.Lock()
    )

    @classmethod
    def get_model(
        cls,
    ) -> CrossEncoder:

        if cls._model is not None:
            return cls._model

        with cls._lock:
            if cls._model is None:
                device = (
                    "cuda"
                    if torch.cuda.is_available()
                    else "cpu"
                )

                cls._model = CrossEncoder(
                    cls.MODEL_NAME,
                    device=device,
                    max_length=cls.MAX_LENGTH,
                    activation_fn=(
                        torch.nn.Sigmoid()
                    ),
                )

        return cls._model

    @classmethod
    def rerank(
        cls,
        query: str,
        candidates: list[
            dict[str, Any]
        ],
    ) -> list[
        dict[str, Any]
    ]:

        if not candidates:
            return []

        if not cls.ENABLED:
            return cls._fallback_sort(
                candidates
            )

        normalized_query = " ".join(
            str(query or "")
            .strip()
            .split()
        )

        if not normalized_query:
            raise ValueError(
                "Reranking query cannot be empty."
            )

        valid_candidates = [
            candidate
            for candidate in candidates
            if str(
                candidate.get(
                    "text",
                    "",
                )
            ).strip()
        ]

        pairs = [
            (
                normalized_query,
                str(
                    candidate["text"]
                ),
            )
            for candidate in valid_candidates
        ]

        try:
            raw_scores = (
                cls.get_model()
                .predict(
                    pairs,
                    batch_size=cls.BATCH_SIZE,
                    show_progress_bar=False,
                    convert_to_numpy=True,
                )
            )

        except Exception as error:
            print(
                "[RERANKER] Falling back to vector ranking:",
                error,
            )

            return cls._fallback_sort(
                valid_candidates
            )

        scores = (
            np.asarray(
                raw_scores,
                dtype=float,
            )
            .reshape(-1)
            .tolist()
        )

        results: list[
            dict[str, Any]
        ] = []

        for candidate, score in zip(
            valid_candidates,
            scores,
            strict=False,
        ):
            results.append(
                {
                    **candidate,
                    "reranker_score": round(
                        float(score),
                        6,
                    ),
                    "reranker_applied": True,
                }
            )

        results.sort(
            key=lambda item: item[
                "reranker_score"
            ],
            reverse=True,
        )

        return results

    @staticmethod
    def _fallback_sort(
        candidates: list[
            dict[str, Any]
        ],
    ) -> list[
        dict[str, Any]
    ]:

        results = [
            {
                **candidate,
                "reranker_score": None,
                "reranker_applied": False,
            }
            for candidate in candidates
        ]

        results.sort(
            key=lambda item: item.get(
                "best_vector_distance",
                float("inf"),
            )
        )

        return results