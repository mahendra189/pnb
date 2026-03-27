from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.config import get_settings
from app.services.live_data import live_data_service

settings = get_settings()

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview", summary="Get live dashboard snapshot")
async def dashboard_overview() -> dict:
    return await live_data_service.get_dashboard_snapshot()


@router.get("/assets", summary="Get live asset inventory for dashboard pages")
async def dashboard_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
) -> dict:
    assets, total, source = await live_data_service.list_assets(page=page, page_size=page_size)
    return {
        "source": source,
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [live_data_service.serialize_asset(asset) for asset in assets],
    }


@router.get("/scan-results", summary="Get live scan results")
async def dashboard_scan_results() -> dict:
    return await live_data_service.get_scan_results()


@router.get("/forecast", summary="Get dynamic forecast derived from live asset risk")
async def dashboard_forecast() -> dict:
    return await live_data_service.get_forecast()


@router.websocket("/ws")
async def dashboard_ws(ws: WebSocket) -> None:
    await ws.accept()
    try:
        while True:
            snapshot = await live_data_service.get_dashboard_snapshot()
            await ws.send_json(
                {
                    "type": "snapshot",
                    "timestamp": datetime.now(UTC).isoformat(),
                    "data": snapshot,
                }
            )
            try:
                message = await asyncio.wait_for(
                    ws.receive_text(),
                    timeout=settings.DASHBOARD_REFRESH_SECONDS,
                )
                if message.strip().lower() == "ping":
                    await ws.send_json(
                        {
                            "type": "pong",
                            "timestamp": datetime.now(UTC).isoformat(),
                        }
                    )
            except TimeoutError:
                continue
    except WebSocketDisconnect:
        return
