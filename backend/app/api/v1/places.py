from fastapi import APIRouter

from app.api.deps import CurrentUser, Gateway
from app.core.envelope import Envelope, ok
from app.schemas.auth import UserOut
from app.schemas.places import LocationIn, Place, PlaceAnswers, PlaceAnswersOut

router = APIRouter(tags=["places"])


@router.get("/places", response_model=Envelope[list[Place]])
def places(gw=Gateway):
    """Indian cities PRISM covers, with the industries and languages each is known for. Public."""
    return ok(gw.list_places(), mock=gw.mock)


@router.put("/auth/me/location", response_model=Envelope[UserOut])
def set_location(body: LocationIn, p=CurrentUser, gw=Gateway):
    """Where you live. Changing city clears the local-industry answers, which differ by city."""
    return ok(gw.set_location(p, body), mock=gw.mock)


@router.get("/students/me/place", response_model=Envelope[PlaceAnswersOut | None])
def get_place(p=CurrentUser, gw=Gateway):
    return ok(gw.get_place(p), mock=gw.mock)


@router.put("/students/me/place", response_model=Envelope[PlaceAnswersOut])
def put_place(body: PlaceAnswers, p=CurrentUser, gw=Gateway):
    """The "Where you live" questions: local industries, how far you'd move, languages, home commitments.
    They change how much job demand at home and elsewhere counts in your results."""
    return ok(gw.put_place(p, body), mock=gw.mock)
