"""Where people live: the cities PRISM covers, and the student's "Where you live" answers."""

from typing import Literal

from pydantic import Field

from app.schemas.catalog import Region
from app.schemas.common import Contract


class Industry(Contract):
    key: str
    label: str
    sector: str = Field(description="The career sector this industry hires into")


class Place(Contract):
    region: Region
    industries: list[Industry] = Field(description="What the city is known for, for the local questions")
    languages: list[str]


class LocationIn(Contract):
    region_code: str = Field(max_length=20, examples=["IN-TN-CBE"])
    pincode: str | None = Field(
        default=None, pattern=r"^\d{6}$", description="Optional: unlocks local problems"
    )


MoveScope = Literal["home", "state", "india", "abroad"]
HomeCommitment = Literal["none", "some", "strong"]


class PlaceAnswers(Contract):
    industries: dict[str, int] = Field(
        default_factory=dict,
        max_length=8,
        description="Interest in each local industry, 1 (none) to 5 (a lot)",
    )
    move_scope: MoveScope = Field(description="How far they would move for study or work")
    languages: list[str] = Field(
        default_factory=list, max_length=10, description="Languages they can work in"
    )
    home_commitment: HomeCommitment = Field(
        description="Does family need them nearby (farm, business, care)?"
    )


class PlaceAnswersOut(PlaceAnswers):
    region_code: str
