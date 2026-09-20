from functools import lru_cache
from pathlib import Path

from pydantic import computed_field
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


# backend/app/core/config.py
#
# config.py       -> core
# core            -> app
# app             -> backend
BACKEND_ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)


class Settings(BaseSettings):

    # ============================================
    # Project
    # ============================================

    PROJECT_NAME: str
    API_VERSION: str

    HOST: str
    PORT: int

    # ============================================
    # JWT
    # ============================================

    SECRET_KEY: str
    ALGORITHM: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int

    # ============================================
    # PostgreSQL
    # ============================================

    POSTGRES_SERVER: str
    POSTGRES_PORT: int
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str

    # ============================================
    # Google OAuth
    # ============================================

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # ============================================
    # Hard-coded Admin
    # ============================================

    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    ADMIN_FIRST_NAME: str
    ADMIN_LAST_NAME: str

    # ============================================
    # AI Embedding
    # ============================================

    LEGAL_EMBEDDING_MODEL: str = (
        "BAAI/bge-base-en-v1.5"
    )

    LEGAL_EMBEDDING_BATCH_SIZE: int = 16

    SUMMARY_MODEL: str = "llama3.2"

    # ============================================
    # ChromaDB
    # ============================================

    CHROMA_DB_PATH: str

    # ============================================
    # OpenAI
    # ============================================

    OPENAI_API_KEY: str

    OPENAI_MODEL: str = "gpt-5-nano"

    OPENAI_TIMEOUT_SECONDS: int = 30

    # ============================================
    # Email / OTP
    # ============================================

    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str

    MAIL_FROM_NAME: str = "LexMiner"

    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587

    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    MAIL_USE_CREDENTIALS: bool = True
    MAIL_VALIDATE_CERTS: bool = True

    FRONTEND_URL: str = (
        "http://localhost:5173"
    )

    # ============================================
    # Legal Reranker
    # ============================================

    LEGAL_RERANKER_ENABLED: bool = True

    LEGAL_RERANKER_MODEL: str = (
        "cross-encoder/"
        "ms-marco-MiniLM-L-6-v2"
    )

    LEGAL_RERANKER_BATCH_SIZE: int = 16

    LEGAL_RERANKER_MAX_LENGTH: int = 512

    # ============================================
    # Ollama
    # ============================================

    OLLAMA_BASE_URL: str = (
        "http://localhost:11434"
    )

    OLLAMA_MODEL: str = (
        "llama3.2:1b"
    )

    OLLAMA_TIMEOUT_SECONDS: int = 300

    # ============================================
    # Dataset
    # ============================================

    DATASET_PATH: str = (
        "../datasets/case_decisions"
    )

    DATASET_MIN_YEAR: int = 2016

    DATASET_MAX_YEAR: int = 2026

    MAX_PDF_UPLOAD_SIZE_MB: int = 25

    #============================================
    # Profile picture
    #============================================
    PROFILE_PICTURE_DIRECTORY: str = (
    "uploads/profile_pictures"
    )

    MAX_PROFILE_PICTURE_SIZE_MB: int = 5

    # ============================================
    # Computed Dataset Path
    # ============================================

    @computed_field
    @property
    def resolved_dataset_path(
        self,
    ) -> Path:
        """
        Resolve the configured dataset path relative
        to the backend directory.
        """

        configured_path = Path(
            self.DATASET_PATH
        ).expanduser()

        if configured_path.is_absolute():
            return configured_path.resolve()

        return (
            BACKEND_ROOT
            / configured_path
        ).resolve()

    # ============================================
    # Computed Database URL
    # ============================================

    @computed_field
    @property
    def DATABASE_URL(
        self,
    ) -> str:

        return (
            "postgresql://"
            f"{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_SERVER}:"
            f"{self.POSTGRES_PORT}/"
            f"{self.POSTGRES_DB}"
        )

    # ============================================
    # Computed Profile picutre URL
    # ============================================

    @computed_field
    @property
    def resolved_profile_picture_directory(
        self,
    ) -> Path:

        configured_path = Path(
            self.PROFILE_PICTURE_DIRECTORY
        ).expanduser()

        if configured_path.is_absolute():
            return configured_path.resolve()

        return (
            BACKEND_ROOT
            / configured_path
        ).resolve()

    # ============================================
    # Pydantic Settings Configuration
    # ============================================

    model_config = SettingsConfigDict(
        env_file=(
            BACKEND_ROOT
            / ".env"
        ),

        env_file_encoding=(
            "utf-8"
        ),

        case_sensitive=True,

        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:

    return Settings()


settings = get_settings()