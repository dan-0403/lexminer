import chromadb

from app.core.config import settings

client = chromadb.PersistentClient(
    path=settings.CHROMA_DB_PATH
)