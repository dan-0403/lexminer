from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from app.enums import AuthProvider
from app.enums import Role


class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr


class UserResponse(UserBase):
    id: int
    role: Role
    auth_provider: AuthProvider
    profile_picture: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)