from pydantic import BaseModel, Field


class VectorIndexRebuildResponse(BaseModel):

    message: str

    cases_processed: int = Field(
        ge=0
    )

    chunks_processed: int = Field(
        ge=0
    )

    vectors_created: int = Field(
        ge=0
    )

    failed_chunks: int = Field(
        ge=0
    )