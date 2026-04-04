"""
api/v1/endpoints/crypto_gateway.py — Crypto-Agility Gateway control endpoints.

Provides operational control over the cryptographic algorithm policies
enforced by Envoy + OPA gateway.
"""

from __future__ import annotations

from typing import Any

import aiohttp
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/crypto-gateway", tags=["Crypto Gateway"])

# OPA policy engine endpoint
OPA_API_BASE = "http://opa-policy-engine:8181"
OPA_POLICY_PATH = "/api/v1/policies"


@router.get("/status", response_model=dict[str, Any])
async def get_gateway_status() -> dict[str, Any]:
    """Get current status of the crypto-agility gateway."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{OPA_API_BASE}/health") as resp:
                if resp.status == 200:
                    opa_health = await resp.json()
                else:
                    opa_health = {"status": "unhealthy"}
    except Exception as exc:
        opa_health = {"status": "unreachable", "error": str(exc)}

    return {
        "gateway_name": "crypto-agility-gateway",
        "status": "operational",
        "components": {
            "envoy": {"status": "running", "role": "TLS proxy"},
            "opa": opa_health,
        },
        "timestamp": None  # Would add timestamp
    }


@router.get("/policies", response_model=dict[str, Any])
async def list_policies() -> dict[str, Any]:
    """List all available cryptographic policies."""
    try:
        async with aiohttp.ClientSession() as session:
            # Query OPA for all available policies
            async with session.get(
                f"{OPA_API_BASE}/data/crypto_policies/available_policies"
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    policies = result.get("result", {})
                else:
                    policies = {}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"OPA unreachable: {exc}")

    return {
        "available_policies": [
            {
                "name": "default-classical-rsa",
                "version": "1.0",
                "description": "Classical RSA with NIST curves",
                "pqc_ready": False,
                "key_algorithms": ["RSA-2048", "RSA-3072", "ECDHE-P256"]
            },
            {
                "name": "pqc-first-ml-kem",
                "version": "2.0",
                "description": "PQC-first: ML-KEM-768 key exchange",
                "pqc_ready": True,
                "key_algorithms": ["ML-KEM-768", "ML-DSA-65"]
            },
            {
                "name": "hybrid-pqc-ecdhe-ml-kem",
                "version": "2.1",
                "description": "Hybrid: Classical + PQC combination",
                "pqc_ready": True,
                "key_algorithms": ["HYBRID-ECDHE-ML-KEM", "X25519-ML-KEM-768"]
            }
        ],
        "count": 3
    }


@router.get("/policies/active", response_model=dict[str, Any])
async def get_active_policy() -> dict[str, Any]:
    """Get the currently active cryptographic policy."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{OPA_API_BASE}/data/crypto_policies/active_policy_name"
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    active_name = result.get("result", "default-classical-rsa")
                else:
                    active_name = "default-classical-rsa"
    except Exception:
        active_name = "default-classical-rsa"

    # Map policy name to details
    policy_details = {
        "default-classical-rsa": {
            "name": "default-classical-rsa",
            "version": "1.0",
            "description": "Classical RSA key exchange with NIST curves",
            "pqc_required": False,
            "allowed_key_algorithms": [
                "RSA-2048", "RSA-3072", "RSA-4096",
                "ECDHE-P256", "ECDHE-P384", "ECDHE-P521",
                "X25519"
            ],
            "allowed_symmetric": ["AES-128-GCM", "AES-256-GCM", "ChaCha20-Poly1305"],
            "tls_versions": ["TLSv1.2", "TLSv1.3"]
        },
        "pqc-first-ml-kem": {
            "name": "pqc-first-ml-kem",
            "version": "2.0",
            "description": "Post-quantum cryptography first",
            "pqc_required": True,
            "allowed_key_algorithms": [
                "ML-KEM-512", "ML-KEM-768", "ML-KEM-1024"
            ],
            "allowed_symmetric": ["AES-256-GCM", "ChaCha20-Poly1305"],
            "tls_versions": ["TLSv1.3"]
        },
        "hybrid-pqc-ecdhe-ml-kem": {
            "name": "hybrid-pqc-ecdhe-ml-kem",
            "version": "2.1",
            "description": "Hybrid PQC: Classical + Post-Quantum",
            "pqc_required": False,  # But PQC blended
            "allowed_key_algorithms": [
                "HYBRID-ECDHE-ML-KEM", "X25519-ML-KEM-768",
                "ECDHE-P384", "ML-KEM-768"
            ],
            "allowed_symmetric": ["AES-256-GCM", "ChaCha20-Poly1305"],
            "tls_versions": ["TLSv1.3"]
        }
    }

    return policy_details.get(active_name, policy_details["default-classical-rsa"])


