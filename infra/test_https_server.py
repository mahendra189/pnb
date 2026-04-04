"""
infra/test_https_server.py — Test HTTPS server for crypto-agility gateway testing.

Exposes endpoints that return info about the TLS connection, allowing us to verify
which cryptographic algorithms were negotiated during the handshake.
"""

import ssl
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI(title="Crypto-Agility Test Server")


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "test-https-server"}


@app.get("/tls-info")
async def get_tls_info(request: Request) -> dict[str, Any]:
    """
    Retrieve TLS connection information.
    
    Useful for verifying which algorithms were negotiated through the proxy.
    """
    # Extract TLS info from ASGI scope
    scope = request.scope
    client_ssl = scope.get("client_ssl", None)
    
    # Try to get details from SSL connection
    tls_info = {
        "timestamp": datetime.utcnow().isoformat(),
        "client_ip": scope.get("client", ("unknown", 0))[0],
        "scheme": scope.get("scheme", "unknown"),
        "tls_enabled": scope.get("scheme") == "https",
    }
    
    # Note: Full TLS cipher/version details would come from actual SSL context
    # For demo purposes, we return what we can extract
    if "tls_version" in scope:
        tls_info["tls_version"] = scope["tls_version"]
    
    if "ssl_object" in scope:
        ssl_obj = scope["ssl_object"]
        try:
            tls_info["tls_version"] = ssl_obj.version()
            tls_info["cipher_suite"] = ssl_obj.cipher()[0]
        except Exception:
            pass
    
    return tls_info


@app.get("/crypto-check/{algorithm}")
async def check_algorithm(algorithm: str, request: Request) -> dict[str, Any]:
    """
    Check if a given cryptographic algorithm would be allowed.
    
    In a real scenario, this would verify against the OPA policy.
    For demo, we return mock data.
    
    Args:
        algorithm: Algorithm name to check (e.g., 'RSA-2048', 'ML-KEM-768')
    """
    # Mock policy check: RSA-2048 allowed, ML-KEM-768 blocked (changeable)
    allowed_algorithms = {
        "RSA-2048": {"allowed": True, "reason": "Standard RSA key exchange", "pqc": False},
        "RSA-3072": {"allowed": True, "reason": "Standard RSA key exchange", "pqc": False},
        "RSA-4096": {"allowed": True, "reason": "Standard RSA key exchange", "pqc": False},
        "ECDHE-P256": {"allowed": True, "reason": "NIST curve", "pqc": False},
        "ECDHE-P384": {"allowed": True, "reason": "NIST curve", "pqc": False},
        "X25519": {"allowed": True, "reason": "Safe Diffie-Hellman", "pqc": False},
        "ML-KEM-768": {"allowed": False, "reason": "PQC not yet approved by policy", "pqc": True},
        "ML-DSA-65": {"allowed": False, "reason": "PQC signature scheme not approved", "pqc": True},
    }
    
    result = allowed_algorithms.get(
        algorithm,
        {
            "allowed": False,
            "reason": f"Unknown algorithm: {algorithm}",
            "pqc": False
        }
    )
    
    return {
        "algorithm": algorithm,
        "tls_connection_info": {
            "client_ip": request.client[0] if request.client else "unknown",
            "timestamp": datetime.utcnow().isoformat(),
        },
        **result
    }


@app.post("/update-crypto-policy")
async def update_policy(policy_update: dict[str, Any]) -> dict[str, Any]:
    """
    Simulate updating the crypto policy (in real system, calls OPA API).
    
    This endpoint is called when the dashboard Remediate button is triggered.
    """
    policy_name = policy_update.get("policy_name", "unknown")
    allowed_algorithms = policy_update.get("allowed_algorithms", [])
    
    return {
        "status": "policy_updated",
        "timestamp": datetime.utcnow().isoformat(),
        "previous_policy": "default-classical-rsa",
        "new_policy": policy_name,
        "allowed_algorithms": allowed_algorithms,
        "message": f"Policy changed to {policy_name} with {len(allowed_algorithms)} allowed algorithms"
    }


@app.get("/api/v1/crypto-gateway/status")
async def gateway_status() -> dict[str, Any]:
    """
    Return status of the crypto-agility gateway and current policies.
    """
    return {
        "gateway": "envoy-opa-crypto-gateway",
        "status": "running",
        "components": {
            "envoy": {
                "status": "running",
                "port": 9443,
                "role": "TLS intercept and authorization"
            },
            "opa": {
                "status": "running",
                "port": 9191,
                "role": "Crypto policy enforcement"
            },
            "test_server": {
                "status": "running",
                "port": 8443,
                "role": "Backend application"
            }
        },
        "current_policy": {
            "name": "default-classical-rsa",
            "version": "1.0",
            "allowed_key_exchange": ["RSA-2048", "RSA-3072", "ECDHE-P256", "X25519"],
            "pqc_required": False
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/api/v1/crypto-gateway/remediate")
async def remediate_policy(remediation: dict[str, Any]) -> dict[str, Any]:
    """
    Remediate crypto policy violations by updating to a new policy.
    
    This is called by the dashboard Remediate button.
    """
    action = remediation.get("action", "")
    target_policy = remediation.get("target_policy", "")
    
    remediation_result = {
        "timestamp": datetime.utcnow().isoformat(),
        "action": action,
        "target_policy": target_policy,
        "status": "success",
        "details": {
            "previous_policy": "default-classical-rsa",
            "new_policy": target_policy,
            "change_reason": remediation.get("reason", "")
        }
    }
    
    if action == "enforce-pqc":
        remediation_result["details"]["message"] = f"Enforcing PQC-first policy: {target_policy}"
        remediation_result["details"]["new_allowed_algorithms"] = [
            "ML-KEM-768",
            "ML-DSA-65",
            "SLH-DSA-256"
        ]
    elif action == "enforce-hybrid":
        remediation_result["details"]["message"] = f"Enforcing hybrid PQC policy: {target_policy}"
        remediation_result["details"]["new_allowed_algorithms"] = [
            "HYBRID-ECDHE-ML-KEM",
            "X25519-ML-KEM-768"
        ]
    
    return remediation_result


if __name__ == "__main__":
    # Generate self-signed cert for testing
    cert_path = Path("/tmp/server.crt")
    key_path = Path("/tmp/server.key")
    
    # Check if certs already exist
    if not cert_path.exists():
        import subprocess
        subprocess.run([
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", str(key_path), "-out", str(cert_path),
            "-days", "365", "-nodes",
            "-subj", "/CN=test-https-server/O=QShieldX/C=US"
        ], check=True)
    
    # Run with HTTPS
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8443,
        ssl_keyfile=str(key_path),
        ssl_certfile=str(cert_path),
        ssl_version=ssl.PROTOCOL_TLSv1_3,
    )
