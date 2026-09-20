from pydantic import BaseModel
from pydantic import EmailStr
from pydantic import Field
from typing import Optional


class ProfileUpdateRequest(BaseModel):

    first_name: str = Field(..., max_length=100)

    last_name: str = Field(..., max_length=100)

    profile_picture: Optional[str] = None


class ProfileResponse(BaseModel):

    id: int

    first_name: str

    last_name: str

    email: EmailStr

    profile_picture: Optional[str]

    role: str