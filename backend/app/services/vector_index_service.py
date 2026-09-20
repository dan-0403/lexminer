from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai.embedder import EmbeddingGenerator
from app.ai.vector_store import VectorStore
from app.models.case import CaseChunk
from app.repositories.case_chunk_repository import (
    CaseChunkRepository,
)


class VectorIndexService:
    """
    Rebuilds the ChromaDB vector index from existing
    CaseChunk records stored in PostgreSQL.

    This service preserves:

    - PDF files
    - Case records
    - CaseChunk records
    - Dataset records
    - User accounts
    - Visitor logs

    It recreates only the ChromaDB collection and regenerates
    document embeddings from CaseChunk.chunk_text.
    """

    BATCH_SIZE = 100

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.db = db

        self.case_chunk_repository = (
            CaseChunkRepository(db)
        )

    # =====================================================
    # REBUILD VECTOR INDEX
    # =====================================================

    def rebuild_vector_index(
        self,
    ) -> dict[str, Any]:

        total_chunks = (
            self.case_chunk_repository
            .count_all()
        )

        if total_chunks == 0:
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Vector index cannot be rebuilt because "
                    "PostgreSQL contains no case chunks."
                ),
            )

        cases_processed: set[int] = set()

        chunks_processed = 0
        vectors_created = 0
        failed_chunks = 0

        try:
            VectorStore.recreate_collection()

        except Exception as error:
            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Failed to recreate the ChromaDB "
                    f"collection: {error}"
                ),
            ) from error

        offset = 0

        while offset < total_chunks:

            chunks = (
                self.case_chunk_repository
                .get_all_paginated(
                    skip=offset,
                    limit=self.BATCH_SIZE,
                )
            )

            if not chunks:
                break

            batch_result = self._process_batch(
                chunks=chunks,
            )

            cases_processed.update(
                batch_result["case_ids"]
            )

            chunks_processed += (
                batch_result["chunks_processed"]
            )

            vectors_created += (
                batch_result["vectors_created"]
            )

            failed_chunks += (
                batch_result["failed_chunks"]
            )

            offset += self.BATCH_SIZE

        if vectors_created == 0:
            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "The vector index rebuild failed because "
                    "no vectors were created."
                ),
            )

        message = (
            "Vector index rebuilt successfully."
        )

        if failed_chunks > 0:
            message = (
                "Vector index rebuilt with some failed chunks."
            )

        return {
            "message": message,
            "cases_processed": len(
                cases_processed
            ),
            "chunks_processed": (
                chunks_processed
            ),
            "vectors_created": (
                vectors_created
            ),
            "failed_chunks": (
                failed_chunks
            ),
            "embedding_model": (
                EmbeddingGenerator.MODEL_NAME
            ),
            "embedding_dimension": (
                EmbeddingGenerator
                .get_embedding_dimension()
            ),
        }

    # =====================================================
    # PROCESS ONE BATCH
    # =====================================================

    def _process_batch(
        self,
        chunks: list[CaseChunk],
    ) -> dict[str, Any]:

        valid_chunks: list[CaseChunk] = []

        failed_chunks = 0

        for chunk in chunks:

            if chunk.case_id is None:
                failed_chunks += 1
                continue

            if not isinstance(
                chunk.chunk_text,
                str,
            ):
                failed_chunks += 1
                continue

            if not chunk.chunk_text.strip():
                failed_chunks += 1
                continue

            valid_chunks.append(
                chunk
            )

        if not valid_chunks:
            return {
                "case_ids": set(),
                "chunks_processed": 0,
                "vectors_created": 0,
                "failed_chunks": (
                    failed_chunks
                ),
            }

        texts = [
            chunk.chunk_text.strip()
            for chunk in valid_chunks
        ]

        try:
            embeddings = (
                self._generate_embeddings(
                    texts=texts,
                )
            )

        except Exception as error:
            print(
                "[VECTOR INDEX] Embedding batch failed:",
                error,
            )

            return {
                "case_ids": set(),
                "chunks_processed": 0,
                "vectors_created": 0,
                "failed_chunks": (
                    failed_chunks
                    + len(valid_chunks)
                ),
            }

        if len(embeddings) != len(
            valid_chunks
        ):
            return {
                "case_ids": set(),
                "chunks_processed": 0,
                "vectors_created": 0,
                "failed_chunks": (
                    failed_chunks
                    + len(valid_chunks)
                ),
            }

        vector_documents: list[
            dict[str, Any]
        ] = []

        prepared_chunks: list[
            tuple[CaseChunk, str]
        ] = []

        for chunk, embedding in zip(
            valid_chunks,
            embeddings,
            strict=True,
        ):
            try:
                document_id = (
                    self._build_document_id(
                        chunk=chunk
                    )
                )

                metadata = (
                    self._build_metadata(
                        chunk=chunk,
                        document_id=(
                            document_id
                        ),
                    )
                )

                vector_documents.append(
                    {
                        "id": document_id,
                        "text": (
                            chunk.chunk_text
                            .strip()
                        ),
                        "embedding": (
                            embedding
                        ),
                        "metadata": (
                            metadata
                        ),
                    }
                )

                prepared_chunks.append(
                    (
                        chunk,
                        document_id,
                    )
                )

            except Exception as error:
                print(
                    "[VECTOR INDEX] Chunk preparation failed:",
                    getattr(
                        chunk,
                        "id",
                        None,
                    ),
                    error,
                )

                failed_chunks += 1

        if not vector_documents:
            return {
                "case_ids": set(),
                "chunks_processed": 0,
                "vectors_created": 0,
                "failed_chunks": (
                    failed_chunks
                ),
            }

        try:
            vectors_created = (
                VectorStore.add_documents(
                    documents=(
                        vector_documents
                    )
                )
            )

        except Exception as error:
            print(
                "[VECTOR INDEX] Chroma upsert failed:",
                error,
            )

            return {
                "case_ids": set(),
                "chunks_processed": 0,
                "vectors_created": 0,
                "failed_chunks": (
                    failed_chunks
                    + len(
                        vector_documents
                    )
                ),
            }

        if vectors_created != len(
            vector_documents
        ):
            document_ids = [
                document["id"]
                for document in (
                    vector_documents
                )
            ]

            try:
                VectorStore.delete_by_ids(
                    document_ids=(
                        document_ids
                    )
                )

            except Exception:
                pass

            return {
                "case_ids": set(),
                "chunks_processed": 0,
                "vectors_created": 0,
                "failed_chunks": (
                    failed_chunks
                    + len(
                        vector_documents
                    )
                ),
            }

        case_ids: set[int] = set()

        for chunk, document_id in (
            prepared_chunks
        ):
            chunk.chroma_document_id = (
                document_id
            )

            case_ids.add(
                int(
                    chunk.case_id
                )
            )

            self.db.add(
                chunk
            )

        try:
            self.db.commit()

        except Exception as error:
            self.db.rollback()

            document_ids = [
                document_id
                for _, document_id
                in prepared_chunks
            ]

            try:
                VectorStore.delete_by_ids(
                    document_ids=(
                        document_ids
                    )
                )

            except Exception:
                pass

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "The vectors were created, but the "
                    "PostgreSQL chunk records could not "
                    f"be updated: {error}"
                ),
            ) from error

        return {
            "case_ids": (
                case_ids
            ),
            "chunks_processed": len(
                prepared_chunks
            ),
            "vectors_created": len(
                prepared_chunks
            ),
            "failed_chunks": (
                failed_chunks
            ),
        }

    # =====================================================
    # GENERATE DOCUMENT EMBEDDINGS
    # =====================================================

    @staticmethod
    def _generate_embeddings(
        texts: list[str],
    ) -> list[list[float]]:

        if not texts:
            return []

        raw_embeddings = (
            EmbeddingGenerator
            .generate_document_batch(
                texts
            )
        )

        if hasattr(
            raw_embeddings,
            "tolist",
        ):
            raw_embeddings = (
                raw_embeddings.tolist()
            )

        if not isinstance(
            raw_embeddings,
            list,
        ):
            raise TypeError(
                "Document embedding generation returned an invalid value."
            )

        return [
            [
                float(value)
                for value in embedding
            ]
            for embedding in raw_embeddings
        ]

    # =====================================================
    # BUILD DOCUMENT ID
    # =====================================================

    @staticmethod
    def _build_document_id(
        chunk: CaseChunk,
    ) -> str:

        if chunk.case_id is None:
            raise ValueError(
                "Case chunk has no case ID."
            )

        if chunk.chunk_number is None:
            raise ValueError(
                "Case chunk has no chunk number."
            )

        return (
            f"case_{chunk.case_id}"
            f"_chunk_{chunk.chunk_number}"
        )

    # =====================================================
    # BUILD VECTOR METADATA
    # =====================================================

    @staticmethod
    def _build_metadata(
        chunk: CaseChunk,
        document_id: str,
    ) -> dict[str, Any]:

        metadata: dict[str, Any] = {
            "document_id": (
                document_id
            ),
            "case_id": str(
                chunk.case_id
            ),
            "chunk_number": int(
                chunk.chunk_number
            ),
            "chunk_index": int(
                chunk.chunk_number
            ),
        }

        related_case = getattr(
            chunk,
            "case",
            None,
        )

        if related_case is not None:
            dataset_id = getattr(
                related_case,
                "dataset_id",
                None,
            )

            if dataset_id is not None:
                metadata["dataset_id"] = (
                    str(dataset_id)
                )

            case_number = getattr(
                related_case,
                "case_number",
                None,
            )

            if case_number:
                metadata["case_number"] = (
                    str(case_number)
                )

            division = getattr(
                related_case,
                "division",
                None,
            )

            if division:
                metadata["division"] = (
                    str(division)
                )

            decision_date = getattr(
                related_case,
                "decision_date",
                None,
            )

            if decision_date is not None:
                metadata["decision_date"] = (
                    decision_date
                    .isoformat()
                )

                metadata["year"] = int(
                    decision_date.year
                )

        return metadata