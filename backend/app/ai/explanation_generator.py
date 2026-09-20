import logging
import time

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    OpenAI,
    RateLimitError,
)

from app.core.config import settings


logger = logging.getLogger(__name__)


class ExplanationGenerator:
    """
    Generate a plain-language explanation of a
    Philippine Supreme Court decision using OpenAI.

    The model receives the complete case context
    prepared by ExplanationService.
    """

    # =====================================================
    # CONFIGURATION
    # =====================================================

    MODEL = settings.OPENAI_EXPLANATION_MODEL

    TIMEOUT = settings.OPENAI_TIMEOUT_SECONDS

    MAX_OUTPUT_TOKENS = 1000

    # =====================================================
    # OPENAI CLIENT
    # =====================================================

    _client = OpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=settings.OPENAI_TIMEOUT_SECONDS,
        max_retries=1,
    )

    # =====================================================
    # GENERATE
    # =====================================================

    @classmethod
    def generate(
        cls,
        prompt: str,
    ) -> str:

        if not prompt or not prompt.strip():
            raise RuntimeError(
                "Explanation prompt is empty."
            )

        started_at = time.perf_counter()

        logger.info(
            (
                "OpenAI explanation generation "
                "started | model=%s | prompt_characters=%s"
            ),
            cls.MODEL,
            len(prompt),
        )

        try:

            response = cls._client.responses.create(
                model=cls.MODEL,

                input=prompt,

                max_output_tokens=cls.MAX_OUTPUT_TOKENS,

                store=False,
            )

        except APITimeoutError as exc:

            logger.exception(
                "OpenAI explanation request timed out."
            )

            raise RuntimeError(
                "The AI explanation request timed out. "
                "Please try again."
            ) from exc

        except APIConnectionError as exc:

            logger.exception(
                "Unable to connect to OpenAI."
            )

            raise RuntimeError(
                "Unable to connect to the AI service. "
                "Please check your internet connection."
            ) from exc

        except RateLimitError as exc:

            logger.exception(
                "OpenAI rate limit or quota error."
            )

            raise RuntimeError(
                "The AI service is temporarily unavailable "
                "because of a usage or rate limit. "
                "Please try again later."
            ) from exc

        except APIStatusError as exc:

            logger.exception(
                (
                    "OpenAI API error | "
                    "status=%s"
                ),
                exc.status_code,
            )

            raise RuntimeError(
                "The AI service returned an error. "
                "Please try again."
            ) from exc

        except Exception as exc:

            logger.exception(
                "Unexpected OpenAI explanation error."
            )

            raise RuntimeError(
                "Failed to generate the case explanation."
            ) from exc

        elapsed = (
            time.perf_counter()
            - started_at
        )

        # -----------------------------------------
        # Extract generated text
        # -----------------------------------------

        explanation = (
            response.output_text
            or ""
        ).strip()

        if not explanation:

            logger.error(
                "OpenAI returned an empty explanation."
            )

            raise RuntimeError(
                "The AI service returned an empty explanation."
            )

        # -----------------------------------------
        # Usage logging
        # -----------------------------------------

        usage = getattr(
            response,
            "usage",
            None,
        )

        input_tokens = getattr(
            usage,
            "input_tokens",
            None,
        )

        output_tokens = getattr(
            usage,
            "output_tokens",
            None,
        )

        logger.info(
            (
                "OpenAI explanation generation "
                "completed | "
                "model=%s | "
                "elapsed=%.2fs | "
                "input_tokens=%s | "
                "output_tokens=%s | "
                "output_characters=%s"
            ),
            cls.MODEL,
            elapsed,
            input_tokens,
            output_tokens,
            len(explanation),
        )

        return explanation