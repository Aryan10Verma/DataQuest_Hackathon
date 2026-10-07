"""Alias routes matching the team's agreed examples. Bare JSON (no envelope) on success;
errors still use the standard envelope so clients have one error shape. Everything except sign-in and
sign-up needs a bearer token, with the same record checks as /api/v1."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, Gateway
from app.schemas.compat import (
    CompatLoginRequest,
    CompatLoginResponse,
    CompatPredictRequest,
    CompatPredictResponse,
    CompatResult,
    CompatUser,
    CompatUserCreate,
)

router = APIRouter(prefix="/api", tags=["compat (team aliases)"])


@router.post("/login", response_model=CompatLoginResponse)
def login(body: CompatLoginRequest, gw=Gateway):
    return gw.compat_login(body)


@router.post("/users", response_model=CompatUser, status_code=201)
def create_user(body: CompatUserCreate, gw=Gateway):
    return gw.compat_create_user(body)


@router.get("/users/{user_id}", response_model=CompatUser)
def get_user(user_id: str, p=CurrentUser, gw=Gateway):
    return gw.compat_get_user(p, user_id)


@router.post("/predict", response_model=CompatPredictResponse)
def predict(body: CompatPredictRequest, p=CurrentUser, gw=Gateway):
    return gw.compat_predict(p, body)


@router.get("/results/{result_id}", response_model=CompatResult)
def result(result_id: str, p=CurrentUser, gw=Gateway):
    return gw.compat_result(p, result_id)
