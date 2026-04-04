"""
services/cbomkit_bridge.py — Integration layer for IBM CBOMkit (Hyperion + Theia).

Orchestrates:
1. Source code CBOM scanning via CBOMkit-hyperion (Java/Python repos)
2. Container image CBOM scanning via CBOMkit-theia
3. Merging source + container + network CBOMs into unified CBOM
4. Confidence scoring based on discovery methods
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from datetime import UTC, datetime
from typing import Any

import aiohttp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.asset import MasterAsset
from app.db.models.cbom import CBOMRecord, CryptoCategory, PQCStatus
from app.db.models.container_scan import ContainerScanResult
from app.db.models.source_scan import SourceScanResult, SourceLanguage


class CBOMKitBridge:
    """
    Bridge service for CBOMkit integration.
    Manages bidirectional communication with Hyperion and Theia services.
    """

    # Configuration URLs (adjust for your environment)
    HYPERION_BASE_URL = "http://cbomkit-hyperion:8080"
    THEIA_BASE_URL = "http://cbomkit-theia:8080"

    # Timeouts for external API calls
    SCAN_TIMEOUT = 600  # 10 minutes max per scan
    CONFIDENCE_THRESHOLD = 0.70  # 70% minimum confidence

    @staticmethod
    async def scan_source_repository(
        db: AsyncSession,
        asset_id: uuid.UUID,
        repository_url: str,
        repository_branch: str = "main",
        language: SourceLanguage = SourceLanguage.PYTHON,
        *,
        celery_task_id: str | None = None,
    ) -> SourceScanResult:
        """
        Scan a source code repository using CBOMkit-hyperion.

        Args:
            db: Database session
            asset_id: Master asset UUID
            repository_url: Git URL or local path to repository
            repository_branch: Branch to scan (default: main)
            language: Primary language (java, python, etc.)
            celery_task_id: Optional Celery task UUID

        Returns:
            SourceScanResult object with detected cryptographic primitives
        """
        asset = await db.get(MasterAsset, asset_id)
        if asset is None:
            raise ValueError(f"Asset {asset_id} not found")

        start_time = time.time()
        scan_result = SourceScanResult(
            asset_id=asset_id,
            scan_job_id=uuid.UUID(celery_task_id) if celery_task_id else None,
            repository_url=repository_url,
            repository_branch=repository_branch,
            primary_language=language,
            scan_status="running",
        )
        db.add(scan_result)
        await db.flush()

        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "repository_url": repository_url,
                    "branch": repository_branch,
                    "language": language.value,
                    "analyze_dependencies": True,
                    "extract_licenses": True,
                    "detect_vulnerabilities": True,
                }

                async with session.post(
                    f"{CBOMKitBridge.HYPERION_BASE_URL}/api/v1/scan",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=CBOMKitBridge.SCAN_TIMEOUT),
                ) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        raise RuntimeError(
                            f"Hyperion returned {resp.status}: {error_text}"
                        )

                    cbom_response = await resp.json()

            # Parse and store results
            _parse_hyperion_response(scan_result, cbom_response)
            scan_result.scan_status = "completed"
            scan_result.scan_duration_seconds = time.time() - start_time

        except asyncio.TimeoutError:
            scan_result.scan_status = "timeout"
            scan_result.error_message = "Hyperion scan exceeded timeout window"
        except Exception as exc:
            scan_result.scan_status = "failed"
            scan_result.error_message = str(exc)
            raise

        await db.flush()
        return scan_result

    @staticmethod
    async def scan_container_image(
        db: AsyncSession,
        asset_id: uuid.UUID,
        image_name: str,
        image_digest: str | None = None,
        *,
        celery_task_id: str | None = None,
    ) -> ContainerScanResult:
        """
        Scan a container image using CBOMkit-theia.

        Args:
            db: Database session
            asset_id: Master asset UUID
            image_name: Container image name (e.g., 'myapp:latest')
            image_digest: Optional pre-computed image digest
            celery_task_id: Optional Celery task UUID

        Returns:
            ContainerScanResult object with detected cryptographic libraries
        """
        asset = await db.get(MasterAsset, asset_id)
        if asset is None:
            raise ValueError(f"Asset {asset_id} not found")

        start_time = time.time()
        scan_result = ContainerScanResult(
            asset_id=asset_id,
            scan_job_id=uuid.UUID(celery_task_id) if celery_task_id else None,
            image_name=image_name,
            image_digest=image_digest or image_name,  # Fallback to name if no digest
            scan_status="running",
        )
        db.add(scan_result)
        await db.flush()

        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "image_reference": image_name,
                    "pull_if_missing": True,
                    "analyze_layers": True,
                    "extract_packages": True,
                    "detect_vulnerabilities": True,
                    "extract_cryptography": True,
                }

                async with session.post(
                    f"{CBOMKitBridge.THEIA_BASE_URL}/api/v1/scan",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=CBOMKitBridge.SCAN_TIMEOUT),
                ) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        raise RuntimeError(
                            f"Theia returned {resp.status}: {error_text}"
                        )

                    cbom_response = await resp.json()

            # Parse and store results
            _parse_theia_response(scan_result, cbom_response)
            scan_result.scan_status = "completed"
            scan_result.scan_duration_seconds = time.time() - start_time

        except asyncio.TimeoutError:
            scan_result.scan_status = "timeout"
            scan_result.error_message = "Theia scan exceeded timeout window"
        except Exception as exc:
            scan_result.scan_status = "failed"
            scan_result.error_message = str(exc)
            raise

        await db.flush()
        return scan_result

    @staticmethod
    async def merge_cboms_with_confidence(
        db: AsyncSession,
        asset_id: uuid.UUID,
        *,
        include_network_scan: bool = True,
        include_source_scan: bool = True,
        include_container_scan: bool = True,
    ) -> dict[str, Any]:
        """
        Merge CBOMs from multiple sources (network, source code, container).

        Creates a unified CBOM with confidence scores indicating how many
        discovery methods independently found each cryptographic asset.

        Args:
            db: Database session
            asset_id: Master asset UUID
            include_network_scan: Include TLS/network scan results
            include_source_scan: Include source code scan results
            include_container_scan: Include container image scan results

        Returns:
            Unified CBOM dictionary with confidence_score per algorithm
        """
        asset = await db.get(MasterAsset, asset_id)
        if asset is None:
            raise ValueError(f"Asset {asset_id} not found")

        # Collect all algorithms from each source with confidence tracking
        algorithm_detections: dict[str, list[dict[str, Any]]] = {}

        # 1. Network scan (TLS/HTTPS)
        if include_network_scan:
            network_algorithms = await _extract_network_cbom(db, asset_id)
            for algo in network_algorithms:
                algo_key = (algo.get("algorithm_name") or "").lower()
                if algo_key not in algorithm_detections:
                    algorithm_detections[algo_key] = []
                algorithm_detections[algo_key].append(
                    {
                        "source": "network_scan",
                        "method": "tls_handshake",
                        "confidence": 0.95,  # TLS is highly reliable
                        "data": algo,
                    }
                )

        # 2. Source code scan (Hyperion)
        if include_source_scan:
            source_algorithms = await _extract_source_cbom(db, asset_id)
            for algo in source_algorithms:
                algo_key = (algo.get("algorithm") or "").lower()
                if algo_key not in algorithm_detections:
                    algorithm_detections[algo_key] = []
                confidence = algo.get("confidence", 0.80)
                algorithm_detections[algo_key].append(
                    {
                        "source": "source_scan",
                        "method": "static_analysis",
                        "confidence": confidence,
                        "data": algo,
                    }
                )

        # 3. Container scan (Theia)
        if include_container_scan:
            container_algorithms = await _extract_container_cbom(db, asset_id)
            for algo in container_algorithms:
                algo_key = (algo.get("algorithm") or "").lower()
                if algo_key not in algorithm_detections:
                    algorithm_detections[algo_key] = []
                confidence = algo.get("confidence", 0.85)
                algorithm_detections[algo_key].append(
                    {
                        "source": "container_scan",
                        "method": "binary_analysis",
                        "confidence": confidence,
                        "data": algo,
                    }
                )

        # 4. Compute unified confidence scores
        unified_cbom = {
            "asset_id": str(asset_id),
            "asset_name": asset.asset_name,
            "merge_timestamp": datetime.now(UTC).isoformat(),
            "sources": {
                "network_scan_enabled": include_network_scan,
                "source_scan_enabled": include_source_scan,
                "container_scan_enabled": include_container_scan,
            },
            "algorithms": [],
        }

        for algo_key, detections in algorithm_detections.items():
            # Aggregate all detections for this algorithm
            num_sources = len(detections)
            avg_confidence = sum(d["confidence"] for d in detections) / num_sources

            # Unified confidence: [0.70 - 0.99+] based on detection count
            # More sources = more confidence
            confidence_score = 0.70 + (num_sources - 1) * 0.095  # +9.5% per source
            confidence_score = min(confidence_score, 0.99)

            if confidence_score >= CBOMKitBridge.CONFIDENCE_THRESHOLD:
                unified_cbom["algorithms"].append(
                    {
                        "algorithm_name": algo_key.upper(),
                        "confidence_score": round(confidence_score, 2),
                        "discovery_sourcecount": num_sources,
                        "detection_methods": [
                            {
                                "source": d["source"],
                                "method": d["method"],
                                "confidence": d["confidence"],
                            }
                            for d in detections
                        ],
                        "raw_detections": detections,
                    }
                )

        return unified_cbom

    @staticmethod
    async def create_confident_cbom_records(
        db: AsyncSession,
        asset_id: uuid.UUID,
        unified_cbom: dict[str, Any],
    ) -> list[CBOMRecord]:
        """
        Convert unified CBOM with confidence scores into persistable CBOMRecord entries.

        Args:
            db: Database session
            asset_id: Master asset UUID
            unified_cbom: Unified CBOM from merge_cboms_with_confidence()

        Returns:
            List of created CBOMRecord objects
        """
        new_records: list[CBOMRecord] = []

        # Get current version
        current_version = (
            await db.execute(
                select(max(CBOMRecord.version)).where(
                    CBOMRecord.asset_id == asset_id
                )
            )
        ).scalar_one()
        next_version = (current_version or 0) + 1

        for algo_data in unified_cbom.get("algorithms", []):
            record = CBOMRecord(
                asset_id=asset_id,
                version=next_version,
                algorithm_name=algo_data["algorithm_name"],
                category=CryptoCategory.OTHER,  # Classify later if needed
                pqc_status=PQCStatus.UNKNOWN,  # Classify based on algorithm name
                usage_context="unified_cbom",
                detection_sources=[
                    {
                        "tool": f"cbomkit-{d['source'].split('_')[0]}",
                        "method": d["method"],
                        "confidence": d["confidence"],
                    }
                    for d in algo_data.get("detection_methods", [])
                ],
                # Extended field: store confidence score in algorithm_parameters
                algorithm_parameters={
                    "confidence_score": algo_data["confidence_score"],
                    "discovery_source_count": algo_data["discovery_sourcecount"],
                },
            )
            new_records.append(record)

        # Bulk add
        for rec in new_records:
            db.add(rec)
        await db.flush()

        return new_records


# ─────────────────────────────────────────────────────────────────────────────
# Private helper functions
# ─────────────────────────────────────────────────────────────────────────────


def _parse_hyperion_response(
    scan_result: SourceScanResult,
    cbom_response: dict[str, Any],
) -> None:
    """Parse CBOMkit-hyperion response and populate scan result fields."""
    scan_result.raw_cbom_json = cbom_response

    # Extract detected languages
    scan_result.detected_languages = cbom_response.get("languages", [])

    # Extract cryptographic algorithms
    components = cbom_response.get("components", [])
    crypto_algos = [
        c for c in components if c.get("type") == "cryptographic_algorithm"
    ]
    scan_result.detected_algorithms = [
        {
            "algorithm": c.get("name"),
            "context": c.get("usage_context", "unknown"),
            "confidence": c.get("confidence", 0.80),
            "line_refs": c.get("locations", []),
        }
        for c in crypto_algos
    ]
    scan_result.crypto_categories_found = list(
        {c.get("category") for c in crypto_algos if c.get("category")}
    )

    # Extract dependencies
    dependencies = cbom_response.get("dependencies", [])
    scan_result.dependencies = [
        {
            "name": d.get("name"),
            "version": d.get("version"),
            "pqc_compatible": d.get("quantum_safe", None),
            "license": d.get("license", "unknown"),
        }
        for d in dependencies
    ]

    # Extract license findings
    scan_result.license_findings = cbom_response.get("licenses", [])

    # Extract supply chain risks
    scan_result.supply_chain_risks = cbom_response.get("risks", [])

    # Code metrics
    scan_result.total_lines_of_code = cbom_response.get("total_loc")
    scan_result.cryptographic_usage_density = cbom_response.get(
        "crypto_usage_density"
    )


def _parse_theia_response(
    scan_result: ContainerScanResult,
    cbom_response: dict[str, Any],
) -> None:
    """Parse CBOMkit-theia response and populate scan result fields."""
    scan_result.raw_cbom_json = cbom_response

    # Image metadata
    scan_result.image_digest = cbom_response.get("image_digest", scan_result.image_digest)
    scan_result.image_size_bytes = cbom_response.get("image_size_bytes")
    scan_result.registry = cbom_response.get("registry")

    # Base image
    scan_result.base_image_name = cbom_response.get("base_image_name")
    scan_result.base_image_digest = cbom_response.get("base_image_digest")
    scan_result.os_distribution = cbom_response.get("os_distribution")
    scan_result.os_packages = cbom_response.get("os_packages", [])

    # Cryptography
    components = cbom_response.get("components", [])
    crypto_items = [
        c for c in components if c.get("type") == "cryptographic_algorithm"
    ]
    scan_result.detected_cryptography = crypto_items
    scan_result.crypto_categories = list(
        {c.get("category") for c in crypto_items if c.get("category")}
    )

    # Packages
    scan_result.packages = cbom_response.get("packages", [])
    scan_result.total_packages = cbom_response.get("total_packages")

    # Vulnerabilities
    scan_result.vulnerabilities = cbom_response.get("vulnerabilities", [])
    scan_result.supply_chain_metadata = cbom_response.get("metadata")

    # Layers
    scan_result.layer_count = cbom_response.get("layer_count")
    scan_result.layers_analysis = cbom_response.get("layers", [])


async def _extract_network_cbom(
    db: AsyncSession,
    asset_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """Extract cryptographic algorithms detected from network scans."""
    cbom_records = (
        await db.execute(
            select(CBOMRecord).where(CBOMRecord.asset_id == asset_id)
        )
    ).scalars().all()
    return [
        {
            "algorithm_name": r.algorithm_name,
            "category": r.category.value,
            "pqc_status": r.pqc_status.value,
            "usage_context": r.usage_context,
            "confidence": 0.95,  # Network scan is highly reliable
        }
        for r in cbom_records
    ]


async def _extract_source_cbom(
    db: AsyncSession,
    asset_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """Extract cryptographic algorithms detected from source code."""
    source_scans = (
        await db.execute(
            select(SourceScanResult)
            .where(SourceScanResult.asset_id == asset_id)
            .order_by(SourceScanResult.scan_timestamp.desc())
        )
    ).scalars().all()

    algorithms = []
    for scan in source_scans:
        if scan.scan_status == "completed" and scan.detected_algorithms:
            algorithms.extend(scan.detected_algorithms)

    return algorithms


async def _extract_container_cbom(
    db: AsyncSession,
    asset_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """Extract cryptographic algorithms detected from container images."""
    container_scans = (
        await db.execute(
            select(ContainerScanResult)
            .where(ContainerScanResult.asset_id == asset_id)
            .order_by(ContainerScanResult.scan_timestamp.desc())
        )
    ).scalars().all()

    algorithms = []
    for scan in container_scans:
        if scan.scan_status == "completed" and scan.detected_cryptography:
            for crypto in scan.detected_cryptography:
                algorithms.append(
                    {
                        "algorithm": crypto.get("algorithm"),
                        "strength": crypto.get("strength"),
                        "usage": crypto.get("usage"),
                        "confidence": crypto.get("confidence", 0.85),
                    }
                )

    return algorithms


# Global instance
cbomkit_bridge = CBOMKitBridge()
