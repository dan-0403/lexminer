from datetime import datetime
from datetime import timedelta
from datetime import timezone

from jose import JWTError
from jose import jwt

from app.core.config import settings


class JWTManager:

    @staticmethod
    def create_access_token(data: dict) -> str:

        payload = data.copy()

        expire = datetime.now(
            timezone.utc
        ) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

        payload.update(
            {
                "exp": expire,
                "type": "access",
            }
        )

        return jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

    @staticmethod
    def create_refresh_token(data: dict) -> str:

        payload = data.copy()

        expire = datetime.now(
            timezone.utc
        ) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

        payload.update(
            {
                "exp": expire,
                "type": "refresh",
            }
        )

        return jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

    @staticmethod
    def decode_token(token: str):

        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

    @staticmethod
    def verify_access_token(token: str):

        payload = JWTManager.decode_token(token)

        if payload["type"] != "access":
            raise JWTError(
                "Invalid access token."
            )

        return payload

    @staticmethod
    def verify_refresh_token(token: str):

        payload = JWTManager.decode_token(token)

        if payload["type"] != "refresh":
            raise JWTError(
                "Invalid refresh token."
            )

        return payload