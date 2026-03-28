"""
db/models/tls_scan.py — TLS Scan Results ORM model.

Captures the complete cryptographic profile of a TLS handshake:
  • Protocol version(s) supported
  • Cipher suites (symmetric + key exchange algorithms)
  • Certificate chain metadata
  • HNDL (Harvest Now, Decrypt Later) risk score
  • Raw SSLyze / ZGrab2 output (JSONB)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TLSScanResult(Base):
    """
    TLS Scan Results — one row per scan-run per asset.

    Key design decisions:
    - `cipher_suites` stores the complete ordered list of offered suites
      as a JSONB array; each element is a dict with algorithm, key_size, pqc_safe.
    - `certificate_chain` stores the full PEM / parsed chain metadata in JSONB
      to avoid a separate table while keeping JSON querying.
    - `hndl_score` is a float [0–10] produced by the AI engine.
    - `raw_output` archives the verbatim tool output for auditability / re-analysis.
    """

    __tablename__ = "tls_scan_results"
    __table_args__ = (
        Index("ix_tls_scan_results_asset_id", "asset_id"),
        Index("ix_tls_scan_results_scan_timestamp", "scan_timestamp"),
        Index("ix_tls_scan_results_tls_version", "tls_version"),
        Index("ix_tls_scan_results_risk_score", "risk_score"),
        Index("ix_tls_scan_results_raw_data_gin", "raw_data", postgresql_using="gin"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("master_assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    scan_job_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    host: Mapped[str] = mapped_column(String(512), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False, default=443)
    scan_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    tls_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    cipher: Mapped[str | None] = mapped_column(String(256), nullable=True)
    key_exchange: Mapped[str | None] = mapped_column(String(256), nullable=True)
    certificate_issuer: Mapped[str | None] = mapped_column(String(512), nullable=True)
    certificate_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pqc_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    vulnerabilities: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JSONB, nullable=True)
    http_headers: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    open_ports: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    raw_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    risk_score: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    supports_pqc_kem: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    scan_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # ── Relationships ────────────────────────────────────────────────────────
    asset: Mapped["MasterAsset"] = relationship(
        "MasterAsset",
        back_populates="tls_scans",
    )
    history_entries: Mapped[list["AssetStateHistory"]] = relationship(
        "AssetStateHistory",
        back_populates="scan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<TLSScanResult id={self.id} asset={self.asset_id}"
            f" host={self.host}:{self.port} tls={self.tls_version}>"
        )
