"""
api/v1/endpoints/dev.py — Development and Simulation utilities.
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.workers.tasks.scans import run_tls_scan
from app.workers.tasks.discovery import ingest_seed_domain

router = APIRouter(tags=["Dev/Simulation"])

@router.post("/simulate-scan")
async def simulate_scan(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Simulate a scheduled global scan.
    Triggers discovery and TLS scanning for mock targets.
    """
    targets = [
        "api.prod.gateway.com",
        "legacy.vault-01.internal",
        "kyber-demo.pnc.bank",
    ]
    
    # In a real app we would query the DB for assets, but here we simulate a "Seed" discovery first
    for target in targets:
        # Simulate discovery
        background_tasks.add_task(ingest_seed_domain, target)
        
    return {"status": "Simulation triggered", "targets": targets}
