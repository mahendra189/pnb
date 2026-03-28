from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.types import Date

from app.db.base import get_db
from app.db.models.asset_history import AssetChange, AssetScanSummary
from app.schemas.scan import PeriodReportResponse, PeriodSummaryPoint

router = APIRouter(prefix="/reports", tags=["Reports"])


async def _build_report(
    db: AsyncSession,
    *,
    days: int,
    period_label: str,
    bucket: str,
) -> PeriodReportResponse:
    since = date.today() - timedelta(days=days - 1)
    bucket_expr = cast(func.date_trunc(bucket, AssetScanSummary.scan_date), Date)
    change_count_subquery = (
        select(
            cast(func.date_trunc(bucket, AssetChange.detected_at), Date).label("bucket_date"),
            func.count().label("change_count"),
            func.sum(case((AssetChange.change_type == "downgrade", 1), else_=0)).label("downgrade_count"),
        )
        .where(cast(AssetChange.detected_at, Date) >= since)
        .group_by("bucket_date")
        .subquery()
    )
    rows = (
        await db.execute(
            select(
                bucket_expr.label("period_start"),
                func.avg(AssetScanSummary.risk_score).label("average_risk"),
                func.max(AssetScanSummary.risk_score).label("max_risk"),
                func.count(AssetScanSummary.id).label("scanned_assets"),
                func.coalesce(change_count_subquery.c.change_count, 0).label("changed_assets"),
                func.coalesce(change_count_subquery.c.downgrade_count, 0).label("downgrade_count"),
            )
            .outerjoin(change_count_subquery, change_count_subquery.c.bucket_date == bucket_expr)
            .where(AssetScanSummary.scan_date >= since)
            .group_by(bucket_expr, change_count_subquery.c.change_count, change_count_subquery.c.downgrade_count)
            .order_by(bucket_expr.asc())
        )
    ).all()

    points = [
        PeriodSummaryPoint(
            period_start=row.period_start,
            average_risk=round(float(row.average_risk or 0), 2),
            max_risk=round(float(row.max_risk or 0), 2),
            scanned_assets=int(row.scanned_assets or 0),
            changed_assets=int(row.changed_assets or 0),
            downgrade_count=int(row.downgrade_count or 0),
        )
        for row in rows
    ]
    return PeriodReportResponse(
        period=period_label,
        generated_at=datetime.now(UTC),
        summary={
            "total_scans": sum(point.scanned_assets for point in points),
            "total_changes": sum(point.changed_assets for point in points),
            "downgrades": sum(point.downgrade_count for point in points),
            "average_risk": round(sum(point.average_risk for point in points) / len(points), 2) if points else 0,
        },
        points=points,
    )


@router.get("/daily", response_model=PeriodReportResponse)
async def daily_report(db: AsyncSession = Depends(get_db)) -> PeriodReportResponse:
    return await _build_report(db, days=7, period_label="daily", bucket="day")


@router.get("/weekly", response_model=PeriodReportResponse)
async def weekly_report(db: AsyncSession = Depends(get_db)) -> PeriodReportResponse:
    return await _build_report(db, days=56, period_label="weekly", bucket="week")


@router.get("/monthly", response_model=PeriodReportResponse)
async def monthly_report(db: AsyncSession = Depends(get_db)) -> PeriodReportResponse:
    return await _build_report(db, days=365, period_label="monthly", bucket="month")
