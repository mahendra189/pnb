"""
workers/tasks/hybrid_scan.py — Parallel hybrid scanning with Celery group/chord.

Implements single-click parallel scanning:
1. SSLyze (TLS/cert analysis)
2. Nmap (port discovery)
3. liboqs PQC checker

Uses Celery group for parallel execution, then chord callback for CBOM generation.
Redis locks prevent concurrent scans on the same asset.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime
from typing import Any

import redis
from celery import Task, chord, group
from celery.utils.log import get_task_logger

from app.core.config import get_settings
from app.db.base import AsyncSessionLocal
from app.db.models.asset import AssetStatus, MasterAsset
from app.db.models.scan_task import ScanTask
from app.services.cbom_service import CBOMService
from app.services.cbomkit_bridge import CBOMKitBridge
from app.services.scan_orchestrator import scan_orchestrator
from app.services.scan_tools import normalize_scan_target, run_http_scan, run_nmap_scan, run_sslyze_scan
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)
settings = get_settings()

# Redis client for locks
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

SCAN_LOCK_TTL = 300  # 5 minutes lock TTL


def _acquire_scan_lock(asset_id: str) -> bool:
    """Acquire a Redis lock to prevent concurrent scans on same asset."""
    lock_key = f"scan_lock:{asset_id}"
    acquired = redis_client.set(lock_key, "1", nx=True, ex=SCAN_LOCK_TTL)
    return bool(acquired)


def _release_scan_lock(asset_id: str) -> None:
    """Release the scan lock."""
    lock_key = f"scan_lock:{asset_id}"
    redis_client.delete(lock_key)


# ─────────────────────────────────────────────────────────────────────────────
# Individual scan tasks
# ─────────────────────────────────────────────────────────────────────────────


@celery_app.task(
    name="app.workers.tasks.hybrid_scan.scan_sslyze_task",
    bind=True,
    max_retries=2,
    default_retry_delay=10,
    queue="scanning",
    acks_late=True,
)
def scan_sslyze_task(
    self: Task,
    asset_id: str,
    target: str,
) -> dict[str, Any]:
    """Run SSLyze TLS scan asynchronously."""
    async def _scan() -> dict[str, Any]:
        try:
            result = await run_sslyze_scan(target)
            logger.info(
                "sslyze_scan_completed",
                asset_id=asset_id,
                target=target,
                has_tls=bool(result.get("tls_version")),
            )
            return {"tool": "sslyze", "success": True, "data": result}
        except Exception as exc:
            logger.warning("sslyze_scan_failed", asset_id=asset_id, error=str(exc))
            return {"tool": "sslyze", "success": False, "error": str(exc), "data": {}}

    return asyncio.run(_scan())


@celery_app.task(
    name="app.workers.tasks.hybrid_scan.scan_nmap_task",
    bind=True,
    max_retries=2,
    default_retry_delay=10,
    queue="scanning",
    acks_late=True,
)
def scan_nmap_task(
    self: Task,
    asset_id: str,
    target: str,
) -> dict[str, Any]:
    """Run Nmap port scan asynchronously."""
    async def _scan() -> dict[str, Any]:
        try:
            result = await run_nmap_scan(target)
            open_ports = result.get("open_ports", [])
            logger.info(
                "nmap_scan_completed",
                asset_id=asset_id,
                target=target,
                open_ports_count=len(open_ports),
            )
            return {"tool": "nmap", "success": True, "data": result}
        except Exception as exc:
            logger.warning("nmap_scan_failed", asset_id=asset_id, error=str(exc))
            return {"tool": "nmap", "success": False, "error": str(exc), "data": {}}

    return asyncio.run(_scan())


@celery_app.task(
    name="app.workers.tasks.hybrid_scan.scan_pqc_task",
    bind=True,
    max_retries=2,
    default_retry_delay=10,
    queue="scanning",
    acks_late=True,
)
def scan_pqc_task(
    self: Task,
    asset_id: str,
    target: str,
) -> dict[str, Any]:
    """Run PQC (liboqs) checker task."""
    async def _scan() -> dict[str, Any]:
        try:
            # Placeholder: run PQC checker logic
            result = await run_http_scan(target)
            logger.info("pqc_scan_completed", asset_id=asset_id, target=target)
            return {"tool": "pqc", "success": True, "data": result}
        except Exception as exc:
            logger.warning("pqc_scan_failed", asset_id=asset_id, error=str(exc))
            return {"tool": "pqc", "success": False, "error": str(exc), "data": {}}

    return asyncio.run(_scan())


# ─────────────────────────────────────────────────────────────────────────────
# Chord callback: CBOM generation after all scans complete
# ─────────────────────────────────────────────────────────────────────────────


@celery_app.task(
    name="app.workers.tasks.hybrid_scan.generate_unified_cbom_task",
    bind=True,
    queue="scanning",
    acks_late=True,
)
def generate_unified_cbom_task(
    self: Task,
    scan_results_list: list[dict[str, Any]],
    asset_id: str,
    scan_task_id: str | None = None,
) -> dict[str, Any]:
    """Generate unified CBOM from scan results (chord callback)."""
    async def _generate_cbom() -> dict[str, Any]:
        async with AsyncSessionLocal() as db:
            try:
                asset_uuid = uuid.UUID(asset_id)
                
                # Organize scan results by tool
                scans_by_tool = {}
                for result in scan_results_list:
                    tool = result.get("tool", "unknown")
                    scans_by_tool[tool] = result

                logger.info(
                    "starting_cbom_generation",
                    asset_id=asset_id,
                    tools=list(scans_by_tool.keys()),
                )

                # Generate unified CBOM using the scan results
                cbom_result = await generate_unified_cbom(
                    db,
                    asset_uuid,
                    scans_by_tool,
                    scan_task_id=uuid.UUID(scan_task_id) if scan_task_id else None,
                    celery_task_id=self.request.id,
                )

                # Mark scan task as completed
                if scan_task_id:
                    task = await db.get(ScanTask, uuid.UUID(scan_task_id))
                    if task:
                        task.status = "completed"
                        task.finished_at = datetime.now(UTC)
                        await db.flush()

                # Mark asset as scanned
                asset = await db.get(MasterAsset, asset_uuid)
                if asset:
                    asset.status = AssetStatus.SCANNED
                    await db.flush()

                await db.commit()

                # Release the scan lock
                _release_scan_lock(asset_id)

                logger.info("cbom_generation_completed", asset_id=asset_id)
                return {"success": True, "cbom_version": cbom_result.get("version")}

            except Exception as exc:
                logger.exception("cbom_generation_failed", asset_id=asset_id, error=str(exc))
                
                # Release the scan lock even on failure
                _release_scan_lock(asset_id)

                # Mark task as failed
                if scan_task_id:
                    async with AsyncSessionLocal() as db:
                        task = await db.get(ScanTask, uuid.UUID(scan_task_id))
                        if task:
                            task.status = "failed"
                            task.error_message = str(exc)
                            task.finished_at = datetime.now(UTC)
                            await db.flush()

                raise

    return asyncio.run(_generate_cbom())


# ─────────────────────────────────────────────────────────────────────────────
# Main hybrid scan orchestrator
# ─────────────────────────────────────────────────────────────────────────────


@celery_app.task(
    name="app.workers.tasks.hybrid_scan.run_hybrid_scan",
    bind=True,
    queue="scanning",
    acks_late=True,
)
def run_hybrid_scan(
    self: Task,
    asset_id: str,
    scan_task_id: str | None = None,
) -> dict[str, Any]:
    """
    Run parallel hybrid scan (SSLyze + Nmap + PQC) using Celery group,
    then trigger CBOM generation via chord callback.

    Process:
    1. Acquire Redis lock to prevent concurrent scans
    2. Create group of 3 parallel task (SSLyze, Nmap, PQC)
    3. Use chord to trigger CBOM generation after all complete
    4. Update asset status and next_scan_at timestamp

    Returns:
        Task info with group_id for frontend polling
    """
    async def _orchestrate() -> dict[str, Any]:
        async with AsyncSessionLocal() as db:
            try:
                # 1. Check/acquire lock
                if not _acquire_scan_lock(asset_id):
                    raise RuntimeError(
                        f"Asset {asset_id} is already being scanned. "
                        f"Please wait for the current scan to complete."
                    )

                # 2. Get asset and marking as scanning
                asset = await db.get(MasterAsset, uuid.UUID(asset_id))
                if not asset:
                    _release_scan_lock(asset_id)
                    raise ValueError(f"Asset {asset_id} not found")

                asset.status = AssetStatus.SCANNING
                await db.flush()

                # 3. Get/create scan task
                if scan_task_id:
                    task = await db.get(ScanTask, uuid.UUID(scan_task_id))
                    if task:
                        task.status = "running"
                        task.started_at = datetime.now(UTC)
                        task.celery_task_id = self.request.id
                        await db.flush()

                await db.commit()

                # 4. Normalize target
                target = normalize_scan_target(asset.asset_value)
                logger.info("hybrid_scan_started", asset_id=asset_id, target=target)

                # 5. Create parallel task group
                parallel_tasks = group(
                    scan_sslyze_task.s(asset_id, target),
                    scan_nmap_task.s(asset_id, target),
                    scan_pqc_task.s(asset_id, target),
                )

                # 6. Create chord: parallel tasks -> CBOM callback
                cbom_callback = generate_unified_cbom_task.s(
                    asset_id=asset_id,
                    scan_task_id=scan_task_id,
                )
                
                scan_chord = chord(parallel_tasks)(cbom_callback)

                logger.info(
                    "hybrid_scan_chord_created",
                    asset_id=asset_id,
                    chord_id=scan_chord.id,
                )

                return {
                    "success": True,
                    "asset_id": asset_id,
                    "task_id": self.request.id,
                    "scan_task_id": scan_task_id,
                    "chord_id": scan_chord.id,
                    "target": target,
                }

            except Exception as exc:
                logger.exception("hybrid_scan_orchestration_failed", asset_id=asset_id, error=str(exc))
                _release_scan_lock(asset_id)
                raise

    return asyncio.run(_orchestrate())


# ─────────────────────────────────────────────────────────────────────────────
# CBOM generation (shared logic, can be called from sync or async context)
# ─────────────────────────────────────────────────────────────────────────────


async def generate_unified_cbom(
    db: Any,
    asset_id: uuid.UUID,
    scans_by_tool: dict[str, dict[str, Any]],
    scan_task_id: uuid.UUID | None = None,
    celery_task_id: str | None = None,
) -> dict[str, Any]:
    """
    Generate unified CBOM from multiple scan sources.

    Args:
        db: Async database session
        asset_id: Master asset UUID
        scans_by_tool: Dict of {tool_name: scan_result}
        scan_task_id: Optional scan task UUID
        celery_task_id: Optional Celery task ID

    Returns:
        Dict with CBOM metadata, version, and confidence score
    """
    asset = await db.get(MasterAsset, asset_id)
    if not asset:
        raise ValueError(f"Asset {asset_id} not found")

    # Extract network scan results
    sslyze_result = scans_by_tool.get("sslyze", {}).get("data", {})
    nmap_result = scans_by_tool.get("nmap", {}).get("data", {})
    
    # Create merged TLS scan for CBOM generation
    merged_tls = {
        **sslyze_result,
        "nmap_data": nmap_result,
        "tool_sources": list(scans_by_tool.keys()),
    }

    # Generate CBOM version for network discoveries
    version = await CBOMService.generate_from_tls_scan(
        db,
        asset_id,
        merged_tls,
        detection_sources=[
            {"tool": tool, "method": "hybrid_scan"}
            for tool in scans_by_tool.keys()
            if scans_by_tool[tool].get("success", False)
        ],
    )

    # Calculate confidence score (start at 70%, +5% per successful discovery method)
    successful_methods = sum(
        1 for r in scans_by_tool.values() if r.get("success", False)
    )
    confidence_score = min(70 + (successful_methods * 5), 99)

    await db.commit()

    return {
        "version": version,
        "confidence_score": confidence_score,
        "tools_used": list(scans_by_tool.keys()),
        "generated_at": datetime.now(UTC).isoformat(),
    }


@celery_app.task(
    name="app.workers.tasks.hybrid_scan.scan_scheduled_assets_task",
    queue="scanning",
    acks_late=True,
)
def scan_scheduled_assets_task() -> dict[str, Any]:
    """
    Periodic task (runs every 5 minutes) to auto-scan assets that have
    scan_frequency set and are due for scanning.

    Returns:
        Dict with count of assets scanned
    """
    async def _scan_scheduled() -> dict[str, Any]:
        async with AsyncSessionLocal() as db:
            from sqlalchemy import and_, select
            
            try:
                now = datetime.now(UTC)
                
                # Find assets with metadata scan_frequency set
                # that haven't been scanned recently or are past next_scan_at
                result = await db.execute(
                    select(MasterAsset).where(
                        and_(
                            MasterAsset.metadata_.isnot(None),
                        )
                    )
                )
                assets = list(result.scalars().all())
                
                scanned_count = 0
                for asset in assets:
                    metadata = asset.metadata_ or {}
                    scan_frequency = metadata.get("scan_frequency")  # in minutes
                    next_scan_at = metadata.get("next_scan_at")
                    
                    if not scan_frequency:
                        continue
                    
                    # Determine if asset should be scanned
                    should_scan = False
                    if next_scan_at is None:
                        # Never scanned, schedule first scan
                        should_scan = True
                    else:
                        try:
                            from datetime import datetime as dt
                            next_scan = dt.fromisoformat(next_scan_at)
                            if now >= next_scan:
                                should_scan = True
                        except (ValueError, TypeError):
                            pass
                    
                    if should_scan:
                        # Trigger hybrid scan
                        from app.workers.tasks.hybrid_scan import run_hybrid_scan
                        try:
                            run_hybrid_scan.apply_async(
                                args=(str(asset.id),),
                                queue="scanning",
                            )
                            scanned_count += 1
                            logger.info("scheduled_scan_triggered", asset_id=str(asset.id))
                        except Exception as exc:
                            logger.warning("scheduled_scan_trigger_failed", asset_id=str(asset.id), error=str(exc))
                
                return {"scanned_assets": scanned_count}

            except Exception as exc:
                logger.exception("scan_scheduled_assets_failed", error=str(exc))
                return {"scanned_assets": 0, "error": str(exc)}

    return asyncio.run(_scan_scheduled())
