from pathlib import Path


class PDFLoader:
    """Placeholder PDF loader."""

    def load(self, path: str) -> str:
        return Path(path).read_text(encoding="utf-8", errors="ignore")
