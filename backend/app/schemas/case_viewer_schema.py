from datetime import date
from typing import Any

from pydantic import BaseModel, field_validator
from pydantic import ConfigDict
from pydantic import Field


# ==========================================================
# MATCHED CHUNK REQUEST
# ==========================================================

class CaseViewerMatchedChunkRequest(BaseModel):
    document_id: str | None = None

    chunk_number: int = Field(
        ...,
        ge=0,
    )

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

    vector_similarity_score: float | None = Field(
        default=None,
        ge=0,
        le=1,
    )

    reranker_score: float | None = None

    reranker_applied: bool = False

    retrieval_sources: list[str] = Field(
        default_factory=list,
    )

    model_config = ConfigDict(
        extra="ignore",
    )


# ==========================================================
# CASE VIEWER REQUEST
# ==========================================================

class CaseViewerRequest(BaseModel):
    query: str = Field(
        default="",
        max_length=2000,
    )

    expanded_query: str | None = Field(
        default=None,
        max_length=5000,
    )

    similarity_score: float | None = Field(
        default=None,
        ge=0,
        le=1,
    )

    matched_intents: list[str] = Field(
        default_factory=list,
    )

    matched_issues: list[str] = Field(
        default_factory=list,
    )

    matched_concepts: list[str] = Field(
        default_factory=list,
    )

    matched_scenarios: list[str] = Field(
        default_factory=list,
    )

    matched_chunks: list[
        CaseViewerMatchedChunkRequest
    ] = Field(
        default_factory=list,
    )

    sentence_limit: int = Field(
        default=5,
        ge=1,
        le=20,
    )

    minimum_similarity: float = Field(
        default=0.35,
        ge=0,
        le=1,
    )


# ==========================================================
# SERIALIZED CASE METADATA
# ==========================================================

class CaseViewerCaseResponse(BaseModel):
    id: int

    title: str

    case_type: str | None = None

    case_number: str | None = None

    division: str | None = None

    decision_date: date | None = None

    year: int | None = None

    month: str | None = None

    ponencia: str | None = None

    pdf_path: str | None = None

    pdf_url: str | None = None

    # ======================================================
    # CONVERT DATABASE MONTH TO DISPLAY MONTH
    # ======================================================

    @field_validator("month", mode="before")
    @classmethod
    def normalize_month(cls, value):
        if value is None:
            return None

        month_names = {
            1: "January",
            2: "February",
            3: "March",
            4: "April",
            5: "May",
            6: "June",
            7: "July",
            8: "August",
            9: "September",
            10: "October",
            11: "November",
            12: "December",
        }

        if isinstance(value, int):
            return month_names.get(value)

        if isinstance(value, str):
            value = value.strip()

            if not value:
                return None

            if value.isdigit():
                numeric_month = int(value)
                return month_names.get(
                    numeric_month,
                    value,
                )

            return value

        return str(value)


# ==========================================================
# MATCHING SENTENCE
# ==========================================================

class MatchingSentenceResponse(BaseModel):
    text: str

    similarity_score: float | None = None

    model_config = ConfigDict(
        extra="allow",
    )


# ==========================================================
# NORMAL CHUNK RESPONSE
# ==========================================================

class CaseViewerChunkResponse(BaseModel):
    id: Any

    chunk_number: int

    text: str

    document_id: str | None = None


# ==========================================================
# MATCHED CHUNK RESPONSE
# ==========================================================

class CaseViewerMatchedChunkResponse(
    CaseViewerChunkResponse
):
    distance: float | None = None

    original_distance: float | None = None

    expanded_distance: float | None = None

    best_vector_distance: float | None = None

    vector_similarity_score: float | None = None

    reranker_score: float | None = None

    reranker_applied: bool = False

    retrieval_sources: list[str] = Field(
        default_factory=list,
    )

    matching_sentences: list[
        MatchingSentenceResponse | str
    ] = Field(
        default_factory=list,
    )


# ==========================================================
# SEARCH CONTEXT RESPONSE
# ==========================================================

class CaseViewerSearchContextResponse(BaseModel):
    query: str

    expanded_query: str

    similarity_score: float | None = None

    matched_intents: list[str] = Field(
        default_factory=list,
    )

    matched_issues: list[str] = Field(
        default_factory=list,
    )

    matched_concepts: list[str] = Field(
        default_factory=list,
    )

    matched_scenarios: list[str] = Field(
        default_factory=list,
    )

    requested_matched_chunks: int

    processed_matched_chunks: int


# ==========================================================
# COMPLETE CASE VIEWER RESPONSE
# ==========================================================

class CaseViewerResponse(BaseModel):
    case: CaseViewerCaseResponse

    search_context: (
        CaseViewerSearchContextResponse
    )

    chunk_count: int

    matched_chunk_count: int

    cleaned_case: str

    chunks: list[
        CaseViewerChunkResponse
    ]

    matched_chunks: list[
        CaseViewerMatchedChunkResponse
    ]

