from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session
from fastapi import Request

from app.core.database import get_db
from app.core.jwt import JWTManager
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.enums import Role


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials.",
        headers={
            "WWW-Authenticate": "Bearer",
        },
    )

    try:

        payload = JWTManager.verify_access_token(
            token
        )

        #
        # JWT payload:
        # {
        #     "sub": "1",
        #     "email": "...",
        #     "role": "admin"
        # }
        #
        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        user_id = int(user_id)

    except (JWTError, ValueError, TypeError):
        raise credentials_exception

    repository = UserRepository(db)

    user = repository.get_by_id(user_id)

    if user is None:
        raise credentials_exception

    return user

def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User | None:
    authorization = request.headers.get(
        "Authorization"
    )

    if not authorization:
        return None

    scheme, _, token = authorization.partition(
        " "
    )

    if (
        scheme.lower() != "bearer"
        or not token.strip()
    ):
        return None

    try:
        payload = JWTManager.verify_access_token(
            token.strip()
        )

        user_id = payload.get("sub")

        if user_id is None:
            return None

        normalized_user_id = int(user_id)

    except (
        JWTError,
        ValueError,
        TypeError,
    ):
        return None

    repository = UserRepository(
        db
    )

    user = repository.get_by_id(
        normalized_user_id
    )

    if user is None:
        return None

    if not user.is_active:
        return None

    if user.deleted_at is not None:
        return None

    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive account.",
        )

    return current_user


def get_current_admin(
    current_user: User = Depends(
        get_current_active_user
    ),
) -> User:

    if current_user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required.",
        )

    return current_user


def require_role(*allowed_roles: Role):

    def checker(
        current_user: User = Depends(
            get_current_active_user
        ),
    ) -> User:

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )

        return current_user

    return checker

