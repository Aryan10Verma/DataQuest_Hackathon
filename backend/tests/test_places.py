"""Where people live: the city list, location at sign-up and later, the "Where you live" answers,
and their effect on how job demand is weighed."""

from app.mocks import demo_families as df
from app.schemas.places import PlaceAnswers
from app.services import places as places_svc
from tests.test_live import live, login  # noqa: F401 - shared live-mode fixture


def test_places_list_is_public_and_covers_all_cities(live):  # noqa: F811
    rows = live.get("/api/v1/places").json()["data"]
    codes = {p["region"]["code"] for p in rows}
    assert len(rows) == 24 and {"IN-JK-SXR", "IN-AN-IXZ", "IN-GJ-SRT"} <= codes
    surat = next(p for p in rows if p["region"]["code"] == "IN-GJ-SRT")
    assert {"diamonds", "textiles"} <= {i["key"] for i in surat["industries"]} and "Gujarati" in surat[
        "languages"
    ]


def test_city_demand_differs_by_what_the_city_is_known_for(live):  # noqa: F811
    rows = {r["region"]["code"]: r for r in live.get("/api/v1/market/map").json()["data"]}
    assert len(rows) == 24
    assert rows["IN-KA-BLR"]["top_sectors"][0] == "computing_ai"
    assert (
        len({round(r["demand_index"], 3) for r in rows.values()}) > 10
    )  # no longer one number per city type
    assert all(r["is_estimate"] for r in rows.values())


def test_location_at_sign_up_and_later(live):  # noqa: F811
    body = {
        "email": "place.parent@prism.example",
        "password": "longenough1",
        "full_name": "Place Parent",
        "role": "parent",
    }
    r = live.post("/api/v1/auth/register", json={**body, "region_code": "IN-GJ-SRT", "pincode": "395003"})
    assert r.status_code == 201 and r.json()["data"]["user"]["region_code"] == "IN-GJ-SRT"
    h = {"Authorization": f"Bearer {r.json()['data']['tokens']['access_token']}"}
    bad = live.put("/api/v1/auth/me/location", json={"region_code": "XX-NOPE"}, headers=h)
    assert bad.status_code == 422
    ok = live.put("/api/v1/auth/me/location", json={"region_code": "IN-AS-GUW"}, headers=h)
    assert ok.json()["data"]["region_code"] == "IN-AS-GUW"
    # Only students answer the local questions.
    assert (
        live.put(
            "/api/v1/students/me/place", json={"move_scope": "home", "home_commitment": "none"}, headers=h
        ).status_code
        == 403
    )


def test_place_answers_are_checked_and_change_the_results(live):  # noqa: F811
    h, d = login(live, df.student_email("creative_risk_averse"))
    sid = d["user"]["id"]
    before = live.post("/api/v1/analysis/runs", json={"student_id": sid}, headers=h).json()["data"]
    assert (
        live.put("/api/v1/auth/me/location", json={"region_code": "IN-GJ-SRT"}, headers=h).status_code == 200
    )
    wrong = {"industries": {"software": 5}, "move_scope": "home", "home_commitment": "none"}
    assert (
        live.put("/api/v1/students/me/place", json=wrong, headers=h).status_code == 422
    )  # not a Surat industry
    answers = {
        "industries": {"diamonds": 5, "textiles": 4, "petrochem": 1},
        "move_scope": "home",
        "languages": ["Gujarati"],
        "home_commitment": "strong",
    }
    saved = live.put("/api/v1/students/me/place", json=answers, headers=h)
    assert saved.status_code == 200 and saved.json()["data"]["region_code"] == "IN-GJ-SRT"
    assert live.get("/api/v1/students/me/place", headers=h).json()["data"]["industries"]["diamonds"] == 5
    after = live.post("/api/v1/analysis/runs", json={"student_id": sid}, headers=h).json()["data"]

    top_before = before["recommendations"][0]
    top_after = next(r for r in after["recommendations"] if r["career"]["id"] == top_before["career"]["id"])
    assert top_after["market"]["regions_considered"][0] == "IN-GJ-SRT"  # home now leads the job-demand blend
    assert top_after["market"] != top_before["market"]


def test_liking_a_local_industry_weighs_local_demand_more():
    from dataclasses import replace
    from datetime import UTC, datetime

    from app.core.clock import today
    from app.mocks import builders as b
    from app.services.analysis import run_analysis

    student = replace(b.student_input(), region_code="IN-TN-CBE", willing_to_relocate=0.5)
    family, cat = b.family_input(), b.catalog_input()
    plain = run_analysis(student, family, cat, today=today(), now=datetime.now(UTC), top_k=10)
    sector = plain.recommendations[0].career.sector
    keen = run_analysis(
        replace(student, local_interest=((sector, 1.0),)),
        family,
        cat,
        today=today(),
        now=datetime.now(UTC),
        top_k=10,
    )
    m0 = next(r.market for r in plain.recommendations if r.career.sector == sector)
    m1 = next(r.market for r in keen.recommendations if r.career.id == plain.recommendations[0].career.id)
    assert m1.demand_index != m0.demand_index  # home counts double for the sector they like


def test_answers_become_engine_inputs():
    from app.mocks import builders as b

    regions = b.regions()
    stay = places_svc.engine_inputs(
        PlaceAnswers(industries={"pumps": 5, "textiles": 3}, move_scope="india", home_commitment="strong"),
        "IN-TN-CBE",
        regions,
    )
    assert stay["willing_to_relocate"] == 0.15 and stay["willing_abroad"] == 0.05  # family needs them nearby
    assert dict(stay["local_interest"]) == {"engineering": 1.0, "design_arts": 0.25}
    state = places_svc.engine_inputs(
        PlaceAnswers(move_scope="state", home_commitment="none"), "IN-TN-CBE", regions
    )
    assert "IN-TN-CHN" in state["preferred_regions"] and "IN-KA-BLR" not in state["preferred_regions"]
    assert (
        places_svc.check_answers(PlaceAnswers(move_scope="home", home_commitment="none"), None)
        == "Choose where you live first"
    )
