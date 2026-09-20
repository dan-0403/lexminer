from datetime import datetime

from pydantic import BaseModel


class TokenData(BaseModel):

    user_id: int

    email: str

    role: str


class TokenResponse(BaseModel):

    access_token: str

    refresh_token: str

    token_type: str = "Bearer"

    expires_at: datetime