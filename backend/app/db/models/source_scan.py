"""
db/models/source_scan.py — Source code CBOM scan results (Java/Python).

Tracks repository scans using CBOMkit-hyperion to detect cryptographic
primitives, dependencies, and licenses in source code.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SourceLanguage(str, enum.Enum):
    """Programming language detected in repository."""
    JAVA = "java"
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    GO = "go"
    RUST = "rust"
    CSHARP = "csharp"
    CPP = "cpp"
    OTHER = "other"


class SourceScanResult(Base):
    """
    Source code CBOM scan result from CBOMkit-hyperion.

    Represents a single scan of a source code repository, detecting:
    - Cryptographic algorithms used in code
    - Dependencies (libraries) and their versions
    - License information
    - Code quality metrics
    """

    __tablename__ = "source_scan_results"
    __table_args__ = (
        Index("ix_source_scan_asset_id", "asset_id"),
        Index("ix_source_scan_scan_timestamp", "scan_timestamp"),
        Index("ix_source_scan_language", "primary_language"),
        Index(
            "ix_source_scan_algorithms_gin",
            "detected_algorithms",
            postgresql_using="gin",
        ),
        Index(
            "ix_source_scan_dependencies_gin",
            "dependencies",
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

    # ── Repository metadata ─────────────────────────────────────────────────
    repository_url: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        comment="Git repository URL or local path being scanned",
    )
    repository_branch: Mapped[str] = mapped_column(
        String(256),
        nullable=True,
        default="main",
        comment="Branch scanned (default: main/master)",
    )
    commit_hash: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        comment="Git commit SHA-1 hash of scanned state",
    )
    scan_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # ── Language detection ──────────────────────────────────────────────────
    primary_language: Mapped[SourceLanguage] = mapped_column(
        Enum(SourceLanguage, name="source_language_enum"),
        nullable=False,
        comment="Dominant language in repository",
    )
    detected_languages: Mapped[list[str] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment='["java", "python", "javascript", …]',
    )

    # ── Cryptographic findings ──────────────────────────────────────────────
    detected_algorithms: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment=(
            "["
            '{"algorithm": "RSA", "context": "TLS", "confidence": 0.95, "line_refs": [...]},'
            '{"algorithm": "AES", "context": "encryption", "confidence": 0.87, ...}'
            "]"
        ),
    )
    crypto_categories_found: Mapped[list[str] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment='["symmetric_cipher", "hash", "key_exchange", …]',
    )

    # ── Dependencies & supply chain ─────────────────────────────────────────
    dependencies: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment=(
            "["
            '{"name": "log4j", "version": "2.17.1", "pqc_compatible": false, "license": "Apache-2.0"},'
            '{"name": "boto3", "version": "1.20.0", "pqc_compatible": null, "license": "Apache-2.0"}'
            "]"
        ),
    )
    license_findings: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment=(
            "["
            '{"file": "src/crypto.py", "detected_licenses": ["MIT", "Apache-2.0"]},'
            '{"file": "lib/vendor.jar", "detected_licenses": ["GPL-3.0"]}'
            "]"
        ),
    )
    supply_chain_risks: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment=(
            "["
            '{"package": "leftpad", "risk": "typosquatting", "confidence": 0.92},'
            '{"package": "compromised-lib", "risk": "malware", "confidence": 0.85}'
            "]"
        ),
    )

    # ── Code metrics ────────────────────────────────────────────────────────
    total_lines_of_code: Mapped[int | None] = mapped_column(
        nullable=True,
        comment="Total LOC scanned",
    )
    cryptographic_usage_density: Mapped[float | None] = mapped_column(
        nullable=True,
        comment="Percentage of code using cryptographic primitives",
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
        comment="Full CycloneDX CBOM response from CBOMkit-hyperion",
    )
    scan_duration_seconds: Mapped[float | None] = mapped_column(
        nullable=True,
        comment="Time taken to scan repository (seconds)",
    )
