from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.asset import AssetStatus, MasterAsset
from app.db.models.asset_history import AssetChange, AssetScanSummary, AssetStateHistory
from app.db.models.cbom import PQCStatus
from app.db.models.scan_task import ScanTask
from app.db.models.tls_scan import TLSScanResult
from app.services.cbom_service import CBOMService
from app.services.scan_tools import normalize_scan_target, run_http_scan, run_nmap_scan, run_sslyze_scan


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _pqc_status(key_exchange: str | None, cipher: str | None) -> str:
    combined = " ".join(part for part in [key_exchange, cipher] if part).lower()
    if not combined:
        return PQCStatus.UNKNOWN.value
    if any(token in combined for token in ("kyber", "ml-kem", "dilithium", "falcon")):
        return PQCStatus.SAFE.value
    if "hybrid" in combined:
        return PQCStatus.HYBRID.value
    if any(token in combined for token in ("rsa", "ecdhe", "ecdh", "x25519")):
        return PQCStatus.CLASSICAL.value
    return PQCStatus.UNKNOWN.value


def _calculate_risk_score(
    tls_version: str | None,
    cipher: str | None,
    pqc_status: str,
    certificate_expiry: datetime | None,
    vulnerabilities: list[dict[str, Any]] | list[Any] | None,
    http_scan: dict[str, Any],
) -> float:
    score = 1.0
    tls_value = (tls_version or "").lower()
    if "1.0" in tls_value or "1.1" in tls_value or "ssl" in tls_value:
        score += 3.5
    elif "1.2" in tls_value:
        score += 1.6
    elif "1.3" in tls_value:
        score += 0.5
    else:
        score += 2.0

    cipher_value = (cipher or "").lower()
    if any(token in cipher_value for token in ("3des", "rc4", "_rsa_", "cbc")):
        score += 2.0
    elif cipher_value:
        score += 0.5

    if pqc_status == PQCStatus.CLASSICAL.value:
        score += 2.5
    elif pqc_status == PQCStatus.HYBRID.value:
        score += 1.0
    elif pqc_status == PQCStatus.SAFE.value:
        score += 0.2

    if certificate_expiry:
        days_remaining = (certificate_expiry - _utcnow()).days
        if days_remaining < 0:
            score += 3.0
        elif days_remaining <= 30:
            score += 1.5

    score += min(len(vulnerabilities or []) * 0.4, 2.0)

    security_headers = (http_scan or {}).get("security_headers") or {}
    missing_headers = sum(1 for value in security_headers.values() if not value)
    score += min(missing_headers * 0.2, 0.8)

    return round(min(score, 10.0), 2)


def _change_type(field_name: str, old_value: str | None, new_value: str | None) -> str:
    if field_name == "tls_version":
        rank = {"sslv3": 0, "tlsv1.0": 1, "tlsv1.1": 2, "tlsv1.2": 3, "tlsv1.3": 4}
        old_rank = rank.get((old_value or "").lower(), -1)
        new_rank = rank.get((new_value or "").lower(), -1)
        if new_rank > old_rank:
            return "upgrade"
        if new_rank < old_rank:
            return "downgrade"
    if field_name == "pqc_status":
        rank = {
            PQCStatus.DEPRECATED.value: 0,
            PQCStatus.CLASSICAL.value: 1,
            PQCStatus.UNKNOWN.value: 2,
            PQCStatus.HYBRID.value: 3,
            PQCStatus.SAFE.value: 4,
        }
        old_rank = rank.get(old_value or "", -1)
        new_rank = rank.get(new_value or "", -1)
        if new_rank > old_rank:
            return "upgrade"
        if new_rank < old_rank:
            return "downgrade"
    if field_name == "risk_score":
        try:
            if old_value is not None and new_value is not None and float(new_value) > float(old_value):
                return "downgrade"
            if old_value is not None and new_value is not None and float(new_value) < float(old_value):
                return "upgrade"
        except ValueError:
            pass
    return "modified"


