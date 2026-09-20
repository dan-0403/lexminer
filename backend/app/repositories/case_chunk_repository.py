from collections.abc import Sequence

from sqlalchemy.orm import Session

from app.models.case import CaseChunk


class CaseChunkRepository:

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.db = db

    # =====================================================
    # CREATE CHUNK
    # =====================================================

    def create(
        self,
        case_id: int,
        chunk_number: int,
        chunk_text: str,
        chroma_document_id: str,
    ) -> CaseChunk:

        existing_chunk = (
            self.get_by_chroma_document_id(
                chroma_document_id
            )
        )

        if existing_chunk is not None:
            return existing_chunk

        chunk = CaseChunk(
            case_id=case_id,
            chunk_number=chunk_number,
            chunk_text=chunk_text,
            chroma_document_id=chroma_document_id,
        )

        self.db.add(chunk)
        self.db.commit()
        self.db.refresh(chunk)

        return chunk

    # =====================================================
    # GET CHUNK BY ID
    # =====================================================

    def get_by_id(
        self,
        chunk_id: int,
    ) -> CaseChunk | None:

        return (
            self.db.query(CaseChunk)
            .filter(
                CaseChunk.id == chunk_id
            )
            .first()
        )

    # =====================================================
    # GET BY CHROMA DOCUMENT ID
    # =====================================================

    def get_by_chroma_document_id(
        self,
        chroma_document_id: str,
    ) -> CaseChunk | None:

        return (
            self.db.query(CaseChunk)
            .filter(
                CaseChunk.chroma_document_id
                == chroma_document_id
            )
            .first()
        )

    # =====================================================
    # GET ALL CHUNKS OF A CASE
    # =====================================================

    def get_by_case_id(
        self,
        case_id: int,
    ) -> list[CaseChunk]:

        return (
            self.db.query(CaseChunk)
            .filter(
                CaseChunk.case_id == case_id
            )
            .order_by(
                CaseChunk.chunk_number.asc()
            )
            .all()
        )

    # =====================================================
    # GET SELECTED CHUNKS
    # =====================================================

    def get_by_case_id_and_chunk_numbers(
        self,
        case_id: int,
        chunk_numbers: Sequence[int],
    ) -> list[CaseChunk]:

        normalized_chunk_numbers = sorted(
            {
                int(chunk_number)
                for chunk_number in chunk_numbers
            }
        )

        if not normalized_chunk_numbers:
            return []

        return (
            self.db.query(CaseChunk)
            .filter(
                CaseChunk.case_id == case_id,
                CaseChunk.chunk_number.in_(
                    normalized_chunk_numbers
                ),
            )
            .order_by(
                CaseChunk.chunk_number.asc()
            )
            .all()
        )

    # =====================================================
    # COUNT CHUNKS OF A CASE
    # =====================================================

    def count_by_case_id(
        self,
        case_id: int,
    ) -> int:

        return (
            self.db.query(CaseChunk)
            .filter(
                CaseChunk.case_id == case_id
            )
            .count()
        )

    # =====================================================
    # GET ALL CHUNKS
    # =====================================================

    def get_all(
        self,
    ) -> list[CaseChunk]:

        return (
            self.db.query(CaseChunk)
            .order_by(
                CaseChunk.case_id.asc(),
                CaseChunk.chunk_number.asc(),
            )
            .all()
        )

    # =====================================================
    # COUNT ALL CHUNKS
    # =====================================================

    def count_all(
        self,
    ) -> int:

        return (
            self.db.query(CaseChunk)
            .count()
        )

    # =====================================================
    # DELETE ALL CHUNKS OF A CASE
    # =====================================================

    def delete_by_case(
        self,
        case_id: int,
    ) -> int:

        deleted_count = (
            self.db.query(CaseChunk)
            .filter(
                CaseChunk.case_id == case_id
            )
            .delete(
                synchronize_session=False
            )
        )

        self.db.commit()

        return deleted_count

    # =====================================================
    # UPDATE CHUNK
    # =====================================================

    def update(
        self,
        chunk: CaseChunk,
    ) -> CaseChunk:

        self.db.add(chunk)
        self.db.commit()
        self.db.refresh(chunk)

        return chunk

    # =====================================================
    # COMMIT
    # =====================================================

    def commit(
        self,
    ) -> None:

        self.db.commit()

    # =====================================================
    # ROLLBACK
    # =====================================================

    def rollback(
        self,
    ) -> None:

        self.db.rollback()