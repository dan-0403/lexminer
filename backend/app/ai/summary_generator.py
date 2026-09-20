import logging
import time
from typing import Any

import requests
from requests import Response
from requests.exceptions import ConnectionError
from requests.exceptions import RequestException
from requests.exceptions import Timeout

from app.core.config import settings


logger = logging.getLogger(
    __name__
)


class SummaryGenerator:
    """
    Generate concise grounded case summaries using
    a locally running Ollama model.

    Configuration is intentionally optimized for
    CPU-based generation speed.
    """

    NUM_CONTEXT = 4096

    NUM_PREDICT = 320

    NUM_THREADS = 8

    KEEP_ALIVE = "30m"

    _session = requests.Session()

    # =====================================================
    # GENERATE SUMMARY
    # =====================================================

    @classmethod
    def generate(
        cls,
        prompt: str,
    ) -> str:

        normalized_prompt = str(
            prompt
            or ""
        ).strip()

        if not normalized_prompt:
            raise ValueError(
                "Prompt cannot be empty."
            )

        base_url = str(
            settings.OLLAMA_BASE_URL
            or "http://localhost:11434"
        ).rstrip("/")

        model_name = str(
            settings.OLLAMA_MODEL
            or "llama3.2:1b"
        ).strip()

        if not model_name:
            raise RuntimeError(
                "OLLAMA_MODEL is not configured."
            )

        request_url = (
            f"{base_url}/api/chat"
        )

        system_prompt = (
            "You are LexMiner, a Philippine Supreme "
            "Court legal research assistant. "
            "Use only the supplied excerpts. "
            "Never invent facts, laws, dates, parties, "
            "doctrines, rulings, or chunk citations. "
            "Write concise professional legal prose."
        )

        request_payload: dict[
            str,
            Any,
        ] = {
            "model": model_name,

            "stream": False,

            # Prevent reasoning output on models that
            # expose optional thinking behavior.
            "think": False,

            # Avoid cold-model reloads for later requests.
            "keep_alive": (
                cls.KEEP_ALIVE
            ),

            "messages": [
                {
                    "role": "system",
                    "content": (
                        system_prompt
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        normalized_prompt
                    ),
                },
            ],

            "options": {
                "temperature": 0.0,

                "num_ctx": (
                    cls.NUM_CONTEXT
                ),

                "num_predict": (
                    cls.NUM_PREDICT
                ),

                "num_thread": (
                    cls.NUM_THREADS
                ),

                "top_k": 20,

                "top_p": 0.8,

                "repeat_penalty": 1.05,
            },
        }

        logger.info(
            (
                "Starting Ollama summary. "
                "model=%s "
                "prompt_characters=%s "
                "num_ctx=%s "
                "num_predict=%s"
            ),
            model_name,
            len(normalized_prompt),
            cls.NUM_CONTEXT,
            cls.NUM_PREDICT,
        )

        started_at = (
            time.perf_counter()
        )

        try:
            response = (
                cls._session.post(
                    request_url,
                    json=(
                        request_payload
                    ),
                    timeout=(
                        settings
                        .OLLAMA_TIMEOUT_SECONDS
                    ),
                )
            )

            cls._raise_for_ollama_error(
                response
            )

        except ConnectionError as exc:
            logger.exception(
                "Could not connect to Ollama."
            )

            raise RuntimeError(
                "Ollama is not running. "
                "Start Ollama and try again."
            ) from exc

        except Timeout as exc:
            logger.exception(
                "Ollama summary timed out."
            )

            raise RuntimeError(
                "The local AI model took too long "
                "to generate the summary."
            ) from exc

        except RequestException as exc:
            logger.exception(
                "Ollama summary request failed."
            )

            raise RuntimeError(
                "The local AI summary service "
                f"failed: {exc}"
            ) from exc

        try:
            response_data = (
                response.json()
            )

        except ValueError as exc:
            raise RuntimeError(
                "Ollama returned invalid JSON."
            ) from exc

        content = str(
            response_data
            .get(
                "message",
                {},
            )
            .get(
                "content",
                "",
            )
        ).strip()

        if not content:
            raise RuntimeError(
                "Ollama returned an empty summary."
            )

        elapsed_seconds = (
            time.perf_counter()
            - started_at
        )

        cls._log_performance(
            response_data=(
                response_data
            ),
            elapsed_seconds=(
                elapsed_seconds
            ),
        )

        return content

    # =====================================================
    # PERFORMANCE LOGGING
    # =====================================================

    @classmethod
    def _log_performance(
        cls,
        response_data: dict[
            str,
            Any,
        ],
        elapsed_seconds: float,
    ) -> None:

        load_seconds = (
            cls._nanoseconds_to_seconds(
                response_data.get(
                    "load_duration"
                )
            )
        )

        prompt_seconds = (
            cls._nanoseconds_to_seconds(
                response_data.get(
                    "prompt_eval_duration"
                )
            )
        )

        generation_seconds = (
            cls._nanoseconds_to_seconds(
                response_data.get(
                    "eval_duration"
                )
            )
        )

        prompt_tokens = (
            response_data.get(
                "prompt_eval_count",
                0,
            )
        )

        generated_tokens = (
            response_data.get(
                "eval_count",
                0,
            )
        )

        tokens_per_second = (
            cls._calculate_tokens_per_second(
                token_count=(
                    generated_tokens
                ),
                duration_seconds=(
                    generation_seconds
                ),
            )
        )

        logger.info(
            (
                "Summary completed | "
                "elapsed=%.2fs | "
                "load=%.2fs | "
                "prompt_eval=%.2fs | "
                "generation=%.2fs | "
                "prompt_tokens=%s | "
                "generated_tokens=%s | "
                "tokens_per_second=%.2f"
            ),
            elapsed_seconds,
            load_seconds,
            prompt_seconds,
            generation_seconds,
            prompt_tokens,
            generated_tokens,
            tokens_per_second,
        )

    # =====================================================
    # NANOSECONDS TO SECONDS
    # =====================================================

    @staticmethod
    def _nanoseconds_to_seconds(
        value: Any,
    ) -> float:

        try:
            return (
                float(value or 0)
                / 1_000_000_000
            )

        except (
            TypeError,
            ValueError,
        ):
            return 0.0

    # =====================================================
    # TOKENS PER SECOND
    # =====================================================

    @staticmethod
    def _calculate_tokens_per_second(
        token_count: Any,
        duration_seconds: float,
    ) -> float:

        try:
            normalized_tokens = float(
                token_count
                or 0
            )

            if duration_seconds <= 0:
                return 0.0

            return (
                normalized_tokens
                / duration_seconds
            )

        except (
            TypeError,
            ValueError,
            ZeroDivisionError,
        ):
            return 0.0

    # =====================================================
    # OLLAMA ERROR HANDLING
    # =====================================================

    @staticmethod
    def _raise_for_ollama_error(
        response: Response,
    ) -> None:

        if response.ok:
            return

        try:
            response_data = (
                response.json()
            )

            error_message = str(
                response_data.get(
                    "error",
                    "",
                )
            ).strip()

        except ValueError:
            error_message = (
                response.text.strip()
            )

        if (
            response.status_code
            == 404
            and "model"
            in error_message.lower()
        ):
            raise RuntimeError(
                "The configured Ollama model "
                "is not installed. Run: "
                f"ollama pull "
                f"{settings.OLLAMA_MODEL}"
            )

        raise RuntimeError(
            "Ollama returned HTTP "
            f"{response.status_code}: "
            f"{error_message or 'Unknown error.'}"
        )