def _stringify(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


class ScanOrchestrator:
    async def full_scan_pipeline(
        self,
        db: AsyncSession,
        asset_id: uuid.UUID,
        *,
        scan_task_id: uuid.UUID | None = None,
        celery_task_id: str | None = None,
    ) -> dict[str, Any]:
        asset = await db.get(MasterAsset, asset_id)
        if asset is None:
            raise ValueError(f"Asset {asset_id} not found")

        task: ScanTask | None = await db.get(ScanTask, scan_task_id) if scan_task_id else None
        now = _utcnow()
        asset.status = AssetStatus.SCANNING
        if task:
            task.status = "running"
            task.started_at = now
            task.celery_task_id = celery_task_id or task.celery_task_id
        await db.flush()

        target = normalize_scan_target(asset.asset_value)
        started = datetime.now(UTC)
        nmap_result, sslyze_result, http_result = await asyncio.gather(
            run_nmap_scan(target),
            run_sslyze_scan(target),
            run_http_scan(target),
        )

        previous_state = (
            await db.execute(
                select(AssetStateHistory)
                .where(AssetStateHistory.asset_id == asset.id)
                .order_by(desc(AssetStateHistory.recorded_at))
                .limit(1)
            )
        ).scalar_one_or_none()

        pqc_status = _pqc_status(sslyze_result.get("key_exchange"), sslyze_result.get("cipher"))
        risk_score = _calculate_risk_score(
            sslyze_result.get("tls_version"),
            sslyze_result.get("cipher"),
            pqc_status,
            sslyze_result.get("certificate_expiry"),
            sslyze_result.get("vulnerabilities"),
            http_result,
        )

        scan_result = TLSScanResult(
            asset_id=asset.id,
            scan_job_id=uuid.UUID(celery_task_id) if celery_task_id and len(celery_task_id) == 36 else None,
            host=target,
            port=443,
            scan_timestamp=now,
            tls_version=sslyze_result.get("tls_version"),
            cipher=sslyze_result.get("cipher"),
            key_exchange=sslyze_result.get("key_exchange"),
            certificate_issuer=sslyze_result.get("certificate_issuer"),
            certificate_expiry=sslyze_result.get("certificate_expiry"),
            vulnerabilities=sslyze_result.get("vulnerabilities"),
            raw_data={
                "nmap": nmap_result,
                "sslyze": {
                    **sslyze_result,
                    "certificate_expiry": _stringify(sslyze_result.get("certificate_expiry")),
                },
                "http": http_result,
            },
            http_headers=http_result.get("headers"),
            open_ports=nmap_result.get("open_ports"),
            pqc_status=pqc_status,
            risk_score=risk_score,
            supports_pqc_kem=pqc_status in {PQCStatus.SAFE.value, PQCStatus.HYBRID.value},
            scan_duration_ms=int((datetime.now(UTC) - started).total_seconds() * 1000),
        )
        db.add(scan_result)
        await db.flush()

        changes: list[AssetChange] = []
        comparisons = {
            "tls_version": (previous_state.tls_version if previous_state else None, scan_result.tls_version),
            "cipher": (previous_state.cipher if previous_state else None, scan_result.cipher),
            "certificate_issuer": (previous_state.certificate_issuer if previous_state else None, scan_result.certificate_issuer),
            "pqc_status": (previous_state.pqc_status if previous_state else None, pqc_status),
            "risk_score": (_stringify(previous_state.risk_score) if previous_state else None, _stringify(risk_score)),
        }
        for field_name, (old_value, new_value) in comparisons.items():
            if old_value != new_value and old_value is not None:
                change = AssetChange(
                    asset_id=asset.id,
                    field_name=field_name,
                    old_value=_stringify(old_value),
                    new_value=_stringify(new_value),
                    change_type=_change_type(field_name, _stringify(old_value), _stringify(new_value)),
                    detected_at=now,
                )
                db.add(change)
                changes.append(change)

        history_entry = AssetStateHistory(
            asset_id=asset.id,
            scan_id=scan_result.id,
            tls_version=scan_result.tls_version,
            cipher=scan_result.cipher,
            certificate_issuer=scan_result.certificate_issuer,
            pqc_status=pqc_status,
            risk_score=risk_score,
            recorded_at=now,
        )
        db.add(history_entry)

        await self._upsert_scan_summary(
            db,
            asset.id,
            scan_date=now.date(),
            tls_version=scan_result.tls_version,
            pqc_status=pqc_status,
            risk_score=risk_score,
            change_detected=bool(changes),
        )

        cbom_version = await CBOMService.generate_from_tls_scan(db, scan_result)

        asset.risk_score = risk_score
        asset.last_scanned_at = now
        asset.status = AssetStatus.SCANNED
        asset.metadata_ = {
            **(asset.metadata_ or {}),
            "tls_version": scan_result.tls_version,
            "cipher": scan_result.cipher,
            "pqc_status": pqc_status,
            "open_ports": nmap_result.get("open_ports", []),
            "http_headers": http_result.get("headers", {}),
            "last_scan_id": str(scan_result.id),
        }

        if task:
            task.status = "completed"
            task.finished_at = now

        await db.commit()

        return {
            "asset_id": str(asset.id),
            "scan_id": str(scan_result.id),
            "scan_task_id": str(task.id) if task else None,
            "status": "completed",
            "tls_version": scan_result.tls_version,
            "cipher": scan_result.cipher,
            "pqc_status": pqc_status,
            "risk_score": risk_score,
            "change_detected": bool(changes),
            "changes": [
                {
                    "field_name": change.field_name,
                    "old_value": change.old_value,
                    "new_value": change.new_value,
                    "change_type": change.change_type,
                }
                for change in changes
            ],
            "cbom_version": cbom_version,
            "open_ports": nmap_result.get("open_ports", []),
            "http_headers": http_result.get("headers", {}),
            "recorded_at": now.isoformat(),
            "event": {
                "type": "scan_completed",
                "asset_id": str(asset.id),
                "scan_id": str(scan_result.id),
                "risk_score": risk_score,
                "tls_version": scan_result.tls_version,
                "cipher": scan_result.cipher,
                "pqc_status": pqc_status,
                "change_detected": bool(changes),
                "recorded_at": now.isoformat(),
            },
        }

    async def mark_task_failed(
        self,
        db: AsyncSession,
        asset_id: uuid.UUID,
        *,
        scan_task_id: uuid.UUID | None,
        error_message: str,
    ) -> None:
        asset = await db.get(MasterAsset, asset_id)
        if asset:
            asset.status = AssetStatus.FAILED
        if scan_task_id:
            task = await db.get(ScanTask, scan_task_id)
            if task:
                task.status = "failed"
                task.error_message = error_message[:1024]
                task.finished_at = _utcnow()
        await db.commit()

    async def _upsert_scan_summary(
        self,
        db: AsyncSession,
        asset_id: uuid.UUID,
        *,
        scan_date: date,
        tls_version: str | None,
        pqc_status: str | None,
        risk_score: float,
        change_detected: bool,
    ) -> None:
        existing = (
            await db.execute(
                select(AssetScanSummary).where(
                    AssetScanSummary.asset_id == asset_id,
                    AssetScanSummary.scan_date == scan_date,
                )
            )
        ).scalar_one_or_none()
        if existing:
            existing.tls_version = tls_version
            existing.pqc_status = pqc_status
            existing.risk_score = risk_score
            existing.change_detected = change_detected
            return
        db.add(
            AssetScanSummary(
                asset_id=asset_id,
                scan_date=scan_date,
                tls_version=tls_version,
                pqc_status=pqc_status,
                risk_score=risk_score,
                change_detected=change_detected,
            )
        )

    async def list_asset_matrix(self, db: AsyncSession) -> dict[str, Any]:
        assets = list((await db.execute(select(MasterAsset).order_by(MasterAsset.updated_at.desc()))).scalars().all())
        latest_state_map = await self._latest_state_map(db, [asset.id for asset in assets])
        items = []
        latest_marker = max(
            (
                asset.updated_at or asset.last_scanned_at or _utcnow()
                for asset in assets
            ),
            default=_utcnow(),
        )
        for asset in assets:
            state = latest_state_map.get(asset.id)
            items.append(
                {
                    "id": str(asset.id),
                    "asset": asset.asset_value,
                    "asset_type": asset.asset_type.value if hasattr(asset.asset_type, "value") else str(asset.asset_type),
                    "tls_version": state.tls_version if state else None,
                    "cipher": state.cipher if state else None,
                    "pqc_status": state.pqc_status if state else None,
                    "risk_score": float(asset.risk_score) if asset.risk_score is not None else None,
                    "last_scanned_at": asset.last_scanned_at.isoformat() if asset.last_scanned_at else None,
                    "status": asset.status.value if hasattr(asset.status, "value") else str(asset.status),
                }
            )
        return {"items": items, "updated_at": latest_marker.isoformat()}

    async def _latest_state_map(
        self,
        db: AsyncSession,
        asset_ids: list[uuid.UUID],
    ) -> dict[uuid.UUID, AssetStateHistory]:
        if not asset_ids:
            return {}
        subquery = (
            select(
                AssetStateHistory.asset_id,
                func.max(AssetStateHistory.recorded_at).label("max_recorded_at"),
            )
            .where(AssetStateHistory.asset_id.in_(asset_ids))
            .group_by(AssetStateHistory.asset_id)
            .subquery()
        )
        rows = (
            await db.execute(
                select(AssetStateHistory)
                .join(
                    subquery,
                    (AssetStateHistory.asset_id == subquery.c.asset_id)
                    & (AssetStateHistory.recorded_at == subquery.c.max_recorded_at),
                )
            )
        ).scalars().all()
        return {row.asset_id: row for row in rows}


scan_orchestrator = ScanOrchestrator()
