"""Where people live: the city list for pickers and maps, and how "Where you live" answers become
engine inputs. Shared by the live and mock gateways."""

import json
from collections.abc import Iterable
from functools import lru_cache
from pathlib import Path

from app.schemas.catalog import Region
from app.schemas.places import Industry, Place, PlaceAnswers

PLACES_FILE = Path(__file__).resolve().parents[2] / "data" / "seed" / "places.json"


@lru_cache
def _facts() -> dict[str, dict]:
    if not PLACES_FILE.is_file():
        return {}
    return {p["region_code"]: p for p in json.loads(PLACES_FILE.read_text(encoding="utf-8"))["places"]}


def industries_of(region_code: str | None) -> list[Industry]:
    return [Industry(**i) for i in _facts().get(region_code or "", {}).get("industries", [])]


def places(regions: Iterable[Region]) -> list[Place]:
    """Indian cities PRISM covers, grouped by state then name, with what each is known for."""
    out = [
        Place(
            region=r,
            industries=industries_of(r.code),
            languages=_facts().get(r.code, {}).get("languages", []),
        )
        for r in regions
        if r.country == "India"
    ]
    return sorted(out, key=lambda p: (p.region.state or "", p.region.name))


# How far someone would move -> (willingness to relocate, willingness to go abroad), both 0..1.
MOVE = {"home": (0.1, 0.05), "state": (0.4, 0.1), "india": (0.85, 0.3), "abroad": (0.9, 0.9)}
# Family needs them nearby -> caps on (relocating, going abroad); abroad is the bigger step.
COMMITMENT_CAP = {"none": (1.0, 1.0), "some": (0.45, 0.2), "strong": (0.15, 0.05)}


def engine_inputs(answers: PlaceAnswers, region_code: str | None, regions: Iterable[Region]) -> dict:
    """The parts of StudentInput that follow from where they live and how far they would go."""
    relocate, abroad = MOVE[answers.move_scope]
    cap_move, cap_abroad = COMMITMENT_CAP[answers.home_commitment]
    regions = list(regions)
    state = next((r.state for r in regions if r.code == region_code), None)
    preferred: tuple[str, ...] = ()
    if answers.move_scope == "state" and state:
        preferred = tuple(sorted(r.code for r in regions if r.state == state and r.code != region_code))
    # Interest in local industries, per sector: 1-2 = none, 3 = 0.25, 4 = 0.6, 5 = 1.
    scale = {1: 0.0, 2: 0.0, 3: 0.25, 4: 0.6, 5: 1.0}
    local: dict[str, float] = {}
    for ind in industries_of(region_code):
        if ind.key in answers.industries:
            local[ind.sector] = max(local.get(ind.sector, 0.0), scale[answers.industries[ind.key]])
    return {
        "willing_to_relocate": min(relocate, cap_move),
        "willing_abroad": min(abroad, cap_abroad),
        "preferred_regions": preferred,
        "local_interest": tuple(sorted((k, v) for k, v in local.items() if v > 0)),
    }


def check_answers(answers: PlaceAnswers, region_code: str | None) -> str | None:
    """Why these answers can't be saved, or None."""
    if not region_code:
        return "Choose where you live first"
    known = {i.key for i in industries_of(region_code)}
    unknown = sorted(set(answers.industries) - known)
    if unknown:
        return f"Not an industry near you: {', '.join(unknown)}"
    if any(not 1 <= v <= 5 for v in answers.industries.values()):
        return "Rate each industry from 1 to 5"
    return None
