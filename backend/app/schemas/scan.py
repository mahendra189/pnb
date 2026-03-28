from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AssetMatrixRow(BaseModel):
    id: uuid.UUID
    asset: str
    asset_type: str
    tls_version: str | None
    cipher: str | None
    pqc_status: str | None
    risk_score: float | None
    last_scanned_at: datetime | None
    status: str


class AssetMatrixResponse(BaseModel):
    updated_at: datetime
    items: list[AssetMatrixRow]


class AssetHistoryEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: uuid.UUID
    scan_id: uuid.UUID | None
    tls_version: str | None
    cipher: str | None
    certificate_issuer: str | None
    pqc_status: str | None
    risk_score: float | None
    recorded_at: datetime


class AssetChangeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: uuid.UUID
    field_name: str
    old_value: str | None
    new_value: str | None
    change_type: str
    detected_at: datetime


class PeriodSummaryPoint(BaseModel):
    period_start: date
    average_risk: float
    max_risk: float
    scanned_assets: int
    changed_assets: int
    downgrade_count: int


class PeriodReportResponse(BaseModel):
    period: str
    generated_at: datetime
    summary: dict[str, float | int]
    points: list[PeriodSummaryPoint]
