from pathlib import Path


from app.core.config import settings


class DatasetImporter:

    """
    Scans the dataset directory and
    returns metadata for every PDF found.
    """

    def __init__(self):

        self.dataset_path = Path(
            settings.DATASET_PATH
        )

    # =====================================================
    # Scan Dataset
    # =====================================================

    def scan(self):

        pdf_files = []

        if not self.dataset_path.exists():

            raise FileNotFoundError(

                f"Dataset folder does not exist: {self.dataset_path}"

            )

        for pdf in self.dataset_path.rglob("*.pdf"):

            try:

                relative = pdf.relative_to(
                    self.dataset_path
                )

                parts = relative.parts

                year = int(parts[0])

                month = parts[1]

                pdf_files.append(

                    {

                        "filename": pdf.name,

                        "file_path": str(pdf.resolve()),

                        "year": year,

                        "month": month,

                        "file_size": pdf.stat().st_size,

                    }

                )

            except Exception:

                continue

        return pdf_files