"""Alias-route contracts agreed with the team (bare JSON, no envelope)."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class _Compat(BaseModel):
    model_config = ConfigDict(extra="ignore")


class CompatLoginRequest(_Compat):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class CompatLoginResponse(_Compat):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    role: str


class CompatUserCreate(_Compat):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="student", max_length=10)


class CompatUser(_Compat):
    id: str
    name: str
    email: EmailStr
    role: str


class CompatPredictRequest(_Compat):
    user_id: str | None = Field(default=None, max_length=36)
    student_id: str | None = Field(default=None, max_length=36)
    vector: dict[str, float] | None = Field(
        default=None, max_length=64, description="Optional canonical student vector"
    )


class CompatPredictResponse(_Compat):
    id: str = Field(description="Result id, usable with GET /api/results/{id}")
    score: float = Field(ge=0, le=100)
    result: str = Field(description="Top recommended career name")
    confidence: float = Field(ge=0, le=1)
    domain_scores: dict[str, float] = Field(default_factory=dict)


class CompatResult(CompatPredictResponse):
    top_careers: list[dict[str, float | str]] = Field(default_factory=list)
