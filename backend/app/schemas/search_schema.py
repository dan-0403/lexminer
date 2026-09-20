from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class SearchFilters(BaseModel):

    year: int | None = Field(
        default=None,
        ge=1900,
        le=2100,
    )

    division: str | None = Field(
        default=None,
        max_length=100,
    )

    case_number: str | None = Field(
        default=None,
        max_length=150,
    )

    @field_validator(
        "division",
        "case_number",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(
        cls,
        value,
    ):

        if value is None:
            return None

        normalized = " ".join(
            str(value)
            .strip()
            .split()
        )

        return normalized or None


class SearchRequest(BaseModel):

    query: str = Field(
        default="",
        max_length=2000,
    )

    limit: int = Field(
        default=10,
        ge=1,
        le=100,
    )

    filters: SearchFilters | None = None

    @field_validator(
        "query",
        mode="before",
    )
    @classmethod
    def normalize_query(
        cls,
        value,
    ) -> str:

        return " ".join(
            str(value or "")
            .strip()
            .split()
        )

    @model_validator(
        mode="after",
    )
    def validate_search_input(
        self,
    ):

        case_number = (
            self.filters.case_number
            if self.filters
            else None
        )

        if not self.query and not case_number:
            raise ValueError(
                "Enter a semantic query or case number."
            )

        return self


class SearchCaseResponse(BaseModel):

    id: int
    title: str
    case_type: str | None = None
    case_number: str | None = None
    division: str | None = None
    decision_date: str | None = None
    ponencia: str | None = None
    pdf_path: str | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


class MatchedChunkResponse(BaseModel):

    document_id: str | None = None
    chunk_number: int | None = None
    text: str

    original_distance: float | None = None
    expanded_distance: float | None = None
    best_vector_distance: float | None = None
    vector_similarity_score: float | None = None

    reranker_score: float | None = None
    reranker_applied: bool = False

    retrieval_sources: list[str] = Field(
        default_factory=list
    )


class RankedCaseResponse(BaseModel):

    rank: int
    case: SearchCaseResponse

    similarity_score: float
    reranker_score: float | None = None
    best_vector_distance: float | None = None

    matching_chunks: int

    matched_chunks: list[
        MatchedChunkResponse
    ] = Field(
        default_factory=list
    )


class SemanticSearchResponse(BaseModel):

    original_query: str
    normalized_query: str
    expanded_query: str

    primary_intent: str | None = None
    matched_intents: list[str] = Field(
        default_factory=list
    )

    primary_issue: str | None = None
    matched_issues: list[str] = Field(
        default_factory=list
    )

    matched_concepts: list[str] = Field(
        default_factory=list
    )

    matched_scenarios: list[str] = Field(
        default_factory=list
    )

    applied_filters: SearchFilters

    retrieval: dict

    total_candidates: int
    total_results: int

    results: list[
        RankedCaseResponse
    ] = Field(
        default_factory=list
    )