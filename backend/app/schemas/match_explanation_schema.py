from pydantic import BaseModel, ConfigDict, Field


# ==========================================================
# MATCHED CHUNK REQUEST
# ==========================================================

class MatchExplanationChunkRequest(BaseModel):
    """
    Represents a chunk that was already identified by
    LexMiner's semantic search as relevant to the user's
    query.

    The frontend may send retrieval metadata, but the
    MatchExplanationService will retrieve the authoritative
    chunk text from PostgreSQL using chunk_number.
    """

    document_id: str | None = None

    chunk_number: int = Field(
        ...,
        ge=0,
    )

    text: str | None = None

    # ------------------------------------------------------
    # Vector retrieval metadata
    # ------------------------------------------------------

    distance: float | None = Field(
        default=None,
        ge=0,
    )

    original_distance: float | None = Field(
        default=None,
        ge=0,
    )

    expanded_distance: float | None = Field(
        default=None,
        ge=0,
    )

    best_vector_distance: float | None = Field(
        default=None,
        ge=0,
    )

    # ------------------------------------------------------
    # Neural reranking metadata
    # ------------------------------------------------------

    reranker_score: float | None = None

    reranker_applied: bool = False

    # ------------------------------------------------------
    # Retrieval source information
    # ------------------------------------------------------

    retrieval_sources: list[str] = Field(
        default_factory=list,
        max_length=10,
    )

    # ------------------------------------------------------
    # Ignore additional search-result fields that may be
    # returned by SearchService.
    #
    # This keeps the schema compatible if the search result
    # contains fields such as:
    #
    # matching_sentences
    # similarity_score
    # match_type
    # rank
    # etc.
    # ------------------------------------------------------

    model_config = ConfigDict(
        extra="ignore",
    )


# ==========================================================
# MATCH EXPLANATION REQUEST
# ==========================================================

class MatchExplanationRequest(BaseModel):
    """
    Request used to generate an AI explanation of why a
    particular case matched the user's semantic search.

    The request carries the search context and the chunks
    selected by the retrieval system.
    """

    # ------------------------------------------------------
    # CASE
    # ------------------------------------------------------

    case_id: int = Field(
        ...,
        ge=1,
    )

    # ------------------------------------------------------
    # ORIGINAL USER QUERY
    # ------------------------------------------------------

    query: str = Field(
        ...,
        min_length=1,
        max_length=2_000,
    )

    # ------------------------------------------------------
    # EXPANDED QUERY
    # ------------------------------------------------------

    expanded_query: str | None = Field(
        default=None,
        max_length=5_000,
    )

    # ------------------------------------------------------
    # QUERY UNDERSTANDING
    # ------------------------------------------------------

    matched_intents: list[str] = Field(
        default_factory=list,
        max_length=20,
    )

    matched_issues: list[str] = Field(
        default_factory=list,
        max_length=20,
    )

    matched_concepts: list[str] = Field(
        default_factory=list,
        max_length=50,
    )

    matched_scenarios: list[str] = Field(
        default_factory=list,
        max_length=50,
    )

    # ------------------------------------------------------
    # SEARCH-MATCHED CHUNKS
    # ------------------------------------------------------
    #
    # The service will verify these chunk numbers against
    # PostgreSQL before sending any case text to OpenAI.
    #
    # ------------------------------------------------------

    matched_chunks: list[
        MatchExplanationChunkRequest
    ] = Field(
        default_factory=list,
        max_length=10,
    )

    # ------------------------------------------------------
    # PYDANTIC CONFIGURATION
    # ------------------------------------------------------

    model_config = ConfigDict(
        extra="ignore",
    )