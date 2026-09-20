from datetime import datetime

from sqlalchemy import (
    Column,
    Enum,
    Integer,
    String,
    Date,
    DateTime,
    Text,
    ForeignKey,
)

from sqlalchemy.orm import relationship

from app.core.database import Base
from app.enums.case_type import CaseType



class Case(Base):

    __tablename__ = "cases"


    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    title = Column(
        Text,
        nullable=False,
    )


    case_number = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )


    year = Column(
        Integer,
        nullable=True
    )


    month = Column(
        Integer,
        nullable=True
    )


    decision_date = Column(
        Date,
        nullable=True
    )


    division = Column(
        String(100),
        nullable=True
    )


    ponencia = Column(
        String(255),
        nullable=True
    )


    pdf_path = Column(
        String(500),
        nullable=False
    )


    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


    chunks = relationship(
        "CaseChunk",
        back_populates="case",
        cascade="all, delete"
    )

    case_type = Column(
        Enum(CaseType),
        nullable=False,
        default=CaseType.OTHER,
    )

    bookmarks = relationship(
    "Bookmark",
    back_populates="case",
    cascade="all, delete-orphan",
    passive_deletes=True,
)

class CaseChunk(Base):

    __tablename__ = "case_chunks"


    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    case_id = Column(
        Integer,
        ForeignKey(
            "cases.id"
        ),
        nullable=False,
        index=True
    )


    chunk_number = Column(
        Integer,
        nullable=False
    )


    chunk_text = Column(
        Text,
        nullable=False
    )


    chroma_document_id = Column(
        String(255),
        unique=True,
        nullable=False
    )


    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


    case = relationship(
        "Case",
        back_populates="chunks"
    )

