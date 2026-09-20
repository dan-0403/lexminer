from sqlalchemy import Boolean, Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy.orm import Mapped, relationship
from sqlalchemy.orm import mapped_column
from sqlalchemy.sql import func

from app.core.database import Base
from app.enums import AuthProvider
from app.enums import Role


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    google_id: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
    )

    profile_picture: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    auth_provider: Mapped[AuthProvider] = mapped_column(
        Enum(AuthProvider),
        nullable=False,
        default=AuthProvider.LOCAL,
    )

    role: Mapped[Role] = mapped_column(
        Enum(Role),
        nullable=False,
        default=Role.REGISTERED,
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    is_verified = Column(
        Boolean,
        default=True,
        nullable=False
    )

    is_locked = Column(
        Boolean,
        default=False,
        nullable=False
    )


    locked_until = Column(
        DateTime,
        nullable=True
    )

    failed_login_attempts = Column(
        Integer,
        default=0,
        nullable=False
    )

    login_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    last_login_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_login_provider: Mapped[AuthProvider | None] = mapped_column(
        Enum(AuthProvider),
        nullable=True,
    )

    last_logout_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    deleted_at = Column(
        DateTime,
        nullable=True
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    visitor_logs = relationship(
        "VisitorLog",
        back_populates="user",
    )

    bookmarks = relationship(
    "Bookmark",
    back_populates="user",
    cascade="all, delete-orphan",
    passive_deletes=True,
)