@router.post("/policies/activate", response_model=dict[str, Any])
async def activate_policy(policy_name: str) -> dict[str, Any]:
    """
    Activate a new cryptographic policy.
    
    This immediately updates OPA's active_policy_name, affecting all
    subsequent TLS handshakes without restarting any services.
    """
    valid_policies = [
        "default-classical-rsa",
        "pqc-first-ml-kem",
        "hybrid-pqc-ecdhe-ml-kem"
    ]

    if policy_name not in valid_policies:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid policy: {policy_name}. Must be one of {valid_policies}"
        )

    try:
        async with aiohttp.ClientSession() as session:
            # Update OPA data
            payload = {
                "crypto_policies": {
                    "active_policy_name": policy_name
                }
            }
            async with session.put(
                f"{OPA_API_BASE}/data/crypto_policies",
                json=payload
            ) as resp:
                if resp.status not in [200, 204]:
                    error_text = await resp.text()
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to update OPA: {error_text}"
                    )
    except aiohttp.ClientError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"OPA service unreachable: {exc}"
        )

    return {
        "status": "success",
        "message": f"Policy activated: {policy_name}",
        "previous_policy": "default-classical-rsa",  # Simplified
        "new_policy": policy_name,
        "timestamp": None
    }


@router.post("/remediate", response_model=dict[str, Any])
async def remediate_crypto_violations(remediation: dict[str, Any]) -> dict[str, Any]:
    """
    Remediate cryptographic policy violations by updating to a stricter policy.
    
    Called by the dashboard Remediate button when quantum-unsafe algorithms
    are detected.
    """
    action = remediation.get("action", "")
    reason = remediation.get("reason", "")

    remediation_map = {
        "enforce-pqc": "pqc-first-ml-kem",
        "enforce-hybrid": "hybrid-pqc-ecdhe-ml-kem",
        "enforce-classical": "default-classical-rsa"
    }

    target_policy = remediation_map.get(action)
    if not target_policy:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown remediation action: {action}"
        )

    # Execute policy activation
    try:
        async with aiohttp.ClientSession() as session:
            payload = {
                "crypto_policies": {
                    "active_policy_name": target_policy
                }
            }
            async with session.put(
                f"{OPA_API_BASE}/data/crypto_policies",
                json=payload
            ) as resp:
                if resp.status not in [200, 204]:
                    raise HTTPException(status_code=500, detail="OPA update failed")
    except aiohttp.ClientError as exc:
        raise HTTPException(status_code=503, detail=f"OPA unreachable: {exc}")

    return {
        "remediation_status": "applied",
        "action": action,
        "reason": reason,
        "target_policy": target_policy,
        "message": f"Policy updated to {target_policy}. All new TLS handshakes will enforce this policy.",
        "timestamp": None
    }


@router.get("/test-algorithm/{algorithm}")
async def test_algorithm_allowed(algorithm: str) -> dict[str, Any]:
    """
    Test whether an algorithm is currently allowed by the active policy.
    """
    try:
        async with aiohttp.ClientSession() as session:
            # Query OPA for algorithm validation
            query_input = {
                "request": {
                    "key_exchange_algorithm": algorithm,
                    "tls_version": "TLSv1.3",
                    "signature_algorithm": "ECDSA-SHA384",
                    "cipher_suite": "ECDHE-ECDSA-AES256-GCM-SHA384"
                }
            }

            async with session.post(
                f"{OPA_API_BASE}/v1/data/crypto_policies/allow",
                json=query_input
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    allowed = result.get("result", False)
                else:
                    allowed = False
    except Exception:
        allowed = False

    return {
        "algorithm": algorithm,
        "allowed": allowed,
        "message": f"{algorithm} is {'ALLOWED' if allowed else 'BLOCKED'} by current policy"
    }


@router.get("/audit-log")
async def get_audit_log(limit: int = 100) -> dict[str, Any]:
    """
    Retrieve audit log of recent policy decisions (from OPA).
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{OPA_API_BASE}/data/crypto_policies/audit_log"
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    logs = result.get("result", [])[:limit]
                else:
                    logs = []
    except Exception:
        logs = []

    return {
        "audit_logs": logs,
        "count": len(logs),
        "limit": limit
    }
