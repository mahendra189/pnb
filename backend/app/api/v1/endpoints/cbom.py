"""
api/v1/endpoints/cbom.py — Cryptography Bill of Materials (CBOM) API endpoints.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models.cbom import CBOMRecord, CryptoCategory, PQCStatus
from app.db.models.container_scan import ContainerScanResult
from app.db.models.source_scan import SourceLanguage, SourceScanResult
from app.services.cbom_service import CBOMService
from app.services.cbomkit_bridge import cbomkit_bridge
from app.workers.tasks.cbomkit_scans import (
    merge_and_score_cboms_task,
    scan_container_image_task,
    scan_source_repository_task,
)

router = APIRouter(prefix="/cbom", tags=["CBOM"])


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────────────────────────────────────────


class SourceScanRequest(BaseModel):
    """Request to scan a source code repository."""

    repository_url: str = Field(..., description="Git repo URL or local path")
    repository_branch: str = Field("main", description="Branch to scan")
    language: str = Field("python", description="Primary language: java, python, etc.")


class ContainerScanRequest(BaseModel):
    """Request to scan a container image."""

    image_name: str = Field(..., description="Container image reference")
    image_digest: str | None = Field(None, description="Optional image SHA256 digest")


class UnifiedCBOMRequest(BaseModel):
    """Request to merge and score CBOMs from multiple sources."""

    include_network_scan: bool = Field(True, description="Include TLS/network scans")
    include_source_scan: bool = Field(True, description="Include source code scans")
    include_container_scan: bool = Field(True, description="Include container scans")


# ─────────────────────────────────────────────────────────────────────────────
# Existing endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/", response_model=list[dict[str, Any]])
async def list_cbom_records(
    asset_id: uuid.UUID | None = Query(None, description="Filter by asset ID"),
    category: CryptoCategory | None = Query(None, description="Filter by crypto category"),
    pqc_status: PQCStatus | None = Query(None, description="Filter by PQC safety status"),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """
    Retrieve CBOM records with optional filtering.
    """
    query = select(CBOMRecord)
    if asset_id:
        query = query.where(CBOMRecord.asset_id == asset_id)
    if category:
        query = query.where(CBOMRecord.category == category)
    if pqc_status:
        query = query.where(CBOMRecord.pqc_status == pqc_status)
    
    result = await db.execute(query)
    records = result.scalars().all()
    
    # Simple JSON conversion logic (would use Pydantic models in real impl)
    return [
        {
            "id": str(r.id),
            "asset_id": str(r.asset_id),
            "algorithm_name": r.algorithm_name,
            "category": r.category,
            "pqc_status": r.pqc_status,
            "usage_context": r.usage_context,
            "quantum_risk_score": r.quantum_risk_score,
            "replacement_algorithm": r.replacement_algorithm,
            "last_confirmed": r.last_confirmed.isoformat() if r.last_confirmed else None,
        }
        for r in records
    ]


@router.get("/{asset_id}", response_model=list[dict[str, Any]])
async def get_asset_cbom(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """
    Get the full CBOM for a specific asset.
    """
    records = await CBOMService.get_cbom_for_asset(db, asset_id)
    return [
        {
            "id": str(r.id),
            "algorithm_name": r.algorithm_name,
            "category": r.category,
            "pqc_status": r.pqc_status,
            "usage_context": r.usage_context,
        }
        for r in records
    ]


# ─────────────────────────────────────────────────────────────────────────────
# CBOMkit Integration Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/{asset_id}/scan-source", response_model=dict[str, Any])
async def scan_source_repository(
    asset_id: uuid.UUID,
    request: SourceScanRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Trigger a source code CBOM scan using CBOMkit-hyperion.

    Analyzes Java/Python repositories to discover:
    - Cryptographic algorithms in source code
    - Dependencies and their versions
    - License information
    - Supply chain risks

    Returns immediately with task ID; actual scan runs asynchronously.
    """
    # Verify asset exists
    from app.db.models.asset import MasterAsset

    asset = await db.get(MasterAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")

    # Submit Celery task
    task = scan_source_repository_task.apply_async(
        args=(
            str(asset_id),
            request.repository_url,
            request.repository_branch,
            request.language,
            None,
        ),
        queue="scanning",
        track_started=True,
    )

    return {
        "asset_id": str(asset_id),
        "job_id": task.id,
        "status": "queued",
        "type": "source_scan",
        "repository_url": request.repository_url,
        "language": request.language,
        "message": "Source code scan queued. Check job status for results.",
    }


@router.post("/{asset_id}/scan-container", response_model=dict[str, Any])
async def scan_container_image(
    asset_id: uuid.UUID,
    request: ContainerScanRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Trigger a container image CBOM scan using CBOMkit-theia.

    Analyzes container images to discover:
    - Cryptographic libraries in runtime
    - OS packages and their versions
    - Layer composition
    - Known vulnerabilities
    - Supply chain metadata

    Returns immediately with task ID; actual scan runs asynchronously.
    """
    # Verify asset exists
    from app.db.models.asset import MasterAsset

    asset = await db.get(MasterAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")

    # Submit Celery task
    task = scan_container_image_task.apply_async(
        args=(
            str(asset_id),
            request.image_name,
            request.image_digest,
            None,
        ),
        queue="scanning",
        track_started=True,
    )

    return {
        "asset_id": str(asset_id),
        "job_id": task.id,
        "status": "queued",
        "type": "container_scan",
        "image_name": request.image_name,
        "message": "Container scan queued. Check job status for results.",
    }


@router.post("/{asset_id}/merge-cboms", response_model=dict[str, Any])
async def merge_cboms_with_confidence(
    asset_id: uuid.UUID,
    request: UnifiedCBOMRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Merge CBOM records from multiple discovery methods with confidence scoring.

    Combines:
    1. Network scans (TLS/HTTPS handshake analysis)
    2. Source code scans (static analysis via CBOMkit-hyperion)
    3. Container scans (binary/library analysis via CBOMkit-theia)

    Each algorithm gets a confidence_score [0.70-0.99+] based on how many
    discovery methods independently found it:
    - 1 source: 0.70 confidence
    - 2 sources: 0.795 confidence
    - 3 sources: 0.89+ confidence (near-certain)

    Returns immediately with task ID; merging runs asynchronously.
    """
    # Verify asset exists
    from app.db.models.asset import MasterAsset

    asset = await db.get(MasterAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")

    # Submit Celery task for CBOM merging and scoring
    task = merge_and_score_cboms_task.apply_async(
        args=(
            str(asset_id),
            request.include_network_scan,
            request.include_source_scan,
            request.include_container_scan,
        ),
        queue="scanning",
    )

    return {
        "asset_id": str(asset_id),
        "job_id": task.id,
        "status": "queued",
        "type": "cbom_merge",
        "sources_to_merge": {
            "network_scan": request.include_network_scan,
            "source_scan": request.include_source_scan,
            "container_scan": request.include_container_scan,
        },
        "message": "CBOM merge queued. Confidence scores will be computed.",
    }


@router.get("/{asset_id}/unified-cbom", response_model=dict[str, Any])
async def get_unified_cbom(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Retrieve the latest unified CBOM with confidence scores from persistent storage.

    Shows all cryptographic algorithms discovered across all sources,
    with confidence_score indicating how many methods found each algorithm.
    """
    from app.db.models.cbom import CBOMResult

    # Fetch latest persistent result
    stmt = (
        select(CBOMResult)
        .where(CBOMResult.asset_id == asset_id)
        .order_by(CBOMResult.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    cbom_res = result.scalar_one_or_none()

    if cbom_res:
        return cbom_res.unified_cbom

    # Fallback: Build unified CBOM on-the-fly if no persistent record exists
    return await cbomkit_bridge.merge_cboms_with_confidence(
        db,
        asset_id,
        include_network_scan=True,
        include_source_scan=True,
        include_container_scan=True,
    )


@router.get("/{asset_id}/source-scans", response_model=list[dict[str, Any]])
async def list_source_scans(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """
    List all source code scan results for an asset.
    """
    result = await db.execute(
        select(SourceScanResult)
        .where(SourceScanResult.asset_id == asset_id)
        .order_by(SourceScanResult.scan_timestamp.desc())
    )
    scans = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "asset_id": str(s.asset_id),
            "repository_url": s.repository_url,
            "repository_branch": s.repository_branch,
            "primary_language": s.primary_language.value if s.primary_language else None,
            "scan_status": s.scan_status,
            "algorithms_found": len(s.detected_algorithms or []),
            "dependencies_found": len(s.dependencies or []),
            "scan_timestamp": s.scan_timestamp.isoformat(),
            "duration_seconds": s.scan_duration_seconds,
        }
        for s in scans
    ]


@router.get("/{asset_id}/container-scans", response_model=list[dict[str, Any]])
async def list_container_scans(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """
    List all container image scan results for an asset.
    """
    result = await db.execute(
        select(ContainerScanResult)
        .where(ContainerScanResult.asset_id == asset_id)
        .order_by(ContainerScanResult.scan_timestamp.desc())
    )
    scans = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "asset_id": str(s.asset_id),
            "image_name": s.image_name,
            "image_digest": s.image_digest,
            "base_image": s.base_image_name,
            "os_distribution": s.os_distribution,
            "scan_status": s.scan_status,
            "crypto_algorithms_found": len(s.detected_cryptography or []),
            "packages_found": s.total_packages,
            "vulnerabilities_found": len(s.vulnerabilities or []),
            "scan_timestamp": s.scan_timestamp.isoformat(),
            "duration_seconds": s.scan_duration_seconds,
        }
        for s in scans
    ]


@router.get("/scans/{scan_id}/details", response_model=dict[str, Any])
async def get_scan_details(
    scan_id: uuid.UUID,
    scan_type: str = Query(..., description="Type: 'source' or 'container'"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Retrieve detailed results of a specific scan (source or container).
    """
    if scan_type == "source":
        scan = await db.get(SourceScanResult, scan_id)
        if not scan:
            raise HTTPException(status_code=404, detail="Source scan not found")

        return {
            "id": str(scan.id),
            "asset_id": str(scan.asset_id),
            "repository_url": scan.repository_url,
            "repository_branch": scan.repository_branch,
            "commit_hash": scan.commit_hash,
            "primary_language": scan.primary_language.value if scan.primary_language else None,
            "detected_languages": scan.detected_languages,
            "detected_algorithms": scan.detected_algorithms,
            "crypto_categories_found": scan.crypto_categories_found,
            "dependencies": scan.dependencies,
            "license_findings": scan.license_findings,
            "supply_chain_risks": scan.supply_chain_risks,
            "total_lines_of_code": scan.total_lines_of_code,
            "cryptographic_usage_density": scan.cryptographic_usage_density,
            "scan_status": scan.scan_status,
            "scan_timestamp": scan.scan_timestamp.isoformat(),
            "duration_seconds": scan.scan_duration_seconds,
            "error_message": scan.error_message,
        }

    elif scan_type == "container":
        scan = await db.get(ContainerScanResult, scan_id)
        if not scan:
            raise HTTPException(status_code=404, detail="Container scan not found")

        return {
            "id": str(scan.id),
            "asset_id": str(scan.asset_id),
            "image_name": scan.image_name,
            "image_digest": scan.image_digest,
            "image_size_bytes": scan.image_size_bytes,
            "registry": scan.registry,
            "base_image_name": scan.base_image_name,
            "os_distribution": scan.os_distribution,
            "os_packages": scan.os_packages,
            "detected_cryptography": scan.detected_cryptography,
            "crypto_categories": scan.crypto_categories,
            "packages": scan.packages,
            "total_packages": scan.total_packages,
            "vulnerabilities": scan.vulnerabilities,
            "layer_count": scan.layer_count,
            "layers_analysis": scan.layers_analysis,
            "scan_status": scan.scan_status,
            "scan_timestamp": scan.scan_timestamp.isoformat(),
            "duration_seconds": scan.scan_duration_seconds,
            "error_message": scan.error_message,
        }

    else:
        raise HTTPException(status_code=400, detail="scan_type must be 'source' or 'container'")
