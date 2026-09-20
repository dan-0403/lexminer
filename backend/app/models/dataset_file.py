import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base
from app.enums import ImportStatus


class DatasetFile(Base):

    __tablename__ = "dataset_files"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    filename = Column(
        String(500),
        nullable=False,
    )

    file_path = Column(
        String,
        nullable=False,
        unique=True,
    )

    year = Column(
        Integer,
        nullable=False,
    )

    month = Column(
        String(20),
        nullable=False,
    )

    file_size = Column(
        BigInteger,
        nullable=False,
    )

    is_indexed = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    indexed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    import_status = Column(
        Enum(
            ImportStatus,
            name="import_status_enum",
        ),
        nullable=False,
        default=ImportStatus.PENDING,
        index=True,
    )

    current_stage = Column(
        String(50),
        nullable=True,
    )

    error_message = Column(
        Text,
        nullable=True,
    )

    chunk_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    processing_attempts = Column(
        Integer,
        nullable=False,
        default=0,
    )

    last_processed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    imported_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )