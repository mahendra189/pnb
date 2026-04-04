"""
workers/tasks/cbomkit_scans.py — Celery tasks for CBOMkit source & container scanning.

Triggered alongside network scans to gather comprehensive cryptographic inventory.
"""

from __future__ import annotations

import asyncio
import uuid
from typing import Any

from celery import Task
from celery.utils.log import get_task_logger

from app.db.base import AsyncSessionLocal
from app.db.models.source_scan import SourceLanguage
from app.services.cbomkit_bridge import cbomkit_bridge
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


def _run_async(coro: Any) -> Any:
    """Helper to run async code in Celery tasks."""
    return asyncio.run(coro)


@celery_app.task(
    name="app.workers.tasks.cbomkit_scans.scan_source_repository",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="scanning",
    acks_late=True,
)
def scan_source_repository_task(
    self: Task,
    asset_id: str,
    repository_url: str,
    repository_branch: str = "main",
    language: str = "python",
    scan_task_id: str | None = None,
) -> dict[str, Any]:
    """
    Celery task to scan a source code repository using CBOMkit-hyperion.

    Args:
        asset_id: UUID of the asset
        repository_url: Git URL or local path to repository
        repository_branch: Branch to scan
        language: Primary programming language
        scan_task_id: Optional scan task UUID

    Returns:
        Dictionary with scan result summary
    """

    async def _scan():
        async with AsyncSessionLocal() as db:
            try:
                source_lang = SourceLanguage(language)
            except ValueError:
                source_lang = SourceLanguage.OTHER

            try:
                result = await cbomkit_bridge.scan_source_repository(
                    db,
                    uuid.UUID(asset_id),
                    repository_url,
                    repository_branch=repository_branch,
                    language=source_lang,
                    celery_task_id=self.request.id,
                )
                await db.commit()

                return {
                    "status": result.scan_status,
                    "scan_id": str(result.id),
                    "repository_url": repository_url,
                    "algorithms_found": len(result.detected_algorithms or []),
                    "dependencies_found": len(result.dependencies or []),
                    "duration_seconds": result.scan_duration_seconds,
                }
            except Exception as exc:
                logger.exception(
                    "source_scan_failed",
                    asset_id=asset_id,
                    repository_url=repository_url,
                    error=str(exc),
                )
                raise

    return _run_async(_scan())


@celery_app.task(
    name="app.workers.tasks.cbomkit_scans.scan_container_image",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="scanning",
    acks_late=True,
)
def scan_container_image_task(
    self: Task,
    asset_id: str,
    image_name: str,
    image_digest: str | None = None,
    scan_task_id: str | None = None,
) -> dict[str, Any]:
    """
    Celery task to scan a container image using CBOMkit-theia.

    Args:
        asset_id: UUID of the asset
        image_name: Container image name or reference
        image_digest: Optional pre-computed image digest
        scan_task_id: Optional scan task UUID

    Returns:
        Dictionary with scan result summary
    """

    async def _scan():
        async with AsyncSessionLocal() as db:
            try:
                result = await cbomkit_bridge.scan_container_image(
                    db,
                    uuid.UUID(asset_id),
                    image_name,
                    image_digest=image_digest,
                    celery_task_id=self.request.id,
                )
                await db.commit()

                return {
                    "status": result.scan_status,
                    "scan_id": str(result.id),
                    "image_name": image_name,
                    "image_digest": result.image_digest,
                    "crypto_algorithms_found": len(result.detected_cryptography or []),
                    "packages_found": result.total_packages or 0,
                    "vulnerabilities_found": len(result.vulnerabilities or []),
                    "duration_seconds": result.scan_duration_seconds,
                }
            except Exception as exc:
                logger.exception(
                    "container_scan_failed",
                    asset_id=asset_id,
                    image_name=image_name,
                    error=str(exc),
                )
                raise

    return _run_async(_scan())


@celery_app.task(
    name="app.workers.tasks.cbomkit_scans.merge_and_score_cboms",
    bind=True,
    queue="scanning",
    acks_late=True,
)
def merge_and_score_cboms_task(
    self: Task,
    asset_id: str,
    include_network_scan: bool = True,
    include_source_scan: bool = True,
    include_container_scan: bool = True,
) -> dict[str, Any]:
    """
    Celery task to merge CBOMs from multiple sources with confidence scoring.

    Args:
        asset_id: UUID of the asset
        include_network_scan: Include TLS/network scan results
        include_source_scan: Include source code scan results
        include_container_scan: Include container image scan results

    Returns:
        Dictionary with unified CBOM summary
    """

    async def _merge():
        async with AsyncSessionLocal() as db:
            try:
                # Merge CBOMs with confidence scoring
                unified_cbom = await cbomkit_bridge.merge_cboms_with_confidence(
                    db,
                    uuid.UUID(asset_id),
                    include_network_scan=include_network_scan,
                    include_source_scan=include_source_scan,
                    include_container_scan=include_container_scan,
                )

                # Create persistent CBOM records
                await cbomkit_bridge.create_confident_cbom_records(
                    db,
                    uuid.UUID(asset_id),
                    unified_cbom,
                )
                await db.commit()

                return {
                    "asset_id": asset_id,
                    "unified_algorithms": len(unified_cbom.get("algorithms", [])),
                    "avg_confidence": (
                        sum(a["confidence_score"] for a in unified_cbom.get("algorithms", []))
                        / max(len(unified_cbom.get("algorithms", [])), 1)
                    ),
                    "sources_merged": {
                        "network": include_network_scan,
                        "source": include_source_scan,
                        "container": include_container_scan,
                    },
                }
            except Exception as exc:
                logger.exception(
                    "cbom_merge_failed",
                    asset_id=asset_id,
                    error=str(exc),
                )
                raise

    return _run_async(_merge())
