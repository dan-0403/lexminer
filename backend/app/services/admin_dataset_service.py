from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import settings
from app.enums.decision_month import DecisionMonth


class AdminDatasetService:

    PDF_EXTENSION = ".pdf"
    PDF_SIGNATURE = b"%PDF"

    def __init__(self) -> None:

        self.dataset_root = Path(
            settings.DATASET_PATH
        ).resolve()

        self.minimum_year = settings.DATASET_MIN_YEAR
        self.maximum_year = settings.DATASET_MAX_YEAR

        self.maximum_file_size = (
            settings.MAX_PDF_UPLOAD_SIZE_MB
            * 1024
            * 1024
        )

    async def upload_pdfs(
        self,
        year: int,
        month: DecisionMonth,
        files: list[UploadFile],
    ):
        """
        Save PDF files inside the selected year directory.

        Duplicate filenames are skipped and existing files
        are never overwritten.
        """

        self._validate_year(year)

        if not files:
            raise ValueError(
                "At least one PDF file must be uploaded."
            )

        dataset_directory = self._get_dataset_directory(
            year,
            month,
        )

        dataset_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        file_results: list[dict[str, Any]] = []

        uploaded_count = 0
        duplicate_count = 0
        failed_count = 0

        for uploaded_file in files:

            result = await self._process_single_file(
                uploaded_file=uploaded_file,
                dataset_directory=dataset_directory,
            )

            file_results.append(result)

            if result["status"] == "uploaded":
                uploaded_count += 1

            elif result["status"] == "duplicate":
                duplicate_count += 1

            else:
                failed_count += 1

        return {
            "message": "PDF upload process completed.",
            "year": year,
            "month": month.value,
            "directory": str(dataset_directory),
            "summary": {
                "received": len(files),
                "uploaded": uploaded_count,
                "duplicates": duplicate_count,
                "failed": failed_count,
            },
            "files": file_results,
        }

    async def _process_single_file(
        self,
        uploaded_file: UploadFile,
        dataset_directory: Path,
    ) -> dict[str, Any]:

        original_filename = uploaded_file.filename

        if not original_filename:
            await uploaded_file.close()

            return {
                "filename": None,
                "status": "failed",
                "message": "The uploaded file has no filename.",
            }

        # Removes directory components such as:
        # ../../dangerous-file.pdf
        safe_filename = Path(original_filename).name.strip()

        if not safe_filename:
            await uploaded_file.close()

            return {
                "filename": original_filename,
                "status": "failed",
                "message": "The uploaded filename is invalid.",
            }

        destination_path = dataset_directory / safe_filename

        # Duplicate filename validation occurs before writing.
        if destination_path.exists():
            await uploaded_file.close()

            return {
                "filename": safe_filename,
                "status": "duplicate",
                "message": (
                    "A PDF with this filename already exists "
                    "in the selected year folder. The existing "
                    "file was not overwritten."
                ),
            }

        extension_error = self._validate_extension(
            safe_filename
        )

        if extension_error:
            await uploaded_file.close()

            return {
                "filename": safe_filename,
                "status": "failed",
                "message": extension_error,
            }

        content_type_error = self._validate_content_type(
            uploaded_file.content_type
        )

        if content_type_error:
            await uploaded_file.close()

            return {
                "filename": safe_filename,
                "status": "failed",
                "message": content_type_error,
            }

        temporary_path = dataset_directory / (
            f".{safe_filename}.{uuid4().hex}.part"
        )

        try:
            file_size = await self._save_to_temporary_file(
                uploaded_file=uploaded_file,
                temporary_path=temporary_path,
            )

            pdf_error = self._validate_pdf_signature(
                temporary_path
            )

            if pdf_error:
                temporary_path.unlink(
                    missing_ok=True
                )

                return {
                    "filename": safe_filename,
                    "status": "failed",
                    "message": pdf_error,
                }

            # Recheck before finalizing to avoid overwriting
            # if another request created the same file.
            if destination_path.exists():

                temporary_path.unlink(
                    missing_ok=True
                )

                return {
                    "filename": safe_filename,
                    "status": "duplicate",
                    "message": (
                        "A PDF with this filename already exists "
                        "in the selected year folder. The existing "
                        "file was not overwritten."
                    ),
                }

            # Rename the completed temporary file to its final name.
            # Because duplicates were checked, no existing legal
            # document is intentionally replaced.
            temporary_path.rename(destination_path)

            return {
                "filename": safe_filename,
                "status": "uploaded",
                "message": "PDF uploaded successfully.",
                "size_bytes": file_size,
                "saved_path": str(destination_path),
            }

        except ValueError as error:

            temporary_path.unlink(
                missing_ok=True
            )

            return {
                "filename": safe_filename,
                "status": "failed",
                "message": str(error),
            }

        except OSError:

            temporary_path.unlink(
                missing_ok=True
            )

            return {
                "filename": safe_filename,
                "status": "failed",
                "message": (
                    "The server could not save the uploaded file."
                ),
            }

        except Exception:

            temporary_path.unlink(
                missing_ok=True
            )

            return {
                "filename": safe_filename,
                "status": "failed",
                "message": (
                    "An unexpected error occurred while "
                    "processing the file."
                ),
            }

        finally:
            await uploaded_file.close()

    async def _save_to_temporary_file(
        self,
        uploaded_file: UploadFile,
        temporary_path: Path,
    ) -> int:

        chunk_size = 1024 * 1024
        total_size = 0

        await uploaded_file.seek(0)

        with temporary_path.open("wb") as output_file:

            while True:

                chunk = await uploaded_file.read(
                    chunk_size
                )

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > self.maximum_file_size:

                    raise ValueError(
                        "The PDF exceeds the maximum allowed "
                        f"size of "
                        f"{settings.MAX_PDF_UPLOAD_SIZE_MB} MB."
                    )

                output_file.write(chunk)

        if total_size == 0:
            raise ValueError(
                "The uploaded PDF is empty."
            )

        return total_size

    def _validate_year(
        self,
        year: int,
    ) -> None:

        if year < self.minimum_year:
            raise ValueError(
                f"Year must not be earlier than "
                f"{self.minimum_year}."
            )

        if year > self.maximum_year:
            raise ValueError(
                f"Year must not be later than "
                f"{self.maximum_year}."
            )

    def _get_dataset_directory(
        self,
        year: int,
        month: DecisionMonth,
    ) -> Path:

        dataset_directory = (
            self.dataset_root
            / str(year)
            / month.value
        ).resolve()

        if self.dataset_root not in dataset_directory.parents:
            raise ValueError(
                "The selected dataset directory is invalid."
            )

        return dataset_directory

    def _validate_extension(
        self,
        filename: str,
    ) -> str | None:

        extension = Path(filename).suffix.lower()

        if extension != self.PDF_EXTENSION:
            return (
                "Only files with the .pdf extension "
                "are allowed."
            )

        return None

    def _validate_content_type(
        self,
        content_type: str | None,
    ) -> str | None:

        accepted_content_types = {
            "application/pdf",
            "application/octet-stream",
        }

        if (
            content_type
            and content_type.lower()
            not in accepted_content_types
        ):
            return (
                "The uploaded file does not have an "
                "accepted PDF content type."
            )

        return None

    def _validate_pdf_signature(
        self,
        file_path: Path,
    ) -> str | None:

        try:
            with file_path.open("rb") as file:
                signature = file.read(4)

        except OSError:
            return (
                "The uploaded file could not be validated."
            )

        if signature != self.PDF_SIGNATURE:
            return (
                "The uploaded file is not a valid PDF document."
            )

        return None