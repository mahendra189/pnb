"""
services/cbom_service.py — Cryptography Bill of Materials (CBOM) derivation logic.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.asset import MasterAsset
from app.db.models.cbom import CBOMRecord, CryptoCategory, PQCStatus
from app.db.models.tls_scan import TLSScanResult

class CBOMService:
    """
    Service for generating and managing CBOM records.
    Derives algorithm-level inventory from scanner outputs (SSLyze, etc.).
    """

    @staticmethod
    async def generate_from_tls_scan(
        db: AsyncSession,
        asset_id: uuid.UUID,
        scan_data: dict[str, Any],
        detection_sources: list[dict[str, Any]] | None = None,
    ) -> int:
        """
        Derive CBOM records (Algorithm, Key Exchange, Cipher) from scan data.
        
        Args:
            db: Database session
            asset_id: Asset UUID
            scan_data: Dict with 'tls_version', 'cipher', 'key_exchange', 'pqc_status'
            detection_sources: Optional list of detection source info
        """
        new_records: list[CBOMRecord] = []
        current_version = (
            await db.execute(
                select(func.max(CBOMRecord.version)).where(CBOMRecord.asset_id == asset_id)
            )
        ).scalar_one()
        next_version = (current_version or 0) + 1
        
        # Extract values from scan_data dict
        tls_version = scan_data.get("tls_version") if isinstance(scan_data, dict) else scan_data.tls_version
        cipher = scan_data.get("cipher") if isinstance(scan_data, dict) else scan_data.cipher
        key_exchange = scan_data.get("key_exchange") if isinstance(scan_data, dict) else scan_data.key_exchange
        pqc_status_val = scan_data.get("pqc_status") if isinstance(scan_data, dict) else scan_data.pqc_status
        
        # Get scan ID if available (for model-based calls)
        scan_id = scan_data.id if hasattr(scan_data, 'id') else None
        
        # 1. Protocol Version
        if tls_version:
            proto_record = CBOMRecord(
                asset_id=asset_id,
                scan_id=scan_id,
                version=next_version,
                algorithm_name=tls_version,
                category=CryptoCategory.PROTOCOL,
                pqc_status=PQCStatus.CLASSICAL if tls_version != "TLSv1.3" else PQCStatus.HYBRID,
                usage_context="tls_handshake_protocol",
                detection_sources=detection_sources or [{"tool": "sslyze", "method": "protocol_discovery"}]
            )
            new_records.append(proto_record)

        # 2. Cipher Suites (derive symmetric and key exchange)
        if cipher:
            for suite_name in [cipher]:
                pqc_safe = pqc_status_val in {PQCStatus.SAFE.value, PQCStatus.HYBRID.value}
                cipher_record = CBOMRecord(
                    asset_id=asset_id,
                    scan_id=scan_id,
                    version=next_version,
                    algorithm_name=suite_name,
                    category=CryptoCategory.SYMMETRIC_CIPHER,
                    pqc_status=PQCStatus.SAFE if pqc_safe else PQCStatus.CLASSICAL,
                    usage_context="tls_cipher_suite",
                    detection_sources=detection_sources or [{"tool": "sslyze", "method": "handshake_negotiation"}],
                )
                new_records.append(cipher_record)

        if key_exchange:
            new_records.append(
                CBOMRecord(
                    asset_id=asset_id,
                    scan_id=scan_id,
                    version=next_version,
                    algorithm_name=key_exchange,
                    category=CryptoCategory.KEY_EXCHANGE,
                    pqc_status=PQCStatus(pqc_status_val or PQCStatus.UNKNOWN.value),
                    usage_context="tls_key_exchange",
                    detection_sources=detection_sources or [{"tool": "sslyze", "method": "key_exchange_analysis"}],
                )
            )

        # Bulk add
        for rec in new_records:
            db.add(rec)
        
        await db.flush()
        return next_version


    @staticmethod
    async def get_cbom_for_asset(
        db: AsyncSession,
        asset_id: uuid.UUID
    ) -> list[CBOMRecord]:
        """Retrieve the current CBOM for an asset."""
        result = await db.execute(select(CBOMRecord).where(CBOMRecord.asset_id == asset_id))
        return list(result.scalars().all())
