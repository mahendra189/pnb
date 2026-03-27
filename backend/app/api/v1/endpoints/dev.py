"""
api/v1/endpoints/dev.py — Development and simulation utilities backed by live data.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.services.live_data import live_data_service

router = APIRouter(prefix="/dev", tags=["Dev/Simulation"])


@router.post("/simulate-scan", summary="Simulate a fresh scan and mutate live data")
async def simulate_scan() -> dict:
    return await live_data_service.simulate_scan()


@router.get("/forecast", summary="Get dynamic forecast data")
async def forecast() -> dict:
    return await live_data_service.get_forecast()
