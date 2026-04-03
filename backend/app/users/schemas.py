from pydantic import BaseModel, EmailStr
from app.models import UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole
    referral_code: str | None = None  # for agents


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str


class RefreshRequest(BaseModel):
    refresh_token: str
    