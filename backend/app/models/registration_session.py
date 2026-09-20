import uuid

from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class RegistrationSession(Base):
    """
    Stores temporary email-verification sessions.

    A permanent User record is created only after:

    1. The email OTP is verified.
    2. The user's name is submitted.
    3. A valid password is submitted.
    """

    __tablename__ = "registration_sessions"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    email = Column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
    )

    otp_hash = Column(
        String(255),
        nullable=False,
    )

    otp_attempts = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    resend_count = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    email_verified = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    resend_available_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    verified_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    consumed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )