import re

from datetime import date
from datetime import datetime
from datetime import timezone
from collections.abc import Callable
from typing import Any

from app.ai.chunker import TextChunker
from app.ai.cleaner import TextCleaner
from app.ai.embedder import EmbeddingGenerator
from app.ai.extractor import PDFExtractor
from app.ai.importer import DatasetImporter
from app.ai.metadata_extractor import MetadataExtractor
from app.ai.vector_store import VectorStore

from app.enums import ImportStatus
from app.models.dataset_file import DatasetFile

from app.repositories.case_chunk_repository import (
    CaseChunkRepository,
)
from app.repositories.case_repository import (
    CaseRepository,
)
from app.repositories.dataset_repository import (
    DatasetRepository,
)


class DatasetService:

    # =====================================================
    # CASE NUMBER PATTERN
    # =====================================================

    CASE_NUMBER_PATTERN = re.compile(
        r"""
        \b
        (
            (?:
                G\.?\s*R\.?\s*Nos?\.?
                |
                A\.?\s*M\.?\s*Nos?\.?
                |
                A\.?\s*C\.?\s*Nos?\.?
                |
                B\.?\s*M\.?\s*Nos?\.?
                |
                U\.?\s*D\.?\s*K\.?\s*Nos?\.?
                |
                I\.?\s*S\.?\s*Nos?\.?
            )
            \s*
            [A-Za-z0-9]+
            (?:
                [\s,\-–—/&]+
                [A-Za-z0-9]+
            )*
        )
        """,
        re.IGNORECASE | re.VERBOSE,
    )

    MONTH_PATTERN = re.compile(
        r"\b("
        r"January|February|March|April|May|June|"
        r"July|August|September|October|November|December"
        r")\b",
        re.IGNORECASE,
    )

    # =====================================================
    # INITIALIZATION
    # =====================================================

    def __init__(
        self,
        db,
    ) -> None:

        self.db = db

        self.repository = DatasetRepository(
            db
        )

        self.case_repository = CaseRepository(
            db
        )

        self.case_chunk_repository = (
            CaseChunkRepository(
                db
            )
        )

        self.importer = DatasetImporter()

    # =====================================================
    # IMPORT DATASETS
    # =====================================================

    def import_datasets(
        self,
    ) -> dict[str, Any]:

        pdf_files = self.importer.scan()

        total_files = len(
            pdf_files
        )

        new_files = 0
        duplicates = 0
        failed_files = 0
        errors: list[dict[str, str]] = []

        for pdf in pdf_files:

            try:
                existing = (
                    self.repository
                    .get_by_file_path(
                        pdf["file_path"]
                    )
                )

                if existing is not None:
                    duplicates += 1
                    continue

                dataset = DatasetFile(
                    filename=pdf["filename"],
                    file_path=pdf["file_path"],
                    year=pdf["year"],
                    month=pdf["month"],
                    file_size=pdf["file_size"],
                    import_status=(
                        ImportStatus.PENDING
                    ),
                    current_stage=(
                        "AWAITING_PROCESSING"
                    ),
                    error_message=None,
                    chunk_count=0,
                    processing_attempts=0,
                    is_indexed=False,
                    indexed_at=None,
                    last_processed_at=None,
                )

                self.repository.create(
                    dataset
                )

                new_files += 1

            except Exception as error:
                self.db.rollback()

                failed_files += 1

                errors.append(
                    {
                        "filename": str(
                            pdf.get(
                                "filename",
                                "Unknown",
                            )
                        ),
                        "error": str(error),
                    }
                )

        return {
            "success": (
                failed_files == 0
            ),
            "message": (
                "Dataset registration completed."
            ),
            "total_files": total_files,
            "new_files": new_files,
            "duplicates": duplicates,
            "failed_files": failed_files,
            "errors": errors,
        }

    # =====================================================
    # PROCESS PENDING DOCUMENTS
    # =====================================================

    def process_pending_documents(
        self,
        progress_callback: (
            Callable[
                [
                    int,
                    int,
                    DatasetFile,
                    str,
                    dict[str, Any] | None,
                ],
                None,
            ]
            | None
        ) = None,
    ) -> list[dict[str, Any]]:

        pending_files = (
            self.repository
            .get_pending_files()
        )

        total_files = len(
            pending_files
        )

        processed_documents: list[
            dict[str, Any]
        ] = []

        for index, dataset in enumerate(
            pending_files,
            start=1,
        ):

            if progress_callback is not None:
                progress_callback(
                    index - 1,
                    total_files,
                    dataset,
                    "STARTING",
                    None,
                )

            def stage_callback(
                current_dataset: DatasetFile,
                stage: str,
            ) -> None:

                if progress_callback is None:
                    return

                progress_callback(
                    index - 1,
                    total_files,
                    current_dataset,
                    stage,
                    None,
                )

            result = self.process_dataset(
                dataset,
                stage_callback=stage_callback,
            )

            processed_documents.append(
                result
            )

            if progress_callback is not None:
                progress_callback(
                    index,
                    total_files,
                    dataset,
                    str(
                        result.get(
                            "failed_stage"
                        )
                        or result.get(
                            "status"
                        )
                        or "PROCESSING"
                    ),
                    result,
                )

        return processed_documents

    # =====================================================
    # PROCESS ONE DATASET
    # =====================================================

    def process_dataset(
        self,
        dataset: DatasetFile,
        stage_callback: (
            Callable[
                [DatasetFile, str],
                None,
            ]
            | None
        ) = None,
    ) -> dict[str, Any]:

        if dataset.is_indexed:

            return {
                "dataset_id": dataset.id,
                "filename": dataset.filename,
                "status": "Already Indexed",
                "message": (
                    "Dataset has already been indexed."
                ),
            }

        dataset_id = dataset.id
        filename = dataset.filename

        created_case = None
        vector_count = 0

        failed_stage = (
            dataset.current_stage
            or "AWAITING_PROCESSING"
        )

        try:

            # =================================================
            # PROCESSING ATTEMPT
            # =================================================

            dataset.processing_attempts = (
                dataset.processing_attempts
                or 0
            ) + 1

            dataset.last_processed_at = (
                datetime.now(
                    timezone.utc
                )
            )

            dataset.error_message = None
            dataset.is_indexed = False
            dataset.indexed_at = None

            self.repository.update(
                dataset
            )

            # =================================================
            # 1. EXTRACT PDF TEXT
            # =================================================

            failed_stage = "EXTRACTING"

            self._update_processing_stage(
                dataset=dataset,
                status=ImportStatus.EXTRACTING,
                stage=failed_stage,
            )

            self._notify_stage(
                stage_callback,
                dataset,
                failed_stage,
            )

            text = PDFExtractor.extract_text(
                dataset.file_path
            )

            if not text or not text.strip():

                raise ValueError(
                    "PDF text extraction returned "
                    "an empty result."
                )

            # =================================================
            # 2. CLEAN TEXT
            # =================================================

            failed_stage = "CLEANING"

            self._update_processing_stage(
                dataset=dataset,
                status=ImportStatus.CLEANING,
                stage=failed_stage,
            )

            self._notify_stage(
                stage_callback,
                dataset,
                failed_stage,
            )

            clean_text = TextCleaner.clean(
                text
            )

            if (
                not clean_text
                or not clean_text.strip()
            ):

                raise ValueError(
                    "Text cleaning returned "
                    "an empty result."
                )

            # =================================================
            # 3. EXTRACT METADATA
            # =================================================

            failed_stage = "METADATA_EXTRACTION"

            self._update_current_stage(
                dataset=dataset,
                stage=failed_stage,
            )

            self._notify_stage(
                stage_callback,
                dataset,
                failed_stage,
            )

            metadata = MetadataExtractor.extract(
                clean_text
            )

            if not metadata:

                raise ValueError(
                    "Metadata extraction returned "
                    "an empty result."
                )

            metadata = dict(metadata)

            # =================================================
            # NORMALIZE METADATA
            # =================================================

            title = self._resolve_title(
                metadata=metadata,
                dataset=dataset,
            )

            case_number = (
                self._resolve_case_number(
                    metadata=metadata,
                    clean_text=clean_text,
                )
            )

            decision_date = (
                self._resolve_decision_date(
                    metadata.get(
                        "decision_date"
                    )
                )
            )

            case_year = (
                self._resolve_case_year(
                    metadata=metadata,
                    decision_date=decision_date,
                    dataset=dataset,
                )
            )

            case_month = (
                self._resolve_case_month(
                    metadata=metadata,
                    decision_date=decision_date,
                    dataset=dataset,
                )
            )

            division = metadata.get(
                "division"
            )

            ponencia = metadata.get(
                "ponencia"
            )

            case_type = metadata.get(
                "case_type"
            )

            if not case_number:

                raise ValueError(
                    "Unable to extract a valid case "
                    f"number from '{dataset.filename}'."
                )

            # =================================================
            # 4. FIND OR CREATE CASE
            # =================================================

            failed_stage = "CASE_REGISTRATION"

            self._update_current_stage(
                dataset=dataset,
                stage=failed_stage,
            )

            self._notify_stage(
                stage_callback,
                dataset,
                failed_stage,
            )

            existing_case = (
                self.case_repository
                .get_by_case_number(
                    case_number
                )
            )

            if existing_case is None:

                existing_case = (
                    self.case_repository
                    .get_by_pdf_path(
                        dataset.file_path
                    )
                )

            if existing_case is not None:

                existing_chunks = (
                    self.case_chunk_repository
                    .get_by_case_id(
                        existing_case.id
                    )
                )

                existing_vectors = (
                    VectorStore.count_by_case_id(
                        existing_case.id
                    )
                )

                if (
                    existing_chunks
                    and existing_vectors
                ):

                    now = datetime.now(
                        timezone.utc
                    )

                    dataset.is_indexed = True
                    dataset.indexed_at = now
                    dataset.last_processed_at = now

                    dataset.import_status = (
                        ImportStatus.COMPLETED
                    )

                    dataset.current_stage = (
                        "COMPLETED"
                    )

                    dataset.error_message = None

                    dataset.chunk_count = len(
                        existing_chunks
                    )

                    self.repository.update(
                        dataset
                    )

                    self._notify_stage(
                        stage_callback,
                        dataset,
                        "COMPLETED",
                    )

                    return {
                        "dataset_id": dataset.id,
                        "case_id": existing_case.id,
                        "filename": dataset.filename,
                        "chunks": len(
                            existing_chunks
                        ),
                        "vectors": (
                            existing_vectors
                        ),
                        "status": (
                            "Already Indexed"
                        ),
                    }

                created_case = existing_case

            else:

                # IMPORTANT:
                # CaseRepository.create() must accept
                # year and month parameters.

                # If your repository does not yet accept
                # these arguments, update it after replacing
                # this service.

                created_case = (
                    self.case_repository.create(
                        title=title,
                        case_type=case_type,
                        case_number=case_number,
                        year=case_year,
                        month=case_month,
                        division=division,
                        decision_date=decision_date,
                        ponencia=ponencia,
                        pdf_path=dataset.file_path,
                    )
                )

            if created_case is None:

                raise ValueError(
                    "The case record could not "
                    "be created or retrieved."
                )

            # =================================================
            # 5. CHUNK TEXT
            # =================================================

            failed_stage = "CHUNKING"

            self._update_processing_stage(
                dataset=dataset,
                status=ImportStatus.CHUNKING,
                stage=failed_stage,
            )

            self._notify_stage(
                stage_callback,
                dataset,
                failed_stage,
            )

            chunks = TextChunker.chunk(
                clean_text
            )

            if not chunks:

                raise ValueError(
                    "No chunks were generated."
                )

            dataset.chunk_count = len(
                chunks
            )

            self.repository.update(
                dataset
            )

            # =================================================
            # 6. EMBEDDING AND INDEXING
            # =================================================

            failed_stage = "INDEXING"

            self._update_processing_stage(
                dataset=dataset,
                status=ImportStatus.INDEXING,
                stage=failed_stage,
            )

            self._notify_stage(
                stage_callback,
                dataset,
                failed_stage,
            )

            chroma_documents: list[
                dict[str, Any]
            ] = []

            chunk_records: list[
                dict[str, Any]
            ] = []

            for chunk in chunks:

                chunk_index = int(
                    chunk["chunk_index"]
                )

                chunk_text = str(
                    chunk["text"]
                ).strip()

                if not chunk_text:
                    continue

                chroma_id = (
                    f"case_{created_case.id}_"
                    f"chunk_{chunk_index}"
                )

                embedding = (
                    EmbeddingGenerator.generate(
                        chunk_text
                    )
                )

                if embedding is None:

                    raise ValueError(
                        "Embedding generation returned "
                        f"no result for chunk "
                        f"{chunk_index}."
                    )

                case_type_value = (
                    self._enum_value(
                        created_case.case_type
                    )
                )

                metadata_values: dict[
                    str,
                    Any,
                ] = {
                    "case_id": str(
                        created_case.id
                    ),
                    "dataset_id": str(
                        dataset.id
                    ),
                    "filename": (
                        dataset.filename
                        or ""
                    ),
                    "chunk_number": (
                        chunk_index
                    ),
                }

                optional_metadata = {
                    "case_number": (
                        created_case.case_number
                    ),
                    "case_type": (
                        case_type_value
                    ),
                    "title": (
                        created_case.title
                    ),
                    "division": (
                        created_case.division
                    ),
                    "decision_date": (
                        created_case
                        .decision_date
                        .isoformat()
                        if created_case
                        .decision_date
                        else None
                    ),
                    "year": (
                        getattr(
                            created_case,
                            "year",
                            case_year,
                        )
                    ),
                    "month": (
                        getattr(
                            created_case,
                            "month",
                            case_month,
                        )
                    ),
                }

                for key, value in (
                    optional_metadata.items()
                ):

                    if value is not None:
                        metadata_values[key] = (
                            value
                        )

                chroma_documents.append(
                    {
                        "id": chroma_id,
                        "text": chunk_text,
                        "embedding": embedding,
                        "metadata": (
                            metadata_values
                        ),
                    }
                )

                chunk_records.append(
                    {
                        "chunk_number": (
                            chunk_index
                        ),
                        "chunk_text": (
                            chunk_text
                        ),
                        "chroma_document_id": (
                            chroma_id
                        ),
                    }
                )

            if not chroma_documents:

                raise ValueError(
                    "No valid chunks were available "
                    "for vector indexing."
                )

            # =================================================
            # 7. STORE VECTORS
            # =================================================

            failed_stage = "VECTOR_STORAGE"

            self._update_current_stage(
                dataset=dataset,
                stage=failed_stage,
            )

            self._notify_stage(
                stage_callback,
                dataset,
                failed_stage,
            )

            vector_count = (
                VectorStore.add_documents(
                    chroma_documents
                )
            )

            if vector_count is None:

                vector_count = len(
                    chroma_documents
                )

            if vector_count != len(
                chroma_documents
            ):

                raise ValueError(
                    "Not all generated chunks were "
                    "stored in ChromaDB. "
                    f"Expected "
                    f"{len(chroma_documents)}, "
                    f"stored {vector_count}."
                )

            # =================================================
            # 8. STORE CHUNK RECORDS
            # =================================================

            failed_stage = "CHUNK_STORAGE"

            self._update_current_stage(
                dataset=dataset,
                stage=failed_stage,
            )

            self._notify_stage(
                stage_callback,
                dataset,
                failed_stage,
            )

            for chunk_record in chunk_records:

                self.case_chunk_repository.create(
                    case_id=created_case.id,
                    chunk_number=(
                        chunk_record[
                            "chunk_number"
                        ]
                    ),
                    chunk_text=(
                        chunk_record[
                            "chunk_text"
                        ]
                    ),
                    chroma_document_id=(
                        chunk_record[
                            "chroma_document_id"
                        ]
                    ),
                )

            # =================================================
            # 9. COMPLETE
            # =================================================

            now = datetime.now(
                timezone.utc
            )

            dataset.is_indexed = True
            dataset.indexed_at = now
            dataset.last_processed_at = now

            dataset.import_status = (
                ImportStatus.COMPLETED
            )

            dataset.current_stage = (
                "COMPLETED"
            )

            dataset.error_message = None

            dataset.chunk_count = len(
                chunk_records
            )

            self.repository.update(
                dataset
            )

            self._notify_stage(
                stage_callback,
                dataset,
                "COMPLETED",
            )

            return {
                "dataset_id": dataset.id,
                "case_id": created_case.id,
                "case_number": (
                    created_case.case_number
                ),
                "title": created_case.title,
                "filename": dataset.filename,
                "chunks": len(
                    chunk_records
                ),
                "vectors": vector_count,
                "status": "Completed",
            }

        except Exception as error:

            self._notify_stage(
                stage_callback,
                dataset,
                failed_stage,
            )

            return self._handle_processing_failure(
                dataset_id=dataset_id,
                filename=filename,
                failed_stage=failed_stage,
                error=error,
                created_case=created_case,
            )

    # =====================================================
    # HANDLE PROCESSING FAILURE
    # =====================================================

    def _handle_processing_failure(
        self,
        dataset_id,
        filename: str,
        failed_stage: str,
        error: Exception,
        created_case,
    ) -> dict[str, Any]:

        error_message = str(error)

        print(
            "[ERROR] Failed processing "
            f"'{filename}' during "
            f"'{failed_stage}': "
            f"{error_message}"
        )

        # PostgreSQL may have rejected an INSERT/UPDATE.
        # The session must be rolled back before any
        # additional query or update is attempted.
        self.db.rollback()

        # Cleanup any case, chunks, or vectors that were
        # successfully created before the failure.
        try:
            self._cleanup_failed_processing(
                case=created_case,
            )

        except Exception as cleanup_error:

            print(
                "[WARNING] Failed to clean "
                "partial processing data: "
                f"{cleanup_error}"
            )

            self.db.rollback()

        # Retrieve a fresh DatasetFile instance after
        # rollback. Do not reuse the stale ORM object.
        failed_dataset = (
            self.repository.get_by_id(
                dataset_id
            )
        )

        if failed_dataset is not None:

            try:
                failed_dataset.import_status = (
                    ImportStatus.FAILED
                )

                failed_dataset.current_stage = (
                    failed_stage
                )

                failed_dataset.error_message = (
                    error_message
                )

                failed_dataset.is_indexed = False
                failed_dataset.indexed_at = None
                failed_dataset.chunk_count = 0

                failed_dataset.last_processed_at = (
                    datetime.now(
                        timezone.utc
                    )
                )

                self.repository.update(
                    failed_dataset
                )

            except Exception as status_error:

                self.db.rollback()

                print(
                    "[ERROR] Failed to save "
                    "dataset failure status: "
                    f"{status_error}"
                )

        return {
            "dataset_id": dataset_id,
            "filename": filename,
            "status": "Failed",
            "failed_stage": failed_stage,
            "error": error_message,
        }

    # =====================================================
    # CLEAN FAILED PROCESSING
    # =====================================================

    def _cleanup_failed_processing(
        self,
        case,
    ) -> None:

        if case is None:
            return

        case_id = getattr(
            case,
            "id",
            None,
        )

        if case_id is None:
            return

        # =================================================
        # DELETE CHROMA VECTORS
        # =================================================

        try:
            VectorStore.delete_by_case_id(
                case_id
            )

        except Exception as error:

            print(
                "[WARNING] Failed to clean "
                "vectors: "
                f"{error}"
            )

        # =================================================
        # DELETE DATABASE CHUNKS
        # =================================================

        try:
            self.case_chunk_repository.delete_by_case(
                case_id
            )

        except Exception as error:

            self.db.rollback()

            print(
                "[WARNING] Failed to clean "
                "chunks: "
                f"{error}"
            )

        # =================================================
        # DELETE CASE
        # =================================================

        try:
            existing_case = (
                self.case_repository
                .get_by_id(
                    case_id
                )
            )

            if existing_case is not None:

                self.case_repository.delete(
                    existing_case
                )

        except Exception as error:

            self.db.rollback()

            print(
                "[WARNING] Failed to clean "
                "case: "
                f"{error}"
            )

    # =====================================================
    # NOTIFY PROGRESS CALLBACK
    # =====================================================

    @staticmethod
    def _notify_stage(
        callback: (
            Callable[
                [DatasetFile, str],
                None,
            ]
            | None
        ),
        dataset: DatasetFile,
        stage: str,
    ) -> None:

        if callback is None:
            return

        try:
            callback(
                dataset,
                stage,
            )

        except Exception as callback_error:
            print(
                "[WARNING] Progress callback failed: "
                f"{callback_error}"
            )

    # =====================================================
    # UPDATE ENUM PROCESSING STAGE
    # =====================================================

    def _update_processing_stage(
        self,
        dataset: DatasetFile,
        status: ImportStatus,
        stage: str | None = None,
    ) -> None:

        dataset.import_status = status

        dataset.current_stage = (
            stage
            or self._enum_value(
                status
            )
            or "PROCESSING"
        )

        dataset.last_processed_at = (
            datetime.now(
                timezone.utc
            )
        )

        self.repository.update(
            dataset
        )

    # =====================================================
    # UPDATE CUSTOM PROCESSING STAGE
    # =====================================================

    def _update_current_stage(
        self,
        dataset: DatasetFile,
        stage: str,
    ) -> None:

        dataset.current_stage = stage

        dataset.last_processed_at = (
            datetime.now(
                timezone.utc
            )
        )

        self.repository.update(
            dataset
        )

    # =====================================================
    # RESOLVE TITLE
    # =====================================================

    @classmethod
    def _resolve_title(
        cls,
        metadata: dict[str, Any],
        dataset: DatasetFile,
    ) -> str:
        """
        Resolve the complete case title.

        Priority:
        1. Extract the case caption from the PDF filename.
        2. Use metadata title if the filename does not contain
           a usable caption.
        3. Fall back to the filename itself.
        """

        filename = str(
            dataset.filename
            or ""
        ).strip()

        # -------------------------------------------------
        # 1. Extract title from filename
        # -------------------------------------------------

        filename_title = cls._extract_title_from_filename(
            filename
        )

        if filename_title:
            return filename_title

        # -------------------------------------------------
        # 2. Use metadata title as fallback
        # -------------------------------------------------

        metadata_title = str(
            metadata.get(
                "title"
            )
            or ""
        ).strip()

        metadata_title = (
            cls._clean_case_title(
                metadata_title
            )
        )

        if metadata_title:
            return metadata_title

        # -------------------------------------------------
        # 3. Final fallback
        # -------------------------------------------------

        fallback_title = filename

        if fallback_title.lower().endswith(
            ".pdf"
        ):
            fallback_title = fallback_title[:-4]

        fallback_title = (
            cls._clean_case_title(
                fallback_title
            )
        )

        if fallback_title:
            return fallback_title

        return "Untitled Case"

    # =====================================================
    # EXTRACT TITLE FROM FILENAME
    # =====================================================

    @classmethod
    def _extract_title_from_filename(
        cls,
        filename: str,
    ) -> str | None:
        """
        Extract the case caption from Supreme Court
        E-Library filenames.

        Example:

        G.R. No. 230628 - SMALL BUSINESS CORPORATION,
        PETITIONER, VS. COMMISSION ON AUDIT, RESPONDENT.
        D E C I S I O N - Supreme Court E-Library.pdf

        becomes:

        SMALL BUSINESS CORPORATION, PETITIONER,
        VS. COMMISSION ON AUDIT, RESPONDENT
        """

        if not filename:
            return None

        title = filename.strip()

        # Remove file extension
        if title.lower().endswith(".pdf"):
            title = title[:-4]

        # Remove Supreme Court E-Library suffix
        title = re.sub(
            r"\s*[-–—]\s*Supreme Court E-Library\s*$",
            "",
            title,
            flags=re.IGNORECASE,
        )

        # Remove spaced-letter decision/resolution suffixes
        title = re.sub(
            r"\s*D\s*E\s*C\s*I\s*S\s*I\s*O\s*N\s*$",
            "",
            title,
            flags=re.IGNORECASE,
        )

        title = re.sub(
            r"\s*R\s*E\s*S\s*O\s*L\s*U\s*T\s*I\s*O\s*N\s*$",
            "",
            title,
            flags=re.IGNORECASE,
        )

        # Remove ordinary decision/resolution suffixes
        title = re.sub(
            r"\s+(?:DECISION|RESOLUTION)\s*$",
            "",
            title,
            flags=re.IGNORECASE,
        )

        title = title.strip(
            " .,:;-–—"
        )

        # -------------------------------------------------
        # Extract text after the case number.
        #
        # Example:
        # G.R. No. 230628 - SMALL BUSINESS CORPORATION...
        #
        # -> SMALL BUSINESS CORPORATION...
        # -------------------------------------------------

        parts = re.split(
            r"\s+-\s+",
            title,
            maxsplit=1,
        )

        if len(parts) == 2:

            possible_title = parts[1].strip()

            possible_title = (
                cls._clean_case_title(
                    possible_title
                )
            )

            if cls._looks_like_case_title(
                possible_title
            ):
                return possible_title

        # -------------------------------------------------
        # Some files may not contain " - ".
        # Try another separator.
        # -------------------------------------------------

        parts = re.split(
            r"\s+[–—]\s+",
            title,
            maxsplit=1,
        )

        if len(parts) == 2:

            possible_title = (
                cls._clean_case_title(
                    parts[1]
                )
            )

            if cls._looks_like_case_title(
                possible_title
            ):
                return possible_title

        return None

    # =====================================================
    # CLEAN CASE TITLE
    # =====================================================

    @staticmethod
    def _clean_case_title(
        value: str,
    ) -> str:
        """
        Clean a case title without removing important
        party names, roles, or legal identifiers.
        """

        if not value:
            return ""

        title = str(value)

        # Normalize repeated whitespace
        title = re.sub(
            r"\s+",
            " ",
            title,
        ).strip()

        # Remove surrounding brackets
        title = title.strip(
            "[]()"
        ).strip()

        # Remove Supreme Court E-Library suffix
        title = re.sub(
            r"\s*[-–—]?\s*Supreme Court E-Library\s*$",
            "",
            title,
            flags=re.IGNORECASE,
        )

        # Remove spaced DECISION suffix
        title = re.sub(
            r"\s*D\s*E\s*C\s*I\s*S\s*I\s*O\s*N\s*$",
            "",
            title,
            flags=re.IGNORECASE,
        )

        # Remove spaced RESOLUTION suffix
        title = re.sub(
            r"\s*R\s*E\s*S\s*O\s*L\s*U\s*T\s*I\s*O\s*N\s*$",
            "",
            title,
            flags=re.IGNORECASE,
        )

        # Remove regular suffixes
        title = re.sub(
            r"\s+(?:DECISION|RESOLUTION)\s*$",
            "",
            title,
            flags=re.IGNORECASE,
        )

        # Normalize multiple punctuation/spaces
        title = re.sub(
            r"\s+,",
            ",",
            title,
        )

        title = re.sub(
            r",\s*",
            ", ",
            title,
        )

        title = re.sub(
            r"\s+",
            " ",
            title,
        )

        return title.strip(
            " .,:;-–—"
        )

    # =====================================================
    # CHECK WHETHER TEXT LOOKS LIKE A CASE TITLE
    # =====================================================

    @staticmethod
    def _looks_like_case_title(
        value: str,
    ) -> bool:
        """
        Prevent obviously malformed metadata from being
        accepted as the case title.
        """

        if not value:
            return False

        normalized = value.strip()

        if len(normalized) < 5:
            return False

        upper_value = normalized.upper()

        # Reject obvious decision/resolution remnants
        if re.search(
            r"D\s*E\s*C\s*I\s*S\s*I\s*O\s*N",
            upper_value,
        ):
            return False

        if re.search(
            r"R\s*E\s*S\s*O\s*L\s*U\s*T\s*I\s*O\s*N",
            upper_value,
        ):
            return False

        # A real caption usually contains party information
        # or a VS/V./versus separator.
        has_separator = bool(
            re.search(
                r"\b(?:VS?\.?|VERSUS)\b",
                normalized,
                flags=re.IGNORECASE,
            )
        )

        has_party_role = bool(
            re.search(
                r"\b(?:PETITIONER|RESPONDENT|COMPLAINANT|ACCUSED|APPELLANT|APPELLEE)\b",
                upper_value,
            )
        )

        return (
            has_separator
            or has_party_role
            or len(normalized) >= 20
        )

    # =====================================================
    # RESOLVE CASE NUMBER
    # =====================================================

    def _resolve_case_number(
        self,
        metadata: dict[str, Any],
        clean_text: str,
    ) -> str | None:

        metadata_case_number = str(
            metadata.get(
                "case_number"
            )
            or ""
        ).strip()

        if metadata_case_number:

            normalized = (
                self._clean_case_number(
                    metadata_case_number
                )
            )

            if normalized:
                return normalized

        title = str(
            metadata.get(
                "title"
            )
            or ""
        )

        case_number = (
            self._extract_case_number(
                title
            )
        )

        if case_number:
            return case_number

        # Most Supreme Court captions and identifiers
        # appear near the beginning of the decision.
        return self._extract_case_number(
            clean_text[:5000]
        )

    # =====================================================
    # EXTRACT CASE NUMBER
    # =====================================================

    def _extract_case_number(
        self,
        value: str,
    ) -> str | None:

        if not value:
            return None

        match = (
            self.CASE_NUMBER_PATTERN
            .search(value)
        )

        if not match:
            return None

        return self._clean_case_number(
            match.group(1)
        )

    # =====================================================
    # CLEAN CASE NUMBER
    # =====================================================

    def _clean_case_number(
        self,
        value: str,
    ) -> str | None:

        normalized = re.sub(
            r"\s+",
            " ",
            str(value),
        ).strip()

        # Remove a trailing date if the regular expression
        # captured text beyond the case number.
        normalized = re.split(
            self.MONTH_PATTERN,
            normalized,
            maxsplit=1,
        )[0]

        normalized = normalized.strip(
            "[]() ,.;:"
        )

        return normalized or None

    # =====================================================
    # RESOLVE DECISION DATE
    # =====================================================

    @staticmethod
    def _resolve_decision_date(
        value,
    ) -> date | None:

        if value is None:
            return None

        if isinstance(
            value,
            datetime,
        ):
            return value.date()

        if isinstance(
            value,
            date,
        ):
            return value

        text_value = str(
            value
        ).strip()

        if not text_value:
            return None

        date_formats = (
            "%Y-%m-%d",
            "%B %d, %Y",
            "%b %d, %Y",
            "%m/%d/%Y",
        )

        for date_format in date_formats:

            try:
                return datetime.strptime(
                    text_value,
                    date_format,
                ).date()

            except ValueError:
                continue

        return None

    # =====================================================
    # RESOLVE CASE YEAR
    # =====================================================

    @staticmethod
    def _resolve_case_year(
        metadata: dict[str, Any],
        decision_date: date | None,
        dataset: DatasetFile,
    ) -> int:

        metadata_year = metadata.get(
            "year"
        )

        if metadata_year is not None:

            try:
                numeric_year = int(
                    metadata_year
                )

                if (
                    1900
                    <= numeric_year
                    <= 2100
                ):
                    return numeric_year

            except (
                TypeError,
                ValueError,
            ):
                pass

        if decision_date is not None:
            return decision_date.year

        return int(
            dataset.year
        )

    # =====================================================
    # RESOLVE CASE MONTH
    # =====================================================

    @staticmethod
    def _resolve_case_month(
        metadata: dict[str, Any],
        decision_date: date | None,
        dataset: DatasetFile,
    ) -> int | None:

        month_map = {
            "january": 1,
            "jan": 1,
            "february": 2,
            "feb": 2,
            "march": 3,
            "mar": 3,
            "april": 4,
            "apr": 4,
            "may": 5,
            "june": 6,
            "jun": 6,
            "july": 7,
            "jul": 7,
            "august": 8,
            "aug": 8,
            "september": 9,
            "sep": 9,
            "sept": 9,
            "october": 10,
            "oct": 10,
            "november": 11,
            "nov": 11,
            "december": 12,
            "dec": 12,
        }

        month = metadata.get("month")

        if month is not None:

            if isinstance(month, int):
                if 1 <= month <= 12:
                    return month

            month_text = str(
                month
            ).strip().lower()

            if month_text in month_map:
                return month_map[month_text]

            if month_text.isdigit():
                numeric_month = int(
                    month_text
                )

                if 1 <= numeric_month <= 12:
                    return numeric_month

        # Decision date is the most reliable fallback.
        if decision_date is not None:
            return decision_date.month

        # Dataset month fallback.
        if dataset.month is not None:

            dataset_month = str(
                dataset.month
            ).strip().lower()

            if dataset_month in month_map:
                return month_map[
                    dataset_month
                ]

            if dataset_month.isdigit():

                numeric_month = int(
                    dataset_month
                )

                if 1 <= numeric_month <= 12:
                    return numeric_month

        return None

    # =====================================================
    # ENUM VALUE
    # =====================================================

    @staticmethod
    def _enum_value(
        value,
    ) -> str | None:

        if value is None:
            return None

        if hasattr(
            value,
            "value",
        ):
            return str(
                value.value
            )

        return str(value)