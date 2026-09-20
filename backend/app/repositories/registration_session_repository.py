from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.registration_session import (
    RegistrationSession,
)


class RegistrationSessionRepository:

    def __init__(
        self,
        db: Session,
    ) -> None:

        self.db = db

    def get_by_id(
        self,
        registration_id: UUID,
    ) -> RegistrationSession | None:

        return (
            self.db.query(
                RegistrationSession
            )
            .filter(
                RegistrationSession.id
                == registration_id
            )
            .first()
        )

    def get_by_email(
        self,
        email: str,
    ) -> RegistrationSession | None:

        normalized_email = (
            email.strip().lower()
        )

        return (
            self.db.query(
                RegistrationSession
            )
            .filter(
                RegistrationSession.email
                == normalized_email
            )
            .first()
        )

    def create(
        self,
        registration: RegistrationSession,
    ) -> RegistrationSession:

        try:
            self.db.add(
                registration
            )

            self.db.commit()

            self.db.refresh(
                registration
            )

            return registration

        except Exception:
            self.db.rollback()
            raise

    def update(
        self,
        registration: RegistrationSession,
    ) -> RegistrationSession:

        try:
            self.db.add(
                registration
            )

            self.db.commit()

            self.db.refresh(
                registration
            )

            return registration

        except Exception:
            self.db.rollback()
            raise

    def delete(
        self,
        registration: RegistrationSession,
    ) -> None:

        try:
            self.db.delete(
                registration
            )

            self.db.commit()

        except Exception:
            self.db.rollback()
            raise

    def delete_expired(
        self,
        current_time: datetime,
    ) -> int:

        try:
            deleted_count = (
                self.db.query(
                    RegistrationSession
                )
                .filter(
                    RegistrationSession.expires_at
                    < current_time,
                    RegistrationSession.email_verified
                    .is_(False),
                )
                .delete(
                    synchronize_session=False
                )
            )

            self.db.commit()

            return int(
                deleted_count or 0
            )

        except Exception:
            self.db.rollback()
            raise