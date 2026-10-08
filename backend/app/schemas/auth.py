from datetime import date, datetime

from pydantic import EmailStr, Field

from app.schemas.common import Contract, Role


class RegisterRequest(Contract):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    role: Role = Field(description="admin cannot self-register")
    date_of_birth: date | None = Field(
        default=None, description="Required for students (minor consent check)"
    )
    preferred_language: str = Field(default="en", max_length=8)
    region_code: str | None = Field(
        default=None, max_length=20, description="City they live in (GET /places)"
    )
    pincode: str | None = Field(default=None, pattern=r"^\d{6}$")
    website: str | None = Field(
        default=None,
        max_length=200,
        description="Leave empty: a field hidden from people that only bots fill in",
    )


class LoginRequest(Contract):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(Contract):
    refresh_token: str | None = Field(
        default=None, max_length=200, description="Omit when the browser holds it in the prism_refresh cookie"
    )


class TokenPair(Contract):
    access_token: str
    refresh_token: str | None = Field(
        description="Empty when the client asked for cookie sessions (X-Session-Mode: cookie)"
    )
    token_type: str = "bearer"
    expires_in: int = Field(description="Access-token lifetime in seconds")


class UserOut(Contract):
    id: str
    email: EmailStr
    full_name: str
    role: Role
    is_minor: bool
    consent_status: str = Field(description="not_required | pending | granted | revoked")
    family_id: str | None = None
    region_code: str | None = None
    pincode: str | None = None
    created_at: datetime


class AuthResult(Contract):
    user: UserOut
    tokens: TokenPair
