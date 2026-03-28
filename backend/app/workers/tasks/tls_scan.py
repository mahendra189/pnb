from __future__ import annotations

import asyncio
import uuid
from typing import Any

from celery import Task
from celery.utils.log import get_task_logger

from app.db.base import AsyncSessionLocal
from app.services.scan_orchestrator import scan_orchestrator
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


def _run_async(coro: Any) -> Any:
    return asyncio.run(coro)


@celery_app.task(
    name="app.workers.tasks.tls_scan.full_scan_pipeline",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="scanning",
    acks_late=True,
)
def full_scan_pipeline_task(
    self: Task,
    asset_id: str,
    scan_task_id: str | None = None,
) -> dict[str, Any]:
    async def _scan() -> dict[str, Any]:
        async with AsyncSessionLocal() as db:
            try:
                return await scan_orchestrator.full_scan_pipeline(
                    db,
                    uuid.UUID(asset_id),
                    scan_task_id=uuid.UUID(scan_task_id) if scan_task_id else None,
                    celery_task_id=self.request.id,
                )
            except Exception as exc:
                await scan_orchestrator.mark_task_failed(
                    db,
                    uuid.UUID(asset_id),
                    scan_task_id=uuid.UUID(scan_task_id) if scan_task_id else None,
                    error_message=str(exc),
                )
                logger.exception("full_scan_pipeline_failed", asset_id=asset_id, error=str(exc))
                raise self.retry(exc=exc)

    return _run_async(_scan())
