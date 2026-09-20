import re


class TextCleaner:

    """
    Cleans extracted PDF text while preserving
    the legal meaning and structure.
    """

    @staticmethod
    def clean(text: str) -> str:

        if not text:
            return ""

        # ==========================================
        # Normalize line endings
        # ==========================================

        text = text.replace("\r\n", "\n")
        text = text.replace("\r", "\n")

        # ==========================================
        # Remove standalone page numbers
        # Example:
        # 1
        # 2
        # 15
        # ==========================================

        text = re.sub(
            r'^\s*\d+\s*$',
            '',
            text,
            flags=re.MULTILINE,
        )

        # ==========================================
        # Remove repeated Supreme Court header
        # ==========================================

        headers = [

            r'Republic of the Philippines',

            r'SUPREME COURT',

            r'Manila',

        ]

        for header in headers:

            text = re.sub(

                header,

                '',

                text,

                flags=re.IGNORECASE,

            )

        # ==========================================
        # Remove excessive spaces
        # ==========================================

        text = re.sub(

            r'[ \t]+',

            ' ',

            text,

        )

        # ==========================================
        # Remove excessive blank lines
        # ==========================================

        text = re.sub(

            r'\n{3,}',

            '\n\n',

            text,

        )

        # ==========================================
        # Trim whitespace
        # ==========================================

        return text.strip()