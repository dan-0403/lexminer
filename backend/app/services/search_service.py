import re
from typing import Any

from sqlalchemy.orm import Session

from app.ai.embedder import EmbeddingGenerator
from app.ai.legal_reranker import LegalReranker
from app.ai.query_understanding_pipeline import (
    QueryUnderstandingPipeline,
)
from app.ai.vector_store import VectorStore
from app.models.case import Case
from app.repositories.case_chunk_repository import (
    CaseChunkRepository,
)
from app.repositories.case_repository import (
    CaseRepository,
)
from app.schemas.search_schema import SearchFilters


class SearchService:
    """
    Perform exact case-number lookup or hybrid semantic
    retrieval with neural reranking.

    Optimized for faster response times while preserving
    semantic retrieval and legal reranking.

    Search behavior:

    1. A specific case-number filter always performs
       an exact PostgreSQL lookup.

    2. A main search query containing only a recognizable
       Philippine case number performs an exact lookup.

    3. All other queries use semantic vector retrieval,
       metadata filtering, and optional neural reranking.
    """

    # =====================================================
    # PERFORMANCE SETTINGS
    # =====================================================

    # Previously:
    # MIN_CANDIDATE_LIMIT = 30
    #
    # We only need a small candidate pool for the final
    # case results.

    MIN_CANDIDATE_LIMIT = 20

    # Prevent unnecessarily large Chroma searches.

    MAX_CANDIDATE_LIMIT = 40

    # Previously 3.
    #
    # Example:
    # requested 10 results
    # 10 x 2 = 20 candidates

    RETRIEVAL_MULTIPLIER = 2

    # Previously 40.
    #
    # Cross-encoder reranking is one of the more expensive
    # parts of the search pipeline, so only rerank the
    # strongest candidates.

    MAX_RERANK_CANDIDATES = 15

    # Only return a small number of relevant chunks for
    # each case.

    MAX_CHUNKS_PER_CASE = 3

    # =====================================================
    # INITIALIZATION
    # =====================================================

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.case_repository = CaseRepository(db)

        self.case_chunk_repository = CaseChunkRepository(db)

    # =====================================================
    # PREPARE SEMANTIC QUERY
    # =====================================================

    def prepare_query(
        self,
        query: str,
    ) -> dict[str, Any]:

        normalized_query = self._normalize_text(query)

        if not normalized_query:
            raise ValueError(
                "Semantic query cannot be empty."
            )

        understanding = (
            QueryUnderstandingPipeline
            .understand(
                normalized_query
            )
        )

        original_query = self._normalize_text(
            understanding.get(
                "original_query",
                normalized_query,
            )
        )

        if not original_query:
            original_query = normalized_query

        expanded_query = self._normalize_text(
            understanding.get(
                "expanded_query",
                original_query,
            )
        )

        if not expanded_query:
            expanded_query = original_query

        # -------------------------------------------------
        # Determine whether expansion is actually useful
        # -------------------------------------------------

        expansion_is_different = (
            expanded_query.casefold()
            != original_query.casefold()
        )

        # -------------------------------------------------
        # Generate original query embedding
        # -------------------------------------------------

        original_embedding = (
            EmbeddingGenerator.generate_query(
                original_query
            )
        )

        # -------------------------------------------------
        # Generate expanded embedding only when needed
        # -------------------------------------------------

        if expansion_is_different:

            expanded_embedding = (
                EmbeddingGenerator.generate_query(
                    expanded_query
                )
            )

        else:

            # Reuse the original embedding instead of
            # generating another embedding.

            expanded_embedding = original_embedding

        return {
            **understanding,

            "original_query": original_query,

            "normalized_query": normalized_query,

            "expanded_query": expanded_query,

            "original_embedding": original_embedding,

            "expanded_embedding": expanded_embedding,

            "expansion_is_different": expansion_is_different,
        }

    # =====================================================
    # SEARCH
    # =====================================================

    def semantic_search(
        self,
        query: str,
        limit: int = 10,
        filters: SearchFilters | None = None,
    ) -> dict[str, Any]:

        # -------------------------------------------------
        # Sanitize requested result limit
        # -------------------------------------------------

        safe_limit = min(
            max(
                int(limit),
                1,
            ),
            100,
        )

        filters = filters or SearchFilters()

        normalized_query = self._normalize_text(query)

        normalized_filter_case_number = (
            self._normalize_text(
                filters.case_number
            )
        )

        if (
            not normalized_query
            and not normalized_filter_case_number
        ):
            raise ValueError(
                "Enter a semantic query or case number."
            )

        # =================================================
        # DETECT EXACT CASE NUMBER
        # =================================================

        query_case_number = (
            self._extract_case_number_from_query(
                normalized_query
            )
        )

        exact_case_number = (
            normalized_filter_case_number
            or query_case_number
        )

        # =================================================
        # EXACT CASE-NUMBER RETRIEVAL
        # =================================================

        if exact_case_number:

            return self._search_exact_case_number(
                case_number=exact_case_number,
                original_query=(
                    normalized_query
                    or exact_case_number
                ),
                filters=filters,
                limit=safe_limit,
            )

        # =================================================
        # SEMANTIC RETRIEVAL
        # =================================================

        return self._semantic_retrieval(
            query=normalized_query,
            limit=safe_limit,
            filters=filters,
        )

    # =====================================================
    # EXACT CASE-NUMBER SEARCH
    # =====================================================

    def _search_exact_case_number(
        self,
        case_number: str,
        original_query: str,
        filters: SearchFilters,
        limit: int,
    ) -> dict[str, Any]:

        normalized_case_number = (
            self._normalize_case_number(
                case_number
            )
        )

        if not normalized_case_number:

            raise ValueError(
                "A valid case number is required."
            )

        matched_cases = (
            self.case_repository
            .get_by_case_number_exact(
                case_number
            )
        )

        cases: list[Case] = []

        if isinstance(
            matched_cases,
            Case,
        ):

            cases = [
                matched_cases
            ]

        elif isinstance(
            matched_cases,
            (
                list,
                tuple,
            ),
        ):

            cases = [
                case
                for case in matched_cases
                if isinstance(
                    case,
                    Case,
                )
            ]

        # -------------------------------------------------
        # Apply optional filters
        # -------------------------------------------------

        cases = [
            case
            for case in cases
            if self._case_matches_optional_filters(
                case=case,
                filters=filters,
            )
        ]

        if not cases:

            return self._empty_exact_case_response(
                case_number=case_number,
                original_query=original_query,
                filters=filters,
            )

        selected_case = cases[0]

        # -------------------------------------------------
        # Retrieve chunks
        # -------------------------------------------------

        chunks = (
            self.case_chunk_repository
            .get_by_case_id(
                selected_case.id
            )
        )

        ordered_chunks = sorted(
            chunks or [],
            key=lambda chunk: (
                chunk.chunk_number
            ),
        )

        serialized_chunks: list[
            dict[str, Any]
        ] = []

        for chunk in ordered_chunks[
            :self.MAX_CHUNKS_PER_CASE
        ]:

            chunk_text = str(
                chunk.chunk_text or ""
            ).strip()

            if not chunk_text:
                continue

            serialized_chunks.append(
                {
                    "document_id": (
                        chunk.chroma_document_id
                    ),

                    "chunk_number": (
                        chunk.chunk_number
                    ),

                    "text": chunk_text,

                    "original_distance": 0.0,

                    "expanded_distance": None,

                    "best_vector_distance": 0.0,

                    "vector_similarity_score": 1.0,

                    "reranker_score": None,

                    "reranker_applied": False,

                    "retrieval_sources": [
                        "exact_case_number"
                    ],
                }
            )

        result = {
            "rank": 1,

            "case": (
                self._serialize_case(
                    selected_case
                )
            ),

            "similarity_score": 1.0,

            "reranker_score": None,

            "best_vector_distance": 0.0,

            "matching_chunks": len(
                serialized_chunks
            ),

            "matched_chunks": (
                serialized_chunks
            ),

            "match_type": (
                "exact_case_number"
            ),
        }

        return {
            "original_query": original_query,

            "normalized_query": (
                self._normalize_text(
                    original_query
                )
            ),

            "expanded_query": original_query,

            "primary_intent": (
                "CASE_NUMBER_LOOKUP"
            ),

            "matched_intents": [
                "CASE_NUMBER_LOOKUP"
            ],

            "primary_issue": None,

            "matched_issues": [],

            "matched_concepts": [],

            "matched_scenarios": [],

            "applied_filters": (
                self._serialize_exact_filters(
                    filters=filters,
                    case_number=case_number,
                )
            ),

            "retrieval": {
                "retrieval_mode": (
                    "exact_case_number"
                ),

                "candidate_limit_per_query": 0,

                "original_query_candidates": 1,

                "expanded_query_candidates": 0,

                "merged_candidates": 1,

                "filtered_candidates": 1,

                "reranked_candidates": 1,

                "dual_retrieval_used": False,

                "reranker_enabled": False,

                "reranker_model": None,
            },

            "total_candidates": 1,

            "total_results": 1,

            "results": [
                result
            ][:limit],
        }

    # =====================================================
    # SEMANTIC RETRIEVAL
    # =====================================================

    def _semantic_retrieval(
        self,
        query: str,
        limit: int,
        filters: SearchFilters,
    ) -> dict[str, Any]:

        # -------------------------------------------------
        # Query understanding + embeddings
        # -------------------------------------------------

        query_data = self.prepare_query(query)

        # -------------------------------------------------
        # Calculate candidate count
        # -------------------------------------------------

        candidate_limit = min(
            max(
                limit * self.RETRIEVAL_MULTIPLIER,
                self.MIN_CANDIDATE_LIMIT,
            ),
            self.MAX_CANDIDATE_LIMIT,
        )

        # =================================================
        # ORIGINAL QUERY VECTOR SEARCH
        # =================================================

        original_results = (
            VectorStore.similarity_search(
                embedding=query_data[
                    "original_embedding"
                ],
                limit=candidate_limit,
            )
        )

        original_candidates = (
            self._extract_candidates(
                results=original_results,
                source="original_query",
            )
        )

        # =================================================
        # EXPANDED QUERY VECTOR SEARCH
        # =================================================

        expanded_candidates: list[
            dict[str, Any]
        ] = []

        if query_data[
            "expansion_is_different"
        ]:

            expanded_results = (
                VectorStore.similarity_search(
                    embedding=query_data[
                        "expanded_embedding"
                    ],
                    limit=candidate_limit,
                )
            )

            expanded_candidates = (
                self._extract_candidates(
                    results=expanded_results,
                    source="expanded_query",
                )
            )

        # =================================================
        # MERGE
        # =================================================

        merged_candidates = (
            self._merge_candidates(
                original=original_candidates,
                expanded=expanded_candidates,
            )
        )

        if not merged_candidates:

            return self._empty_response(
                query_data=query_data,
                filters=filters,
                candidate_limit=candidate_limit,
                original_count=len(
                    original_candidates
                ),
                expanded_count=len(
                    expanded_candidates
                ),
            )

        # =================================================
        # CASE IDS
        # =================================================

        case_ids = list(
            {
                candidate["case_id"]
                for candidate
                in merged_candidates
            }
        )

        # =================================================
        # POSTGRESQL METADATA FILTERING
        # =================================================

        cases = (
            self.case_repository
            .get_by_ids_filtered(
                case_ids=case_ids,
                year=filters.year,
                division=filters.division,
                case_number=None,
            )
        )

        case_lookup = {
            case.id: case
            for case in cases
        }

        # =================================================
        # FILTER CANDIDATES
        # =================================================

        filtered_candidates = [
            candidate
            for candidate
            in merged_candidates
            if candidate["case_id"]
            in case_lookup
        ]

        # -------------------------------------------------
        # Sort by vector distance
        # -------------------------------------------------

        filtered_candidates.sort(
            key=lambda candidate: (
                candidate[
                    "best_vector_distance"
                ]
            )
        )

        # -------------------------------------------------
        # Limit expensive reranking
        # -------------------------------------------------

        filtered_candidates = (
            filtered_candidates[
                :self.MAX_RERANK_CANDIDATES
            ]
        )

        if not filtered_candidates:

            return self._empty_response(
                query_data=query_data,
                filters=filters,
                candidate_limit=candidate_limit,
                original_count=len(
                    original_candidates
                ),
                expanded_count=len(
                    expanded_candidates
                ),
            )

        # =================================================
        # CROSS-ENCODER RERANKING
        # =================================================

        reranked_candidates = (
            LegalReranker.rerank(
                query=query_data[
                    "original_query"
                ],
                candidates=filtered_candidates,
            )
        )

        # =================================================
        # GROUP BY CASE
        # =================================================

        grouped_cases = (
            self._group_by_case(
                candidates=reranked_candidates,
                case_lookup=case_lookup,
            )
        )

        ranked_results = list(
            grouped_cases.values()
        )

        # =================================================
        # FINAL SORT
        # =================================================

        ranked_results.sort(
            key=lambda result: (
                -result[
                    "similarity_score"
                ],

                result.get(
                    "best_vector_distance",
                    float("inf"),
                ),
            )
        )

        # =================================================
        # FINAL LIMIT
        # =================================================

        final_results = (
            ranked_results[
                :limit
            ]
        )

        for index, result in enumerate(
            final_results,
            start=1,
        ):

            result["rank"] = index

            result["match_type"] = (
                "semantic"
            )

        # =================================================
        # RESPONSE
        # =================================================

        return {
            "original_query": (
                query_data[
                    "original_query"
                ]
            ),

            "normalized_query": (
                query_data[
                    "normalized_query"
                ]
            ),

            "expanded_query": (
                query_data[
                    "expanded_query"
                ]
            ),

            "primary_intent": (
                query_data.get(
                    "primary_intent"
                )
            ),

            "matched_intents": (
                query_data.get(
                    "matched_intents",
                    [],
                )
            ),

            "primary_issue": (
                query_data.get(
                    "primary_issue"
                )
            ),

            "matched_issues": (
                query_data.get(
                    "matched_issues",
                    [],
                )
            ),

            "matched_concepts": (
                query_data.get(
                    "matched_concepts",
                    [],
                )
            ),

            "matched_scenarios": (
                query_data.get(
                    "matched_scenarios",
                    [],
                )
            ),

            "applied_filters": (
                filters.model_dump()
            ),

            "retrieval": {
                "retrieval_mode": "semantic",

                "candidate_limit_per_query": (
                    candidate_limit
                ),

                "original_query_candidates": (
                    len(original_candidates)
                ),

                "expanded_query_candidates": (
                    len(expanded_candidates)
                ),

                "merged_candidates": (
                    len(merged_candidates)
                ),

                "filtered_candidates": (
                    len(filtered_candidates)
                ),

                "reranked_candidates": (
                    len(reranked_candidates)
                ),

                "dual_retrieval_used": (
                    query_data[
                        "expansion_is_different"
                    ]
                ),

                "reranker_enabled": (
                    LegalReranker.ENABLED
                ),

                "reranker_model": (
                    LegalReranker.MODEL_NAME
                    if LegalReranker.ENABLED
                    else None
                ),
            },

            "total_candidates": (
                len(merged_candidates)
            ),

            "total_results": (
                len(final_results)
            ),

            "results": final_results,
        }

    # =====================================================
    # EXTRACT CHROMA RESULTS
    # =====================================================

    def _extract_candidates(
        self,
        results: dict[str, Any],
        source: str,
    ) -> list[dict[str, Any]]:

        ids = self._first_batch(
            results,
            "ids",
        )

        documents = self._first_batch(
            results,
            "documents",
        )

        metadatas = self._first_batch(
            results,
            "metadatas",
        )

        distances = self._first_batch(
            results,
            "distances",
        )

        count = min(
            len(ids),
            len(documents),
            len(metadatas),
            len(distances),
        )

        candidates: list[
            dict[str, Any]
        ] = []

        for index in range(count):

            metadata = (
                metadatas[index]
                if isinstance(
                    metadatas[index],
                    dict,
                )
                else {}
            )

            case_id = (
                self._parse_integer(
                    metadata.get(
                        "case_id"
                    )
                )
            )

            if case_id is None:
                continue

            text = str(
                documents[index] or ""
            ).strip()

            if not text:
                continue

            try:

                distance = float(
                    distances[index]
                )

            except (
                TypeError,
                ValueError,
            ):

                continue

            chunk_number = (
                self._parse_integer(
                    metadata.get(
                        "chunk_number"
                    )
                )
            )

            if chunk_number is None:

                chunk_number = (
                    self._parse_integer(
                        metadata.get(
                            "chunk_index"
                        )
                    )
                )

            candidates.append(
                {
                    "document_id": str(
                        ids[index]
                    ),

                    "case_id": case_id,

                    "chunk_number": (
                        chunk_number
                    ),

                    "text": text,

                    "metadata": metadata,

                    "original_distance": (
                        distance
                        if source
                        == "original_query"
                        else None
                    ),

                    "expanded_distance": (
                        distance
                        if source
                        == "expanded_query"
                        else None
                    ),

                    "best_vector_distance": (
                        distance
                    ),

                    "vector_similarity_score": (
                        self._distance_to_similarity(
                            distance
                        )
                    ),

                    "reranker_score": None,

                    "reranker_applied": False,

                    "retrieval_sources": [
                        source
                    ],
                }
            )

        return candidates

    # =====================================================
    # MERGE CANDIDATES
    # =====================================================

    def _merge_candidates(
        self,
        original: list[dict[str, Any]],
        expanded: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:

        merged: dict[
            str,
            dict[str, Any],
        ] = {}

        for candidate in [
            *original,
            *expanded,
        ]:

            document_id = candidate[
                "document_id"
            ]

            existing = merged.get(
                document_id
            )

            if existing is None:

                merged[
                    document_id
                ] = {
                    **candidate,

                    "retrieval_sources": list(
                        candidate[
                            "retrieval_sources"
                        ]
                    ),
                }

                continue

            # -------------------------------------------------
            # Preserve the best distance from both searches
            # -------------------------------------------------

            for distance_name in (
                "original_distance",
                "expanded_distance",
            ):

                incoming = candidate.get(
                    distance_name
                )

                current = existing.get(
                    distance_name
                )

                if (
                    incoming is not None
                    and (
                        current is None
                        or incoming < current
                    )
                ):

                    existing[
                        distance_name
                    ] = incoming

            valid_distances = [
                distance
                for distance in (
                    existing.get(
                        "original_distance"
                    ),
                    existing.get(
                        "expanded_distance"
                    ),
                )
                if distance is not None
            ]

            if not valid_distances:
                continue

            best_distance = min(
                valid_distances
            )

            existing[
                "best_vector_distance"
            ] = best_distance

            existing[
                "vector_similarity_score"
            ] = (
                self._distance_to_similarity(
                    best_distance
                )
            )

            sources = set(
                existing[
                    "retrieval_sources"
                ]
            )

            sources.update(
                candidate[
                    "retrieval_sources"
                ]
            )

            existing[
                "retrieval_sources"
            ] = sorted(sources)

        results = list(
            merged.values()
        )

        results.sort(
            key=lambda candidate: (
                candidate[
                    "best_vector_distance"
                ]
            )
        )

        return results

    # =====================================================
    # GROUP BY CASE
    # =====================================================

    def _group_by_case(
        self,
        candidates: list[dict[str, Any]],
        case_lookup: dict[int, Case],
    ) -> dict[
        int,
        dict[str, Any],
    ]:

        grouped: dict[
            int,
            dict[str, Any],
        ] = {}

        for candidate in candidates:

            case_id = candidate[
                "case_id"
            ]

            case = case_lookup.get(
                case_id
            )

            if case is None:
                continue

            vector_score = float(
                candidate[
                    "vector_similarity_score"
                ]
            )

            reranker_score = (
                candidate.get(
                    "reranker_score"
                )
            )

            if reranker_score is not None:

                chunk_score = (
                    0.85
                    * float(
                        reranker_score
                    )
                    + 0.15
                    * vector_score
                )

            else:

                chunk_score = (
                    vector_score
                )

            chunk_score = min(
                max(
                    chunk_score,
                    0.0,
                ),
                1.0,
            )

            if case_id not in grouped:

                grouped[
                    case_id
                ] = {

                    "rank": 0,

                    "case": (
                        self._serialize_case(
                            case
                        )
                    ),

                    "similarity_score": round(
                        chunk_score,
                        6,
                    ),

                    "reranker_score": (
                        round(
                            float(
                                reranker_score
                            ),
                            6,
                        )
                        if reranker_score
                        is not None
                        else None
                    ),

                    "best_vector_distance": (
                        candidate[
                            "best_vector_distance"
                        ]
                    ),

                    "matching_chunks": 0,

                    "matched_chunks": [],
                }

            grouped_case = grouped[
                case_id
            ]

            grouped_case[
                "similarity_score"
            ] = max(
                grouped_case[
                    "similarity_score"
                ],
                round(
                    chunk_score,
                    6,
                ),
            )

            if reranker_score is not None:

                current_reranker = (
                    grouped_case.get(
                        "reranker_score"
                    )
                )

                if (
                    current_reranker is None
                    or reranker_score
                    > current_reranker
                ):

                    grouped_case[
                        "reranker_score"
                    ] = round(
                        float(
                            reranker_score
                        ),
                        6,
                    )

            grouped_case[
                "best_vector_distance"
            ] = min(
                grouped_case[
                    "best_vector_distance"
                ],
                candidate[
                    "best_vector_distance"
                ],
            )

            grouped_case[
                "matching_chunks"
            ] += 1

            grouped_case[
                "matched_chunks"
            ].append(
                {
                    "document_id": (
                        candidate[
                            "document_id"
                        ]
                    ),

                    "chunk_number": (
                        candidate[
                            "chunk_number"
                        ]
                    ),

                    "text": (
                        candidate[
                            "text"
                        ]
                    ),

                    "original_distance": (
                        candidate.get(
                            "original_distance"
                        )
                    ),

                    "expanded_distance": (
                        candidate.get(
                            "expanded_distance"
                        )
                    ),

                    "best_vector_distance": (
                        candidate[
                            "best_vector_distance"
                        ]
                    ),

                    "vector_similarity_score": (
                        vector_score
                    ),

                    "reranker_score": (
                        reranker_score
                    ),

                    "reranker_applied": (
                        candidate.get(
                            "reranker_applied",
                            False,
                        )
                    ),

                    "retrieval_sources": (
                        candidate[
                            "retrieval_sources"
                        ]
                    ),

                    "_chunk_score": (
                        chunk_score
                    ),
                }
            )

        # =================================================
        # Keep strongest chunks per case
        # =================================================

        for result in grouped.values():

            result[
                "matched_chunks"
            ].sort(
                key=lambda chunk: (
                    chunk[
                        "_chunk_score"
                    ]
                ),
                reverse=True,
            )

            result[
                "matched_chunks"
            ] = result[
                "matched_chunks"
            ][
                :self.MAX_CHUNKS_PER_CASE
            ]

            for chunk in result[
                "matched_chunks"
            ]:

                chunk.pop(
                    "_chunk_score",
                    None,
                )

        return grouped

    # =====================================================
    # EMPTY SEMANTIC RESPONSE
    # =====================================================

    def _empty_response(
        self,
        query_data: dict[str, Any],
        filters: SearchFilters,
        candidate_limit: int,
        original_count: int,
        expanded_count: int,
    ) -> dict[str, Any]:

        return {
            "original_query": (
                query_data[
                    "original_query"
                ]
            ),

            "normalized_query": (
                query_data[
                    "normalized_query"
                ]
            ),

            "expanded_query": (
                query_data[
                    "expanded_query"
                ]
            ),

            "primary_intent": (
                query_data.get(
                    "primary_intent"
                )
            ),

            "matched_intents": (
                query_data.get(
                    "matched_intents",
                    [],
                )
            ),

            "primary_issue": (
                query_data.get(
                    "primary_issue"
                )
            ),

            "matched_issues": (
                query_data.get(
                    "matched_issues",
                    [],
                )
            ),

            "matched_concepts": (
                query_data.get(
                    "matched_concepts",
                    [],
                )
            ),

            "matched_scenarios": (
                query_data.get(
                    "matched_scenarios",
                    [],
                )
            ),

            "applied_filters": (
                filters.model_dump()
            ),

            "retrieval": {
                "retrieval_mode": (
                    "semantic"
                ),

                "candidate_limit_per_query": (
                    candidate_limit
                ),

                "original_query_candidates": (
                    original_count
                ),

                "expanded_query_candidates": (
                    expanded_count
                ),

                "merged_candidates": 0,

                "filtered_candidates": 0,

                "reranked_candidates": 0,

                "dual_retrieval_used": (
                    query_data[
                        "expansion_is_different"
                    ]
                ),

                "reranker_enabled": (
                    LegalReranker.ENABLED
                ),

                "reranker_model": (
                    LegalReranker.MODEL_NAME
                    if LegalReranker.ENABLED
                    else None
                ),
            },

            "total_candidates": 0,

            "total_results": 0,

            "results": [],
        }

    # =====================================================
    # EMPTY EXACT CASE RESPONSE
    # =====================================================

    def _empty_exact_case_response(
        self,
        case_number: str,
        original_query: str,
        filters: SearchFilters,
    ) -> dict[str, Any]:

        return {
            "original_query": original_query,

            "normalized_query": (
                self._normalize_text(
                    original_query
                )
            ),

            "expanded_query": original_query,

            "primary_intent": (
                "CASE_NUMBER_LOOKUP"
            ),

            "matched_intents": [
                "CASE_NUMBER_LOOKUP"
            ],

            "primary_issue": None,

            "matched_issues": [],

            "matched_concepts": [],

            "matched_scenarios": [],

            "applied_filters": (
                self._serialize_exact_filters(
                    filters=filters,
                    case_number=case_number,
                )
            ),

            "retrieval": {
                "retrieval_mode": (
                    "exact_case_number"
                ),

                "candidate_limit_per_query": 0,

                "original_query_candidates": 0,

                "expanded_query_candidates": 0,

                "merged_candidates": 0,

                "filtered_candidates": 0,

                "reranked_candidates": 0,

                "dual_retrieval_used": False,

                "reranker_enabled": False,

                "reranker_model": None,
            },

            "total_candidates": 0,

            "total_results": 0,

            "results": [],
        }

    # =====================================================
    # EXTRACT CASE NUMBER FROM QUERY
    # =====================================================

    @classmethod
    def _extract_case_number_from_query(
        cls,
        query: str,
    ) -> str | None:

        normalized_query = (
            cls._normalize_text(
                query
            )
        )

        if not normalized_query:
            return None

        patterns: list[
            tuple[
                str,
                str,
            ]
        ] = [

            (
                (
                    r"^\s*g\s*\.?\s*r\s*\.?"
                    r"\s*(?:no\s*\.?)?\s*"
                    r"([0-9][0-9a-z\-]*)\s*$"
                ),
                "G.R. No.",
            ),

            (
                (
                    r"^\s*a\s*\.?\s*c\s*\.?"
                    r"\s*(?:no\s*\.?)?\s*"
                    r"([0-9][0-9a-z\-]*)\s*$"
                ),
                "A.C. No.",
            ),

            (
                (
                    r"^\s*a\s*\.?\s*m\s*\.?"
                    r"\s*(?:no\s*\.?)?\s*"
                    r"([0-9][0-9a-z\-]*)\s*$"
                ),
                "A.M. No.",
            ),

            (
                (
                    r"^\s*b\s*\.?\s*m\s*\.?"
                    r"\s*(?:no\s*\.?)?\s*"
                    r"([0-9][0-9a-z\-]*)\s*$"
                ),
                "B.M. No.",
            ),

            (
                (
                    r"^\s*udk\s*[-\s]*"
                    r"([0-9][0-9a-z\-]*)\s*$"
                ),
                "UDK",
            ),
        ]

        for pattern, prefix in patterns:

            match = re.fullmatch(
                pattern,
                normalized_query,
                flags=re.IGNORECASE,
            )

            if match is None:
                continue

            number = str(
                match.group(1) or ""
            ).strip()

            if not number:
                continue

            if prefix == "UDK":

                return (
                    f"UDK-{number}"
                )

            return (
                f"{prefix} {number}"
            )

        return None

    # =====================================================
    # OPTIONAL CASE FILTER CHECK
    # =====================================================

    @staticmethod
    def _case_matches_optional_filters(
        case: Case,
        filters: SearchFilters,
    ) -> bool:

        if filters.year is not None:

            case_year = getattr(
                case,
                "year",
                None,
            )

            if (
                case_year is None
                and case.decision_date
                is not None
            ):

                case_year = (
                    case
                    .decision_date
                    .year
                )

            if (
                case_year is None
                or int(case_year)
                != int(filters.year)
            ):

                return False

        normalized_filter_division = (
            SearchService
            ._normalize_text(
                filters.division
            )
            .casefold()
        )

        if normalized_filter_division:

            normalized_case_division = (
                SearchService
                ._normalize_text(
                    case.division
                )
                .casefold()
            )

            if (
                normalized_case_division
                != normalized_filter_division
            ):

                return False

        return True

    # =====================================================
    # SERIALIZE EXACT FILTERS
    # =====================================================

    @staticmethod
    def _serialize_exact_filters(
        filters: SearchFilters,
        case_number: str,
    ) -> dict[str, Any]:

        serialized_filters = (
            filters.model_dump()
        )

        serialized_filters[
            "case_number"
        ] = case_number

        return serialized_filters

    # =====================================================
    # HELPERS
    # =====================================================

    @staticmethod
    def _first_batch(
        results: dict[str, Any],
        key: str,
    ) -> list[Any]:

        value = results.get(
            key
        )

        if (
            not isinstance(
                value,
                list,
            )
            or not value
            or not isinstance(
                value[0],
                list,
            )
        ):

            return []

        return value[0]

    @staticmethod
    def _parse_integer(
        value: Any,
    ) -> int | None:

        try:

            parsed = int(
                value
            )

        except (
            TypeError,
            ValueError,
        ):

            return None

        return (
            parsed
            if parsed > 0
            else None
        )

    @staticmethod
    def _normalize_text(
        value: Any,
    ) -> str:

        return " ".join(
            str(
                value or ""
            )
            .strip()
            .split()
        )

    @staticmethod
    def _normalize_case_number(
        value: Any,
    ) -> str:

        return re.sub(
            r"[^a-z0-9]",
            "",
            str(
                value or ""
            )
            .strip()
            .casefold(),
        )

    @staticmethod
    def _distance_to_similarity(
        distance: float,
    ) -> float:

        return round(
            min(
                max(
                    1.0
                    - float(
                        distance
                    ),
                    0.0,
                ),
                1.0,
            ),
            6,
        )

    # =====================================================
    # SERIALIZE CASE
    # =====================================================

    @staticmethod
    def _serialize_case(
        case: Case,
    ) -> dict[str, Any]:

        case_type = getattr(
            case,
            "case_type",
            None,
        )

        if hasattr(
            case_type,
            "value",
        ):

            case_type = (
                case_type.value
            )

        return {
            "id": case.id,

            "title": (
                case.title
                or "Untitled Case"
            ),

            "case_type": (
                str(case_type)
                if case_type
                is not None
                else None
            ),

            "case_number": (
                case.case_number
            ),

            "division": (
                case.division
            ),

            "decision_date": (
                case
                .decision_date
                .isoformat()
                if case.decision_date
                else None
            ),

            "ponencia": (
                case.ponencia
            ),

            "pdf_path": (
                case.pdf_path
            ),
        }