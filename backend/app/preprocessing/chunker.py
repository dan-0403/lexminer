class Chunker:
    """Simple chunking utility for text documents."""

    def chunk(self, text: str, size: int = 500):
        if not text:
            return []
        return [text[i:i + size] for i in range(0, len(text), size)]
