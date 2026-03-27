from __future__ import annotations

import random
import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.logging import logger

settings = get_settings()


@dataclass
class LiveAsset:
    id: str
    asset_type: str
    asset_value: str
    organization: str | None
    seed_domain: str | None
    status: str
    risk_score: float | None
    hndl_score: float | None
    quantum_label: str | None
    tls_version: str | None
    cipher_suite: str | None
    key_algorithm: str | None
    cert_expires_at: datetime | None
    last_scanned: datetime | None
    previous_risk_score: float | None
    owner: str | None
    created_at: datetime
    updated_at: datetime
    metadata: dict[str, Any]


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time(), tzinfo=UTC)
    if isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(normalized)
            return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except ValueError:
            return None
    return None


def _risk_band(score: float | None) -> str:
    if score is None:
        return "unknown"
    if score >= 8:
        return "critical"
    if score >= 6:
        return "high"
    if score >= 3.5:
        return "medium"
    return "low"


def _quantum_label(score: float | None, explicit: str | None = None) -> str:
    if explicit:
        return explicit
    if score is None:
        return "quantum_vulnerable"
    if score <= 2.5:
        return "fully_quantum_safe"
    if score <= 4.5:
        return "pqc_ready"
    return "quantum_vulnerable"


def _relative_timestamp(value: datetime | None) -> str:
    if value is None:
        return "Never"
    delta = _utcnow() - value
    if delta < timedelta(minutes=1):
        return "Just now"
    if delta < timedelta(hours=1):
        return f"{int(delta.total_seconds() // 60)}m ago"
    if delta < timedelta(days=1):
        return f"{int(delta.total_seconds() // 3600)}h ago"
    return f"{delta.days}d ago"


