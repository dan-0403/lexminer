from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy.orm import Mapped, relationship
from sqlalchemy.orm import mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class VisitorLog(Base):
    __tablename__ = "visitor_logs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    session_id: Mapped[str] = mapped_column(
        String(255),
        index=True,
    )

    ip_address: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    browser: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    operating_system: Mapped[str |None] = mapped_column(
        String(150),
        nullable=True,
    )

    visited_page: Mapped[str] = mapped_column(
        String(255),
    )

    visited_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user_id = Column(
    Integer,
    ForeignKey("users.id"),
    nullable=True,
    )

    user = relationship(
        "User",
        back_populates="visitor_logs",
    )