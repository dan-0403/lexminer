import fitz


class PDFExtractor:

    """
    Extracts text from PDF documents.
    """

    @staticmethod
    def extract_text(pdf_path: str) -> str:

        document = fitz.open(pdf_path)

        pages = []

        try:

            for page in document:

                pages.append(
                    page.get_text()
                )

        finally:

            document.close()

        return "\n".join(pages)