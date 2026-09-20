from typing import Any

import chromadb

from app.core.config import settings


class VectorStore:

    """
    Handles ChromaDB storage, retrieval, counting,
    and deletion of legal case document embeddings.
    """

    _client = None

    _collection = None

    COLLECTION_NAME = "legal_cases"

    # =====================================================
    # GET COLLECTION
    # =====================================================

    @classmethod
    def get_collection(cls):

        if cls._collection is None:

            cls._client = (
                chromadb.PersistentClient(
                    path=str(
                        settings.CHROMA_DB_PATH
                    )
                )
            )

            cls._collection = (
                cls._client
                .get_or_create_collection(
                    name=cls.COLLECTION_NAME,
                    configuration={
                        "hnsw": {
                            "space": "cosine",
                        }
                    },
                )
            )

        return cls._collection

    # =====================================================
    # RESET CONNECTION
    # =====================================================

    @classmethod
    def reset_connection(
        cls,
    ) -> None:

        cls._collection = None

        cls._client = None

    # =====================================================
    # ADD OR UPDATE DOCUMENTS
    # =====================================================

    @classmethod
    def add_documents(
        cls,
        documents: list[
            dict[str, Any]
        ],
    ) -> int:

        if not documents:
            return 0

        collection = (
            cls.get_collection()
        )

        ids: list[str] = []

        texts: list[str] = []

        embeddings: list[
            list[float]
        ] = []

        metadatas: list[
            dict[str, Any]
        ] = []

        for document in documents:

            document_id = (
                document.get("id")
            )

            text = document.get(
                "text"
            )

            embedding = document.get(
                "embedding"
            )

            metadata = document.get(
                "metadata"
            )

            if document_id is None:
                continue

            if not isinstance(
                text,
                str,
            ):
                continue

            normalized_text = (
                text.strip()
            )

            if not normalized_text:
                continue

            try:
                normalized_embedding = (
                    cls._normalize_embedding(
                        embedding
                    )
                )
            except (
                TypeError,
                ValueError,
            ):
                continue

            normalized_metadata = (
                cls._normalize_metadata(
                    metadata=metadata,
                    document_id=str(
                        document_id
                    ),
                )
            )

            ids.append(
                str(document_id)
            )

            texts.append(
                normalized_text
            )

            embeddings.append(
                normalized_embedding
            )

            metadatas.append(
                normalized_metadata
            )

        if not ids:
            return 0

        collection.upsert(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        return len(ids)


    # =====================================================
    # SIMILARITY SEARCH
    # =====================================================

    @classmethod
    def similarity_search(
        cls,
        embedding: list[float],
        limit: int = 10,
        where: dict[str, Any] | None = None,
    ) -> dict[str, Any]:

        normalized_embedding = (
            cls._normalize_embedding(
                embedding
            )
        )

        safe_limit = int(limit)

        if safe_limit < 1:
            raise ValueError(
                "Search limit must be greater than zero."
            )

        collection = cls.get_collection()

        collection_count = (
            collection.count()
        )

        if collection_count <= 0:
            return {
                "ids": [[]],
                "documents": [[]],
                "metadatas": [[]],
                "distances": [[]],
            }

        safe_limit = min(
            safe_limit,
            collection_count,
        )

        arguments: dict[str, Any] = {
            "query_embeddings": [
                normalized_embedding
            ],
            "n_results": safe_limit,
            "include": [
                "documents",
                "metadatas",
                "distances",
            ],
        }

        if where:
            normalized_where = (
                cls._normalize_where_filter(
                    where
                )
            )

            if normalized_where:
                arguments["where"] = (
                    normalized_where
                )

        results = collection.query(
            **arguments
        )

        return {
            "ids": results.get(
                "ids",
                [[]],
            ),
            "documents": results.get(
                "documents",
                [[]],
            ),
            "metadatas": results.get(
                "metadatas",
                [[]],
            ),
            "distances": results.get(
                "distances",
                [[]],
            ),
        }
    # =====================================================
    # GET DOCUMENT BY ID
    # =====================================================

    @classmethod
    def get_by_id(
        cls,
        document_id: str,
    ) -> dict[str, Any]:

        normalized_document_id = (
            str(document_id or "")
            .strip()
        )

        if not normalized_document_id:
            return {
                "ids": [],
                "documents": [],
                "metadatas": [],
            }

        collection = (
            cls.get_collection()
        )

        return collection.get(
            ids=[
                normalized_document_id
            ],
            include=[
                "documents",
                "metadatas",
            ],
        )

    # =====================================================
    # GET DOCUMENTS BY CASE
    # =====================================================

    @classmethod
    def get_by_case_id(
        cls,
        case_id: int,
    ) -> dict[str, Any]:

        collection = (
            cls.get_collection()
        )

        return collection.get(
            where={
                "case_id": str(
                    case_id
                ),
            },
            include=[
                "documents",
                "metadatas",
            ],
        )

    # =====================================================
    # GET DOCUMENTS BY DATASET
    # =====================================================

    @classmethod
    def get_by_dataset_id(
        cls,
        dataset_id: Any,
    ) -> dict[str, Any]:

        collection = (
            cls.get_collection()
        )

        return collection.get(
            where={
                "dataset_id": str(
                    dataset_id
                ),
            },
            include=[
                "documents",
                "metadatas",
            ],
        )

    # =====================================================
    # DELETE DOCUMENT BY ID
    # =====================================================

    @classmethod
    def delete_by_id(
        cls,
        document_id: str,
    ) -> bool:

        normalized_document_id = (
            str(document_id or "")
            .strip()
        )

        if not normalized_document_id:
            return False

        collection = (
            cls.get_collection()
        )

        existing = collection.get(
            ids=[
                normalized_document_id
            ],
            include=[],
        )

        document_ids = (
            existing.get(
                "ids",
                [],
            )
        )

        if not document_ids:
            return False

        collection.delete(
            ids=document_ids
        )

        return True

    # =====================================================
    # DELETE DOCUMENTS BY IDS
    # =====================================================

    @classmethod
    def delete_by_ids(
        cls,
        document_ids: list[str],
    ) -> int:

        normalized_ids = list(
            dict.fromkeys(
                str(document_id)
                for document_id
                in document_ids
                if document_id is not None
                and str(
                    document_id
                ).strip()
            )
        )

        if not normalized_ids:
            return 0

        collection = (
            cls.get_collection()
        )

        existing = collection.get(
            ids=normalized_ids,
            include=[],
        )

        existing_ids = (
            existing.get(
                "ids",
                [],
            )
        )

        if not existing_ids:
            return 0

        collection.delete(
            ids=existing_ids
        )

        return len(
            existing_ids
        )

    # =====================================================
    # DELETE DOCUMENTS BY CASE
    # =====================================================

    @classmethod
    def delete_by_case_id(
        cls,
        case_id: int,
    ) -> int:

        collection = (
            cls.get_collection()
        )

        existing = collection.get(
            where={
                "case_id": str(
                    case_id
                ),
            },
            include=[],
        )

        document_ids = (
            existing.get(
                "ids",
                [],
            )
        )

        if not document_ids:
            return 0

        collection.delete(
            ids=document_ids
        )

        return len(
            document_ids
        )

    # =====================================================
    # DELETE DOCUMENTS BY DATASET
    # =====================================================

    @classmethod
    def delete_by_dataset_id(
        cls,
        dataset_id: Any,
    ) -> int:

        collection = (
            cls.get_collection()
        )

        existing = collection.get(
            where={
                "dataset_id": str(
                    dataset_id
                ),
            },
            include=[],
        )

        document_ids = (
            existing.get(
                "ids",
                [],
            )
        )

        if not document_ids:
            return 0

        collection.delete(
            ids=document_ids
        )

        return len(
            document_ids
        )

    # =====================================================
    # COUNT ALL DOCUMENTS
    # =====================================================

    @classmethod
    def count(
        cls,
    ) -> int:

        collection = (
            cls.get_collection()
        )

        return collection.count()

    # =====================================================
    # COUNT DOCUMENTS BY CASE
    # =====================================================

    @classmethod
    def count_by_case_id(
        cls,
        case_id: int,
    ) -> int:

        collection = (
            cls.get_collection()
        )

        result = collection.get(
            where={
                "case_id": str(
                    case_id
                ),
            },
            include=[],
        )

        return len(
            result.get(
                "ids",
                [],
            )
        )

    # =====================================================
    # COUNT DOCUMENTS BY DATASET
    # =====================================================

    @classmethod
    def count_by_dataset_id(
        cls,
        dataset_id: Any,
    ) -> int:

        collection = (
            cls.get_collection()
        )

        result = collection.get(
            where={
                "dataset_id": str(
                    dataset_id
                ),
            },
            include=[],
        )

        return len(
            result.get(
                "ids",
                [],
            )
        )

    # =====================================================
    # NORMALIZE EMBEDDING
    # =====================================================

    @staticmethod
    def _normalize_embedding(
        embedding: Any,
    ) -> list[float]:

        if embedding is None:
            raise ValueError(
                "Embedding cannot be empty."
            )

        if hasattr(
            embedding,
            "tolist",
        ):
            embedding = (
                embedding.tolist()
            )

        if not isinstance(
            embedding,
            list,
        ):
            raise TypeError(
                "Embedding must be a list of floats."
            )

        if not embedding:
            raise ValueError(
                "Embedding cannot be empty."
            )

        # Some embedding libraries return:
        # [[0.1, 0.2, ...]]
        #
        # Normalize that into:
        # [0.1, 0.2, ...]
        if (
            len(embedding) == 1
            and isinstance(
                embedding[0],
                list,
            )
        ):
            embedding = embedding[0]

        try:
            normalized_embedding = [
                float(value)
                for value in embedding
            ]
        except (
            TypeError,
            ValueError,
        ) as error:
            raise ValueError(
                "Embedding contains invalid values."
            ) from error

        if not normalized_embedding:
            raise ValueError(
                "Embedding cannot be empty."
            )

        return normalized_embedding

    # =====================================================
    # NORMALIZE METADATA
    # =====================================================

    @staticmethod
    def _normalize_metadata(
        metadata: dict[
            str,
            Any,
        ] | None,
        document_id: str,
    ) -> dict[str, Any]:

        normalized_metadata: dict[
            str,
            Any,
        ] = {}

        if metadata:
            for key, value in (
                metadata.items()
            ):

                if value is None:
                    continue

                normalized_key = str(
                    key
                )

                if isinstance(
                    value,
                    (
                        str,
                        int,
                        float,
                        bool,
                    ),
                ):
                    normalized_metadata[
                        normalized_key
                    ] = value

                elif hasattr(
                    value,
                    "isoformat",
                ):
                    normalized_metadata[
                        normalized_key
                    ] = (
                        value.isoformat()
                    )

                elif hasattr(
                    value,
                    "value",
                ):
                    normalized_metadata[
                        normalized_key
                    ] = str(
                        value.value
                    )

                else:
                    normalized_metadata[
                        normalized_key
                    ] = str(
                        value
                    )

        normalized_metadata.setdefault(
            "document_id",
            document_id,
        )

        if (
            "case_id"
            in normalized_metadata
        ):
            normalized_metadata[
                "case_id"
            ] = str(
                normalized_metadata[
                    "case_id"
                ]
            )

        if (
            "dataset_id"
            in normalized_metadata
        ):
            normalized_metadata[
                "dataset_id"
            ] = str(
                normalized_metadata[
                    "dataset_id"
                ]
            )

        if (
            "chunk_number"
            not in normalized_metadata
            and "chunk_index"
            in normalized_metadata
        ):
            normalized_metadata[
                "chunk_number"
            ] = normalized_metadata[
                "chunk_index"
            ]

        if (
            "chunk_index"
            not in normalized_metadata
            and "chunk_number"
            in normalized_metadata
        ):
            normalized_metadata[
                "chunk_index"
            ] = normalized_metadata[
                "chunk_number"
            ]

        return normalized_metadata

    # =====================================================
    # NORMALIZE WHERE FILTER
    # =====================================================

    @staticmethod
    def _normalize_where_filter(
        where: dict[
            str,
            Any,
        ],
    ) -> dict[str, Any]:

        normalized_where: dict[
            str,
            Any,
        ] = {}

        for key, value in (
            where.items()
        ):

            if value is None:
                continue

            normalized_key = str(
                key
            )

            if normalized_key in {
                "case_id",
                "dataset_id",
            }:
                normalized_where[
                    normalized_key
                ] = str(
                    value
                )
            else:
                normalized_where[
                    normalized_key
                ] = value

        return normalized_where

    # =====================================================
    # DELETE COLLECTION
    # =====================================================

    @classmethod
    def delete_collection(
        cls,
    ) -> None:

        if cls._client is None:
            cls.get_collection()

        try:
            cls._client.delete_collection(
                cls.COLLECTION_NAME
            )
        except Exception:
            pass

        cls._collection = None

    # =====================================================
    # RECREATE COLLECTION
    # =====================================================

    @classmethod
    def recreate_collection(
        cls,
    ):

        cls.delete_collection()

        cls._collection = None

        return cls.get_collection()