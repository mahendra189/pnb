"""
db/models/container_scan.py — Container image CBOM scan results.

Tracks container image scans using CBOMkit-theia to detect cryptographic
primitives, dependencies, and vulnerabilities in container images.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ContainerScanResult(Base):
    """
    Container image CBOM scan result from CBOMkit-theia.

    Represents a single scan of a container image, detecting:
    - Cryptographic algorithms in binary/runtime
    - Base image and layers analysis
    - Package inventory (OS packages, runtime libs)
    - Supply chain metadata
    """

    __tablename__ = "container_scan_results"
    __table_args__ = (
        Index("ix_container_scan_asset_id", "asset_id"),
        Index("ix_container_scan_scan_timestamp", "scan_timestamp"),
        Index("ix_container_scan_image_digest", "image_digest"),
        Index(
            "ix_container_scan_packages_gin",
            "packages",
            postgresql_using="gin",
        ),
        Index(
            "ix_container_scan_crypto_gin",
            "detected_cryptography",
            postgresql_using="gin",
        ),
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
        comment="Reference to the master asset being scanned",
    )
    scan_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        comment="Celery task UUID for this scan",
    )

    # ── Image metadata ──────────────────────────────────────────────────────
    image_name: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        comment="Container image name (e.g., 'myapp:latest' or digest)",
    )
    image_digest: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        comment="Container image digest (SHA256 hash)",
    )
    image_size_bytes: Mapped[int | None] = mapped_column(
        nullable=True,
        comment="Uncompressed image size in bytes",
    )
    registry: Mapped[str | None] = mapped_column(
        String(256),
        nullable=True,
        comment="Container registry (e.g., 'docker.io', 'ghcr.io')",
    )
    scan_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # ── Base image analysis ─────────────────────────────────────────────────
    base_image_name: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
        comment="Base/parent image name",
    )
    base_image_digest: Mapped[str | None] = mapped_column(
        String(256),
        nullable=True,
        comment="Base image digest",
    )
    os_distribution: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        comment="Detected OS distribution (e.g., 'debian:11', 'alpine:3.17')",
    )
    os_packages: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment=(
            "["
            '{"name": "openssl", "version": "3.0.0", "arch": "amd64"},'
            '{"name": "libssl", "version": "3.0.0", "arch": "amd64"}'
            "]"
        ),
    )

    # ── Cryptographic findings ──────────────────────────────────────────────
    detected_cryptography: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment=(
            "["
            '{"algorithm": "AES", "strength": 256, "usage": "encryption", '
            '"binary": "libssl.so", "confidence": 0.98},'
            '{"algorithm": "SHA256", "strength": "variable", "usage": "hashing", '
            '"binary": "libcrypto.so", "confidence": 0.96}'
            "]"
        ),
    )
    crypto_categories: Mapped[list[str] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment='["symmetric_cipher", "hash", "key_exchange"]',
    )

    # ── Package inventory ───────────────────────────────────────────────────
    packages: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment=(
            "["
            '{"type": "deb", "name": "systemd", "version": "250.3", "license": "LGPL-2.1+"},'
            '{"type": "pip", "name": "cryptography", "version": "39.0.0", "license": "Apache-2.0 or BSD"}'
            "]"
        ),
    )
    total_packages: Mapped[int | None] = mapped_column(
        nullable=True,
        comment="Total package count in image",
    )

    # ── Vulnerabilities & risks ────────────────────────────────────────────
    vulnerabilities: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment=(
            "["
            '{"cve": "CVE-2021-44228", "severity": "critical", "package": "log4j", "fix_available": true},'
            '{"cve": "CVE-2023-1234", "severity": "high", "package": "openssl", "fix_available": false}'
            "]"
        ),
    )
    supply_chain_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment=(
            "{"
            '"sbom_generated": "2026-04-04T10:00:00Z",'
            '"scanner_version": "theia-2.5.0",'
            '"base_image_vulnerabilities": 12,'
            '"critical_vuln_count": 2'
            "}"
        ),
    )

    # ── Layers & composition ────────────────────────────────────────────────
    layer_count: Mapped[int | None] = mapped_column(
        nullable=True,
        comment="Number of container image layers",
    )
    layers_analysis: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment=(
            "["
            '{"layer_index": 0, "size_bytes": 1024000, "packages_added": 15},'
            '{"layer_index": 1, "size_bytes": 2048000, "packages_added": 8}'
            "]"
        ),
    )

    # ── Scan metadata ───────────────────────────────────────────────────────
    scan_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="pending",
        comment="pending | running | completed | failed | timeout",
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Error details if scan failed",
    )
    raw_cbom_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Full CycloneDX CBOM response from CBOMkit-theia",
    )
    scan_duration_seconds: Mapped[float | None] = mapped_column(
        nullable=True,
        comment="Time taken to scan image (seconds)",
    )
