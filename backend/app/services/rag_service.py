from sqlalchemy.orm import Session

from app.repositories.case_chunk_repository import (
    CaseChunkRepository,
)


class RAGService:

    """
    Retrieves complete case text
    for AI summarization.
    """

    def __init__(
        self,
        db: Session,
    ):

        self.chunk_repository = (
            CaseChunkRepository(db)
        )

    # =====================================================
    # RETRIEVE CASE TEXT
    # =====================================================

    def retrieve_case_text(
        self,
        case_id: int,
    ) -> str:

        chunks = self.chunk_repository.get_by_case_id(
            case_id
        )

        if not chunks:

            raise ValueError(
                "Case has no indexed chunks."
            )

        return "\n\n".join(

            chunk.chunk_text

            for chunk in chunks

        )