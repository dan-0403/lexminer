import re


class TextCleaner:
    """Simple text cleaning utilities."""

    def clean(self, text: str) -> str:
        text = re.sub(r"\s+", " ", text)
        return text.strip()