class LiveDataService:
    def __init__(self) -> None:
        self._demo_assets: list[LiveAsset] = self._build_demo_assets()

    def _build_demo_assets(self) -> list[LiveAsset]:
        now = _utcnow()
        sample = [
            {
                "asset_value": "api.pnb.co.in",
                "asset_type": "api_endpoint",
                "organization": "Digital Banking",
                "seed_domain": "pnb.co.in",
                "status": "scanned",
                "risk_score": 8.4,
                "hndl_score": 8.7,
                "tls_version": "TLS 1.2",
                "cipher_suite": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
                "key_algorithm": "RSA-2048",
                "cert_expires_at": now + timedelta(days=12),
                "last_scanned": now - timedelta(minutes=14),
                "previous_risk_score": 7.8,
                "owner": "Payments API",
            },
            {
                "asset_value": "netbanking.pnb.co.in",
                "asset_type": "domain",
                "organization": "Retail Banking",
                "seed_domain": "pnb.co.in",
                "status": "scanned",
                "risk_score": 6.6,
                "hndl_score": 6.9,
                "tls_version": "TLS 1.2",
                "cipher_suite": "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
                "key_algorithm": "ECDSA-P256",
                "cert_expires_at": now + timedelta(days=61),
                "last_scanned": now - timedelta(hours=2),
                "previous_risk_score": 6.9,
                "owner": "Net Banking",
            },
            {
                "asset_value": "mobile.pnb.co.in",
                "asset_type": "api_endpoint",
                "organization": "Mobile Banking",
                "seed_domain": "pnb.co.in",
                "status": "scanned",
                "risk_score": 3.1,
                "hndl_score": 3.4,
                "tls_version": "TLS 1.3",
                "cipher_suite": "TLS_AES_256_GCM_SHA384",
                "key_algorithm": "X25519Kyber768",
                "cert_expires_at": now + timedelta(days=142),
                "last_scanned": now - timedelta(minutes=36),
                "previous_risk_score": 3.5,
                "owner": "Mobile Apps",
            },
            {
                "asset_value": "cdn.pnb.co.in",
                "asset_type": "load_balancer",
                "organization": "Infrastructure",
                "seed_domain": "pnb.co.in",
                "status": "scanned",
                "risk_score": 1.4,
                "hndl_score": 1.7,
                "tls_version": "TLS 1.3",
                "cipher_suite": "TLS_AES_128_GCM_SHA256",
                "key_algorithm": "ML-KEM-768",
                "cert_expires_at": now + timedelta(days=221),
                "last_scanned": now - timedelta(hours=7),
                "previous_risk_score": 1.9,
                "owner": "Edge Delivery",
            },
            {
                "asset_value": "legacy-vpn.pnb.co.in",
                "asset_type": "domain",
                "organization": "Corporate IT",
                "seed_domain": "pnb.co.in",
                "status": "scanned",
                "risk_score": 9.2,
                "hndl_score": 9.5,
                "tls_version": "TLS 1.1",
                "cipher_suite": "TLS_RSA_WITH_3DES_EDE_CBC_SHA",
                "key_algorithm": "RSA-1024",
                "cert_expires_at": now - timedelta(days=5),
                "last_scanned": now - timedelta(minutes=8),
                "previous_risk_score": 8.7,
                "owner": "Remote Access",
            },
            {
                "asset_value": "kyc.pnb.co.in",
                "asset_type": "api_endpoint",
                "organization": "Compliance",
                "seed_domain": "pnb.co.in",
                "status": "pending",
                "risk_score": 4.9,
                "hndl_score": 5.1,
                "tls_version": "TLS 1.2",
                "cipher_suite": "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
                "key_algorithm": "RSA-3072",
                "cert_expires_at": now + timedelta(days=45),
                "last_scanned": None,
                "previous_risk_score": None,
                "owner": "KYC",
            },
        ]

        assets: list[LiveAsset] = []
        for index, row in enumerate(sample):
            score = row["risk_score"]
            quantum_label = _quantum_label(score)
            assets.append(
                LiveAsset(
                    id=str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{row['asset_value']}-{index}")),
                    asset_type=row["asset_type"],
                    asset_value=row["asset_value"],
                    organization=row["organization"],
                    seed_domain=row["seed_domain"],
                    status=row["status"],
                    risk_score=score,
                    hndl_score=row["hndl_score"],
                    quantum_label=quantum_label,
                    tls_version=row["tls_version"],
                    cipher_suite=row["cipher_suite"],
                    key_algorithm=row["key_algorithm"],
                    cert_expires_at=row["cert_expires_at"],
                    last_scanned=row["last_scanned"],
                    previous_risk_score=row["previous_risk_score"],
                    owner=row["owner"],
                    created_at=now - timedelta(days=30 + index),
                    updated_at=now - timedelta(minutes=index * 3),
                    metadata={
                        "risk_band": _risk_band(score),
                        "protocol_family": "legacy"
                        if row["tls_version"] in {"TLS 1.1", "TLS 1.2"}
                        else "modern",
                    },
                )
            )
        return assets

    async def _supabase_request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: Any = None,
        headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        if not settings.SUPABASE_ENABLED:
            raise RuntimeError("Supabase is not configured.")

        request_headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY or "",
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY or ''}",
            "Accept-Profile": settings.SUPABASE_SCHEMA,
            "Content-Profile": settings.SUPABASE_SCHEMA,
        }
        if headers:
            request_headers.update(headers)

        async with httpx.AsyncClient(
            base_url=f"{settings.SUPABASE_URL}/rest/v1",
            timeout=10.0,
        ) as client:
            response = await client.request(
                method,
                path,
                params=params,
                json=json,
                headers=request_headers,
            )
            response.raise_for_status()
            return response

    def _from_row(self, row: dict[str, Any]) -> LiveAsset:
        metadata = row.get("metadata") or row.get("metadata_") or {}
        score = row.get("risk_score")
        quantum_label = _quantum_label(score, row.get("quantum_label"))
        return LiveAsset(
            id=str(row["id"]),
            asset_type=row.get("asset_type", "domain"),
            asset_value=row.get("asset_value") or row.get("host") or "unknown",
            organization=row.get("organization"),
            seed_domain=row.get("seed_domain"),
            status=row.get("status", "pending"),
            risk_score=score,
            hndl_score=row.get("hndl_score", score),
            quantum_label=quantum_label,
            tls_version=row.get("tls_version"),
            cipher_suite=row.get("cipher_suite"),
            key_algorithm=row.get("key_algorithm"),
            cert_expires_at=_parse_dt(row.get("cert_expires_at")),
            last_scanned=_parse_dt(row.get("last_scanned")),
            previous_risk_score=row.get("previous_risk_score")
            or metadata.get("previous_risk_score"),
            owner=row.get("owner") or metadata.get("owner"),
            created_at=_parse_dt(row.get("created_at")) or _utcnow(),
            updated_at=_parse_dt(row.get("updated_at")) or _utcnow(),
            metadata=metadata,
        )

    async def list_assets(self, page: int = 1, page_size: int = 100) -> tuple[list[LiveAsset], int, str]:
        if settings.SUPABASE_ENABLED:
            try:
                offset = max(page - 1, 0) * page_size
                response = await self._supabase_request(
                    "GET",
                    f"/{settings.SUPABASE_ASSETS_TABLE}",
                    params={
                        "select": "*",
                        "order": "updated_at.desc",
                        "offset": offset,
                        "limit": page_size,
                    },
                    headers={"Prefer": "count=exact"},
                )
                rows = response.json()
                assets = [self._from_row(row) for row in rows]
                content_range = response.headers.get("content-range", "0-0/0")
                total = int(content_range.split("/")[-1]) if "/" in content_range else len(assets)
                return assets, total, "supabase"
            except Exception as exc:
                logger.warning("supabase_live_data_fallback", error=str(exc))

        total = len(self._demo_assets)
        start = max(page - 1, 0) * page_size
        end = start + page_size
        return self._demo_assets[start:end], total, "demo"

    async def get_all_assets(self) -> tuple[list[LiveAsset], str]:
        assets, _, source = await self.list_assets(page=1, page_size=500)
        return assets, source

    def serialize_asset(self, asset: LiveAsset) -> dict[str, Any]:
        return {
            "id": asset.id,
            "asset_type": asset.asset_type,
            "asset_value": asset.asset_value,
            "organization": asset.organization,
            "seed_domain": asset.seed_domain,
            "status": asset.status,
            "risk_score": asset.risk_score,
            "hndl_score": asset.hndl_score,
            "quantum_label": asset.quantum_label,
            "tls_version": asset.tls_version,
            "cipher_suite": asset.cipher_suite,
            "key_algorithm": asset.key_algorithm,
            "cert_expires_at": asset.cert_expires_at.isoformat() if asset.cert_expires_at else None,
            "last_scanned": asset.last_scanned.isoformat() if asset.last_scanned else None,
            "previous_risk_score": asset.previous_risk_score,
            "owner": asset.owner,
            "created_at": asset.created_at.isoformat(),
            "updated_at": asset.updated_at.isoformat(),
            "metadata": asset.metadata,
        }

    async def get_dashboard_snapshot(self) -> dict[str, Any]:
        assets, source = await self.get_all_assets()
        now = _utcnow()
        total = len(assets)
        scanned = len([asset for asset in assets if asset.last_scanned])
        pqc_ready = len(
            [
                asset
                for asset in assets
                if asset.quantum_label in {"pqc_ready", "fully_quantum_safe"}
            ]
        )
        high_risk = len([asset for asset in assets if (asset.risk_score or 0) >= 7])
        expiring = len(
            [
                asset
                for asset in assets
                if asset.cert_expires_at and now <= asset.cert_expires_at <= now + timedelta(days=30)
            ]
        )
        risk_totals = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        protocol_counts: dict[str, int] = {}
        algorithm_counts: dict[str, int] = {}
        alerts: list[dict[str, Any]] = []
        recent_activity: list[dict[str, Any]] = []

        ordered = sorted(
            assets,
            key=lambda asset: asset.last_scanned or asset.updated_at,
            reverse=True,
        )

        for asset in assets:
            band = _risk_band(asset.risk_score)
            if band in risk_totals:
                risk_totals[band] += 1

            protocol = asset.tls_version or "Unknown"
            protocol_counts[protocol] = protocol_counts.get(protocol, 0) + 1
            algorithm = asset.key_algorithm or "Unknown"
            algorithm_counts[algorithm] = algorithm_counts.get(algorithm, 0) + 1

            if asset.cert_expires_at and asset.cert_expires_at <= now + timedelta(days=30):
                days_left = max((asset.cert_expires_at - now).days, 0)
                alerts.append(
                    {
                        "title": "Certificate Expiry Alert",
                        "target": asset.asset_value,
                        "severity": "CRITICAL" if days_left <= 14 else "HIGH",
                        "message": f"Leaf certificate expiring in {days_left} days ({asset.key_algorithm or 'unknown'})",
                    }
                )
            if (asset.risk_score or 0) >= 8:
                alerts.append(
                    {
                        "title": "Legacy Algorithm Detected",
                        "target": asset.asset_value,
                        "severity": "CRITICAL",
                        "message": f"Risk score {asset.risk_score:.1f} with {asset.key_algorithm or 'legacy crypto'} requires immediate remediation.",
                    }
                )

        for asset in ordered[:5]:
            current = asset.risk_score or 0.0
            previous = asset.previous_risk_score if asset.previous_risk_score is not None else current
            delta = round(current - previous, 2)
            recent_activity.append(
                {
                    "asset_id": asset.id,
                    "host": asset.asset_value,
                    "score": round(current, 2),
                    "delta": delta,
                    "status": asset.quantum_label or "quantum_vulnerable",
                    "trend": "up" if delta > 0 else "down" if delta < 0 else "even",
                    "last_scanned": asset.last_scanned.isoformat() if asset.last_scanned else None,
                }
            )

        risk_summary = []
        for band in ("critical", "high", "medium", "low"):
            count = risk_totals[band]
            percentage = round((count / total) * 100, 1) if total else 0.0
            risk_summary.append({"label": band, "count": count, "percentage": percentage})

        last_scan_at = max(
            [asset.last_scanned for asset in assets if asset.last_scanned],
            default=None,
        )
        return {
            "source": source,
            "generated_at": now.isoformat(),
            "summary": {
                "total": total,
                "scanned": scanned,
                "critical": high_risk,
                "pqc_ready": pqc_ready,
                "non_ready": max(total - pqc_ready, 0),
                "cert_expiring": expiring,
                "coverage_percent": round((scanned / total) * 100, 1) if total else 0.0,
                "last_scan_at": last_scan_at.isoformat() if last_scan_at else None,
            },
            "alerts": alerts[:6],
            "recent_activity": recent_activity,
            "risk_summary": risk_summary,
            "inventory_distribution": {
                "algorithms": [
                    {"label": key, "count": value}
                    for key, value in sorted(algorithm_counts.items(), key=lambda item: item[1], reverse=True)
                ][:5],
                "protocols": [
                    {"label": key, "count": value}
                    for key, value in sorted(protocol_counts.items(), key=lambda item: item[1], reverse=True)
                ][:5],
            },
            "assets": [self.serialize_asset(asset) for asset in ordered],
        }

    async def get_scan_results(self) -> dict[str, Any]:
        assets, source = await self.get_all_assets()
        ordered = sorted(
            assets,
            key=lambda asset: asset.last_scanned or asset.updated_at,
            reverse=True,
        )
        items = []
        for asset in ordered:
            status = "PQC-Ready"
            if asset.cert_expires_at and asset.cert_expires_at < _utcnow():
                status = "Expired"
            elif (asset.risk_score or 0) >= 7:
                status = "Weak"
            elif asset.quantum_label == "fully_quantum_safe":
                status = "Secure"

            items.append(
                {
                    "id": asset.id,
                    "host": asset.asset_value,
                    "protocol": asset.tls_version or "TLS Unknown",
                    "status": status,
                    "tlsVersion": asset.tls_version or "Unknown",
                    "cipherSuite": asset.cipher_suite or "Unknown",
                    "keyAlgo": asset.key_algorithm or "Unknown",
                    "expiry": asset.cert_expires_at.date().isoformat() if asset.cert_expires_at else "Unknown",
                    "timestamp": (asset.last_scanned or asset.updated_at).isoformat(),
                }
            )
        return {"source": source, "items": items}

    async def get_forecast(self) -> dict[str, Any]:
        assets, source = await self.get_all_assets()
        average_risk = sum(asset.risk_score or 0 for asset in assets) / len(assets) if assets else 0
        base_year = _utcnow().year
        bands = []
        for month_offset in range(1, 13):
            p50 = max(0.5, round(average_risk * 10 - month_offset * 1.4, 1))
            bands.append(
                {
                    "date": date(base_year, month_offset, 1).isoformat(),
                    "p10": max(0.0, round(p50 - 8, 1)),
                    "p50": p50,
                    "p90": min(100.0, round(p50 + 9, 1)),
                }
            )

        return {
            "source": source,
            "bands": bands,
            "monte_carlo": {
                "median_exposure_year": round(base_year + max(1.5, average_risk / 3), 1),
                "p10_exposure_year": round(base_year + max(1.0, average_risk / 4), 1),
                "p90_exposure_year": round(base_year + max(2.5, average_risk / 2.2), 1),
                "prob_breach_before_2030": min(0.95, round(average_risk / 12, 2)),
                "prob_breach_before_2035": min(0.99, round(average_risk / 8.5, 2)),
            },
        }

    async def simulate_scan(self) -> dict[str, Any]:
        if settings.SUPABASE_ENABLED:
            try:
                assets, _, _ = await self.list_assets(page=1, page_size=25)
                if assets:
                    asset = random.choice(assets)
                    next_score = round(max(0.8, min(9.8, (asset.risk_score or 5.0) + random.uniform(-1.4, 1.2))), 2)
                    now = _utcnow().isoformat()
                    await self._supabase_request(
                        "PATCH",
                        f"/{settings.SUPABASE_ASSETS_TABLE}",
                        params={"id": f"eq.{asset.id}"},
                        json={
                            "status": "scanned",
                            "risk_score": next_score,
                            "hndl_score": round(next_score + 0.2, 2),
                            "quantum_label": _quantum_label(next_score),
                            "previous_risk_score": asset.risk_score,
                            "last_scanned": now,
                            "updated_at": now,
                        },
                        headers={"Prefer": "return=minimal"},
                    )
                    return {
                        "status": "Simulation triggered",
                        "asset_id": asset.id,
                        "host": asset.asset_value,
                        "source": "supabase",
                    }
            except Exception as exc:
                logger.warning("supabase_simulation_fallback", error=str(exc))

        asset = random.choice(self._demo_assets)
        next_score = round(max(0.8, min(9.8, (asset.risk_score or 5.0) + random.uniform(-1.4, 1.2))), 2)
        asset.previous_risk_score = asset.risk_score
        asset.risk_score = next_score
        asset.hndl_score = round(next_score + 0.2, 2)
        asset.quantum_label = _quantum_label(next_score)
        asset.status = "scanned"
        asset.last_scanned = _utcnow()
        asset.updated_at = asset.last_scanned
        return {
            "status": "Simulation triggered",
            "asset_id": asset.id,
            "host": asset.asset_value,
            "source": "demo",
        }


live_data_service = LiveDataService()
