import logging
import time

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    OpenAI,
)

from app.core.config import settings


logger = logging.getLogger(__name__)


class OpenAIGenerator:
    """
    OpenAI Cloud generator used by LexMiner.

    Used for:
    - Case summaries
    - Case explanations
    - Search match explanations

    The generator uses the OpenAI Responses API.
    """

    # =====================================================
    # OPENAI CLIENT
    # =====================================================

    client = OpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=settings.OPENAI_TIMEOUT_SECONDS,
        max_retries=1,
    )

    MODEL = settings.OPENAI_MODEL

    # =====================================================
    # REASONING
    # =====================================================

    # gpt-5-nano does not accept "none".
    #
    # "minimal" is appropriate for LexMiner because
    # summaries and explanations should be concise while
    # still allowing the model to reason over the supplied
    # legal case content.
    REASONING_EFFORT = "minimal"

    # =====================================================
    # OUTPUT LIMITS
    # =====================================================

    SUMMARY_MAX_OUTPUT = 1000

    EXPLANATION_MAX_OUTPUT = 1600

    MATCH_EXPLANATION_MAX_OUTPUT = 1200

    # =====================================================
    # SYSTEM INSTRUCTIONS
    # =====================================================

    INSTRUCTIONS = (
        "You are LexMiner, an AI legal research "
        "assistant specializing in Philippine "
        "Supreme Court decisions.\n\n"

        "IMPORTANT RULES:\n\n"

        "1. Use ONLY the supplied case content.\n\n"

        "2. Do NOT use outside legal knowledge.\n\n"

        "3. Do NOT invent facts, names, dates, "
        "laws, doctrines, arguments, evidence, "
        "procedural events, or rulings.\n\n"

        "4. If the supplied case content does "
        "not contain information needed to answer "
        "something, clearly state that the "
        "information is not available in the "
        "provided case.\n\n"

        "5. Write in clear, professional, "
        "objective legal research language.\n\n"

        "6. Avoid unnecessary repetition.\n\n"

        "7. Focus on the actual contents of the "
        "Philippine Supreme Court decision.\n\n"

        "8. Produce a useful explanation rather "
        "than merely repeating the case text.\n\n"

        "9. Never present assumptions or outside "
        "knowledge as facts from the case."
    )

    # =====================================================
    # SUMMARY
    # =====================================================

    @classmethod
    def generate_summary(
        cls,
        prompt: str,
    ) -> str:
        """
        Generate a grounded legal case summary.
        """

        return cls._generate(
            prompt=prompt,
            max_output_tokens=cls.SUMMARY_MAX_OUTPUT,
            operation="summary",
        )

    # =====================================================
    # EXPLANATION
    # =====================================================

    @classmethod
    def generate_explanation(
        cls,
        prompt: str,
    ) -> str:
        """
        Generate a grounded case explanation.
        """

        return cls._generate(
            prompt=prompt,
            max_output_tokens=cls.EXPLANATION_MAX_OUTPUT,
            operation="explanation",
        )

    # =====================================================
    # MATCH EXPLANATION
    # =====================================================

    @classmethod
    def generate_match_explanation(
        cls,
        prompt: str,
    ) -> str:
        """
        Generate a grounded explanation of why a
        specific case matched the user's search.
        """

        return cls._generate(
            prompt=prompt,
            max_output_tokens=(
                cls.MATCH_EXPLANATION_MAX_OUTPUT
            ),
            operation="match_explanation",
        )

    # =====================================================
    # COMMON GENERATOR
    # =====================================================

    @classmethod
    def _generate(
        cls,
        prompt: str,
        max_output_tokens: int,
        operation: str,
    ) -> str:
        """
        Send a request to the OpenAI Responses API.
        """

        normalized_prompt = str(
            prompt or ""
        ).strip()

        # -------------------------------------------------
        # VALIDATE PROMPT
        # -------------------------------------------------

        if not normalized_prompt:

            raise ValueError(
                "Prompt cannot be empty."
            )

        # -------------------------------------------------
        # VALIDATE CONFIGURATION
        # -------------------------------------------------

        if not settings.OPENAI_API_KEY:

            raise RuntimeError(
                "OPENAI_API_KEY is not configured."
            )

        if not cls.MODEL:

            raise RuntimeError(
                "OPENAI_MODEL is not configured."
            )

        logger.info(
            (
                "OpenAI %s request started | "
                "model=%s | "
                "reasoning_effort=%s | "
                "prompt_characters=%s | "
                "max_output_tokens=%s"
            ),
            operation,
            cls.MODEL,
            cls.REASONING_EFFORT,
            len(normalized_prompt),
            max_output_tokens,
        )

        started_at = time.perf_counter()

        # =================================================
        # OPENAI REQUEST
        # =================================================

        try:

            response = cls.client.responses.create(

                # -----------------------------------------
                # MODEL
                # -----------------------------------------

                model=cls.MODEL,

                # -----------------------------------------
                # INSTRUCTIONS
                # -----------------------------------------

                instructions=cls.INSTRUCTIONS,

                # -----------------------------------------
                # USER PROMPT
                # -----------------------------------------

                input=normalized_prompt,

                # -----------------------------------------
                # OUTPUT LIMIT
                # -----------------------------------------

                max_output_tokens=max_output_tokens,

                # -----------------------------------------
                # REASONING
                # -----------------------------------------
                #
                # IMPORTANT:
                #
                # Do NOT use:
                #
                #     "none"
                #
                # with gpt-5-nano.
                #
                # "minimal" is supported.
                #

                reasoning={
                    "effort": cls.REASONING_EFFORT,
                },

                # -----------------------------------------
                # PRIVACY
                # -----------------------------------------

                store=False,
            )

        # =================================================
        # TIMEOUT
        # =================================================

        except APITimeoutError as exc:

            logger.exception(
                "OpenAI %s request timed out.",
                operation,
            )

            raise RuntimeError(
                "The AI service took too long "
                "to generate the response."
            ) from exc

        # =================================================
        # CONNECTION ERROR
        # =================================================

        except APIConnectionError as exc:

            logger.exception(
                "Could not connect to OpenAI."
            )

            raise RuntimeError(
                "LexMiner could not connect "
                "to the OpenAI AI service."
            ) from exc

        # =================================================
        # API STATUS ERROR
        # =================================================

        except APIStatusError as exc:

            logger.exception(
                (
                    "OpenAI API error | "
                    "status=%s | "
                    "operation=%s | "
                    "model=%s"
                ),
                exc.status_code,
                operation,
                cls.MODEL,
            )

            # ---------------------------------------------
            # 400
            # ---------------------------------------------

            if exc.status_code == 400:

                raise RuntimeError(
                    "OpenAI rejected the request. "
                    "Please check the model settings, "
                    "reasoning configuration, and "
                    "request parameters. "
                    f"Details: {exc.message}"
                ) from exc

            # ---------------------------------------------
            # 401
            # ---------------------------------------------

            if exc.status_code == 401:

                raise RuntimeError(
                    "OpenAI authentication failed. "
                    "Please check OPENAI_API_KEY."
                ) from exc

            # ---------------------------------------------
            # 403
            # ---------------------------------------------

            if exc.status_code == 403:

                raise RuntimeError(
                    "OpenAI access was denied. "
                    "Please check the API key permissions "
                    "and project access."
                ) from exc

            # ---------------------------------------------
            # 429
            # ---------------------------------------------

            if exc.status_code == 429:

                error_text = str(
                    exc.message or ""
                ).lower()

                if (
                    "quota" in error_text
                    or "credit" in error_text
                    or "billing" in error_text
                ):

                    raise RuntimeError(
                        "OpenAI API credits or quota "
                        "are unavailable. Please check "
                        "your OpenAI API billing and "
                        "credit balance."
                    ) from exc

                raise RuntimeError(
                    "OpenAI rate limit reached. "
                    "Please try again shortly."
                ) from exc

            # ---------------------------------------------
            # OTHER API ERROR
            # ---------------------------------------------

            raise RuntimeError(
                "OpenAI AI service error: "
                f"{exc.message}"
            ) from exc

        # =================================================
        # UNEXPECTED ERROR
        # =================================================

        except Exception as exc:

            logger.exception(
                "Unexpected OpenAI generation error."
            )

            raise RuntimeError(
                "AI generation failed unexpectedly."
            ) from exc

        # =================================================
        # RESPONSE TIMING
        # =================================================

        elapsed = (
            time.perf_counter()
            - started_at
        )

        # =================================================
        # RESPONSE USAGE
        # =================================================

        usage = getattr(
            response,
            "usage",
            None,
        )

        # =================================================
        # RESPONSE OUTPUT
        # =================================================

        output_items = (
            getattr(
                response,
                "output",
                None,
            )
            or []
        )

        # =================================================
        # RESPONSE ID
        # =================================================

        response_id = getattr(
            response,
            "id",
            None,
        )

        logger.info(
            (
                "OpenAI %s response received | "
                "response_id=%s | "
                "status=%s | "
                "output_items=%s | "
                "elapsed_seconds=%.2f"
            ),
            operation,
            response_id,
            getattr(
                response,
                "status",
                None,
            ),
            len(output_items),
            elapsed,
        )

        # =================================================
        # USAGE LOGGING
        # =================================================

        logger.info(
            (
                "OpenAI %s usage | "
                "input_tokens=%s | "
                "output_tokens=%s | "
                "total_tokens=%s"
            ),
            operation,
            getattr(
                usage,
                "input_tokens",
                None,
            ),
            getattr(
                usage,
                "output_tokens",
                None,
            ),
            getattr(
                usage,
                "total_tokens",
                None,
            ),
        )

        # =================================================
        # RESPONSE STATUS
        # =================================================

        logger.info(
            (
                "OpenAI %s response status details | "
                "status=%s | "
                "incomplete_details=%r"
            ),
            operation,
            getattr(
                response,
                "status",
                None,
            ),
            getattr(
                response,
                "incomplete_details",
                None,
            ),
        )

        # =================================================
        # FIRST: SDK OUTPUT TEXT
        # =================================================

        content = str(
            getattr(
                response,
                "output_text",
                "",
            )
            or ""
        ).strip()

        # =================================================
        # SECOND: MANUAL OUTPUT PARSING
        # =================================================

        if not content:

            logger.warning(
                (
                    "OpenAI %s output_text was empty. "
                    "Inspecting output items..."
                ),
                operation,
            )

            text_parts: list[str] = []

            for index, item in enumerate(
                output_items
            ):

                item_type = getattr(
                    item,
                    "type",
                    None,
                )

                logger.info(
                    (
                        "OpenAI output item | "
                        "index=%s | "
                        "type=%s"
                    ),
                    index,
                    item_type,
                )

                # -----------------------------------------
                # ONLY PROCESS MESSAGE ITEMS
                # -----------------------------------------

                if item_type != "message":
                    continue

                content_items = (
                    getattr(
                        item,
                        "content",
                        None,
                    )
                    or []
                )

                for (
                    content_index,
                    content_item,
                ) in enumerate(
                    content_items
                ):

                    content_type = getattr(
                        content_item,
                        "type",
                        None,
                    )

                    logger.info(
                        (
                            "OpenAI message content | "
                            "index=%s | "
                            "type=%s"
                        ),
                        content_index,
                        content_type,
                    )

                    if (
                        content_type
                        != "output_text"
                    ):
                        continue

                    text_value = getattr(
                        content_item,
                        "text",
                        None,
                    )

                    if text_value:

                        text_parts.append(
                            str(
                                text_value
                            )
                        )

            content = "\n".join(
                text_parts
            ).strip()

        # =================================================
        # EMPTY RESPONSE DIAGNOSTICS
        # =================================================

        if not content:

            logger.error(
                (
                    "\n"
                    "==================================================\n"
                    "OPENAI EMPTY RESPONSE\n"
                    "==================================================\n"
                    "operation=%s\n"
                    "model=%s\n"
                    "reasoning_effort=%s\n"
                    "response_id=%s\n"
                    "status=%s\n"
                    "elapsed_seconds=%.2f\n"
                    "output_items=%s\n"
                    "input_tokens=%s\n"
                    "output_tokens=%s\n"
                    "total_tokens=%s\n"
                    "incomplete_details=%r\n"
                    "raw_output=%r\n"
                    "=================================================="
                ),
                operation,
                cls.MODEL,
                cls.REASONING_EFFORT,
                response_id,
                getattr(
                    response,
                    "status",
                    None,
                ),
                elapsed,
                len(output_items),
                getattr(
                    usage,
                    "input_tokens",
                    None,
                ),
                getattr(
                    usage,
                    "output_tokens",
                    None,
                ),
                getattr(
                    usage,
                    "total_tokens",
                    None,
                ),
                getattr(
                    response,
                    "incomplete_details",
                    None,
                ),
                output_items,
            )

            raise RuntimeError(
                "OpenAI returned an empty response."
            )

        # =================================================
        # SUCCESS
        # =================================================

        logger.info(
            (
                "OpenAI %s completed successfully | "
                "elapsed_seconds=%.2f | "
                "response_characters=%s"
            ),
            operation,
            elapsed,
            len(content),
        )

        return content