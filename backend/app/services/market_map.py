"""The job-demand map: per-city summaries of the market signals, shared by the live and mock gateways."""

from collections.abc import Iterable

from app.schemas.catalog import MarketSignal, Region, RegionDemand


def summarize(regions: Iterable[Region], signals: Iterable[MarketSignal]) -> list[RegionDemand]:
    by_region: dict[str, list[MarketSignal]] = {}
    for s in signals:
        by_region.setdefault(s.region_code, []).append(s)
    out: list[RegionDemand] = []
    for region in regions:
        rows = by_region.get(region.code, [])
        if region.country != "India" or not rows:
            continue
        sectors: dict[str, list[float]] = {}
        for s in rows:
            sectors.setdefault(s.career.sector, []).append(s.demand_index)
        top = sorted(sectors, key=lambda k: -sum(sectors[k]) / len(sectors[k]))[:3]
        out.append(
            RegionDemand(
                region=region,
                demand_index=round(sum(s.demand_index for s in rows) / len(rows), 3),
                job_velocity=round(sum(s.job_velocity for s in rows) / len(rows), 3),
                top_sectors=top,
                rising=[s.career for s in sorted(rows, key=lambda s: -s.job_velocity)[:3]],
                careers_tracked=len(rows),
                is_estimate=any(s.provenance.is_estimate for s in rows),
                period=max(s.period for s in rows),
            )
        )
    return sorted(out, key=lambda r: -r.demand_index)
