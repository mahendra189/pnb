from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AssetStateHistory(Base):
    __tablename__ = "asset_state_history"
    __table_args__ = (
        Index("ix_asset_state_history_asset_id", "asset_id"),
        Index("ix_asset_state_history_scan_id", "scan_id"),
        Index("ix_asset_state_history_recorded_at", "recorded_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("master_assets.id", ondelete="CASCADE"), nullable=False)
    scan_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tls_scan_results.id", ondelete="SET NULL"), nullable=True)
    tls_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    cipher: Mapped[str | None] = mapped_column(String(256), nullable=True)
    certificate_issuer: Mapped[str | None] = mapped_column(String(512), nullable=True)
    pqc_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    risk_score: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    asset: Mapped["MasterAsset"] = relationship("MasterAsset", back_populates="state_history")
    scan: Mapped["TLSScanResult | None"] = relationship("TLSScanResult", back_populates="history_entries")


class AssetChange(Base):
    __tablename__ = "asset_changes"
    __table_args__ = (
        Index("ix_asset_changes_asset_id", "asset_id"),
        Index("ix_asset_changes_detected_at", "detected_at"),
        Index("ix_asset_changes_field_name", "field_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("master_assets.id", ondelete="CASCADE"), nullable=False)
    field_name: Mapped[str] = mapped_column(String(128), nullable=False)
    old_value: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    new_value: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    change_type: Mapped[str] = mapped_column(String(32), nullable=False)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    asset: Mapped["MasterAsset"] = relationship("MasterAsset", back_populates="changes")


class AssetScanSummary(Base):
    __tablename__ = "asset_scan_summary"
    __table_args__ = (
        Index("ix_asset_scan_summary_asset_id", "asset_id"),
        Index("ix_asset_scan_summary_scan_date", "scan_date"),
        Index("ix_asset_scan_summary_change_detected", "change_detected"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("master_assets.id", ondelete="CASCADE"), nullable=False)
    scan_date: Mapped[date] = mapped_column(Date, nullable=False)
    tls_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    pqc_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    risk_score: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    change_detected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    asset: Mapped["MasterAsset"] = relationship("MasterAsset", back_populates="scan_summaries")
