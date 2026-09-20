from sqlalchemy.orm import Session

from app.models.user import User
from app.enums import Role, AuthProvider
from app.repositories.user_repository import UserRepository
from app.core.password import hash_password
from app.core.config import settings


class AdminSeeder:

    @staticmethod
    def create_admin(db: Session):

        repository = UserRepository(db)

        admin = repository.get_by_email(settings.ADMIN_EMAIL)

        if admin:
            print("✓ Admin account already exists.")
            return

        admin = User(

            first_name=settings.ADMIN_FIRST_NAME,

            last_name=settings.ADMIN_LAST_NAME,

            email=settings.ADMIN_EMAIL,

            password_hash=hash_password(settings.ADMIN_PASSWORD),

            auth_provider=AuthProvider.LOCAL,

            role=Role.ADMIN,

            is_active=True,

            google_id=None,

            profile_picture=None,

        )

        repository.create(admin)

        print("✓ Default administrator created.")