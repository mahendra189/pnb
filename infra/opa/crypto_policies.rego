# ═══════════════════════════════════════════════════════════════════════════════
# OPA/Rego Policy: Cryptographic Agility Control
#
# Purpose: Dynamically enforce cryptographic algorithm constraints.
# Integrates with Envoy for real-time policy enforcement without code deploys.
#
# Policy Types:
# - Algorithm whitelisting (e.g., only allow ML-KEM-768 key exchange)
# - TLS version enforcement (e.g., require TLS 1.3)
# - Cipher suite validation
# - Certificate chain validation
# ═══════════════════════════════════════════════════════════════════════════════

package crypto_policies

import future.keywords.contains
import future.keywords.if

# ─────────────────────────────────────────────────────────────────────────────
# Global Policy Store (dynamic data)
# ─────────────────────────────────────────────────────────────────────────────

# Default crypto policy: allows classical RSA and AES initially
default allowed_policies := {
    "key_exchange_algorithms": [
        "RSA-2048",
        "RSA-3072",
        "RSA-4096",
        "ECDHE-P256",
        "ECDHE-P384",
        "ECDHE-P521",
        "X25519"
    ],
    "symmetric_algorithms": [
        "AES-128-GCM",
        "AES-256-GCM",
        "ChaCha20-Poly1305"
    ],
    "signature_algorithms": [
        "RSA-SHA256",
        "RSA-SHA384",
        "ECDSA-SHA256",
        "ECDSA-SHA384"
    ],
    "tls_versions": ["TLSv1.2", "TLSv1.3"],
    "hash_algorithms": ["SHA-256", "SHA-384", "SHA-512"],
    "min_rsa_key_bits": 2048,
    "require_pqc_hybrid": false,
    "pqc_algorithms_allowed": [],
    "created_at": "2026-04-04T00:00:00Z",
    "policy_version": "1.0",
    "policy_name": "default-classical-rsa"
}

# PQC-first policy: requires post-quantum cryptography
pqc_first_policy := {
    "key_exchange_algorithms": [
        "ML-KEM-512",
        "ML-KEM-768",
        "ML-KEM-1024",
        "ML-DSA-44",
        "ML-DSA-65",
        "ML-DSA-87"
    ],
    "symmetric_algorithms": [
        "AES-256-GCM",
        "ChaCha20-Poly1305"
    ],
    "signature_algorithms": [
        "ML-DSA-65",
        "ECDSA-SHA384"
    ],
    "tls_versions": ["TLSv1.3"],
    "hash_algorithms": ["SHA-384", "SHA-512"],
    "min_rsa_key_bits": 0,
    "require_pqc_hybrid": false,
    "pqc_algorithms_allowed": ["ML-KEM-768", "ML-DSA-65", "SLH-DSA-256"],
    "created_at": "2026-04-04T12:00:00Z",
    "policy_version": "2.0",
    "policy_name": "pqc-first-ml-kem"
}

# Hybrid PQC policy: allows classical + PQC combinations
hybrid_pqc_policy := {
    "key_exchange_algorithms": [
        "ECDHE-P384",
        "ML-KEM-768",
        "HYBRID-ECDHE-ML-KEM",
        "X25519-ML-KEM-768"
    ],
    "symmetric_algorithms": [
        "AES-256-GCM",
        "ChaCha20-Poly1305"
    ],
    "signature_algorithms": [
        "ECDSA-SHA384",
        "ML-DSA-65",
        "HYBRID-ECDSA-ML-DSA"
    ],
    "tls_versions": ["TLSv1.3"],
    "hash_algorithms": ["SHA-384", "SHA-512"],
    "min_rsa_key_bits": 0,
    "require_pqc_hybrid": true,
    "pqc_algorithms_allowed": ["ML-KEM-768", "ML-DSA-65", "SLH-DSA-256"],
    "created_at": "2026-04-04T14:00:00Z",
    "policy_version": "2.1",
    "policy_name": "hybrid-pqc-ecdhe-ml-kem"
}

# ─────────────────────────────────────────────────────────────────────────────
# Decision Logic: Is TLS Handshake Allowed?
# ─────────────────────────────────────────────────────────────────────────────

# Main authorization decision
allow if {
    # Get current policy (default to classical RSA)
    policy := data.crypto_policies.active_policy
    
    # Extract TLS handshake details from request
    tls_version := input.request.tls_version
    key_exchange := input.request.key_exchange_algorithm
    signature_algo := input.request.signature_algorithm
    cipher_suite := input.request.cipher_suite
    
    # Validate each component
    is_valid_tls_version(policy, tls_version)
    is_allowed_key_exchange(policy, key_exchange)
    is_allowed_signature(policy, signature_algo)
    is_allowed_cipher_suite(policy, cipher_suite)
}

# TLS version validation
is_valid_tls_version(policy, version) if {
    version in policy.tls_versions
}

is_valid_tls_version(policy, _) if {
    policy.tls_versions == []  # Empty list = allow all
}

# Key exchange algorithm validation
is_allowed_key_exchange(policy, algo) if {
    algo in policy.key_exchange_algorithms
}

is_allowed_key_exchange(policy, algo) if {
    # Check if it's a hybrid combination
    contains(algo, "HYBRID")
    # Extract both algorithms
    parts := split(algo, "-")
    count(parts) == 2
    # Both should be in allowed lists (simplified check)
    is_pqc_algorithm(parts[1], policy)
}

is_allowed_key_exchange(policy, algo) if {
    # Check for X25519-ML-KEM-768 style combinations
    contains(algo, "ML-KEM")
    is_pqc_algorithm(algo, policy)
}

# Signature algorithm validation
is_allowed_signature(policy, algo) if {
    algo in policy.signature_algorithms
}

is_allowed_signature(policy, algo) if {
    contains(algo, "HYBRID")
    is_pqc_algorithm(algo, policy)
}

# Cipher suite validation (must use approved symmetric cipher)
is_allowed_cipher_suite(policy, suite) if {
    # Extract symmetric cipher from suite name (e.g., "AES-256-GCM" from "ECDHE-RSA-AES-256-GCM-SHA384")
    symmetric := extract_symmetric_cipher(suite, policy)
    symmetric in policy.symmetric_algorithms
}

# PQC algorithm check
is_pqc_algorithm(algo, policy) if {
    # Check if algorithm is in PQC whitelist
    algo in policy.pqc_algorithms_allowed
}

is_pqc_algorithm("ML-KEM-512", _) { true }
is_pqc_algorithm("ML-KEM-768", _) { true }
is_pqc_algorithm("ML-KEM-1024", _) { true }
is_pqc_algorithm("ML-DSA-44", _) { true }
is_pqc_algorithm("ML-DSA-65", _) { true }
is_pqc_algorithm("ML-DSA-87", _) { true }
is_pqc_algorithm("SLH-DSA-256", _) { true }

# Extract symmetric cipher from cipher suite name
extract_symmetric_cipher(suite, policy) = cipher if {
    contains(suite, "AES-256-GCM")
    cipher := "AES-256-GCM"
} else if {
    contains(suite, "AES-128-GCM")
    cipher := "AES-128-GCM"
} else if {
    contains(suite, "ChaCha20-Poly1305")
    cipher := "ChaCha20-Poly1305"
} else {
    cipher := "UNKNOWN"
}

# ─────────────────────────────────────────────────────────────────────────────
# Deny Rules: Explicit block conditions
# ─────────────────────────────────────────────────────────────────────────────

deny[msg] if {
    input.request.key_exchange_algorithm == "RSA-512"
    msg := "RSA-512 is cryptographically broken (deny: too weak)"
}

deny[msg] if {
    input.request.key_exchange_algorithm == "RSA-768"
    msg := "RSA-768 is cryptographically broken (deny: deprecated)"
}

deny[msg] if {
    input.request.key_exchange_algorithm == "MD5"
    msg := "MD5 hash is collapsible (deny: cryptographically broken)"
}

deny[msg] if {
    input.request.tls_version == "SSLv3"
    msg := "SSLv3 has POODLE attack (deny: vulnerable protocol)"
}

deny[msg] if {
    input.request.tls_version == "TLSv1.0"
    policy := data.crypto_policies.active_policy
    policy.policy_name == "pqc-first-ml-kem"
    msg := "TLSv1.0 not allowed in PQC-first policy (deny: policy violation)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Policy Management: Enable/Disable policies dynamically
# ─────────────────────────────────────────────────────────────────────────────

# Determine which policy is currently active
active_policy := data.crypto_policies.active_policy_name as policy_name |
    get_policy_by_name(policy_name)

# Retrieve policy by name
get_policy_by_name("default-classical-rsa") := data.crypto_policies.default_allowed_policies
get_policy_by_name("pqc-first-ml-kem") := data.crypto_policies.pqc_first_policy
get_policy_by_name("hybrid-pqc-ecdhe-ml-kem") := data.crypto_policies.hybrid_pqc_policy

# Get all available policies
available_policies[name] = policy if {
    policies := {
        "default-classical-rsa": data.crypto_policies.default_allowed_policies,
        "pqc-first-ml-kem": data.crypto_policies.pqc_first_policy,
        "hybrid-pqc-ecdhe-ml-kem": data.crypto_policies.hybrid_pqc_policy
    }
    policy := policies[name]
}

# ─────────────────────────────────────────────────────────────────────────────
# Audit Trail: Log all authorization decisions
# ─────────────────────────────────────────────────────────────────────────────

audit_log := {
    "timestamp": data.time.now_ns(),
    "request_id": input.request_id,
    "client_ip": input.client_ip,
    "tls_version": input.request.tls_version,
    "key_exchange": input.request.key_exchange_algorithm,
    "signature_algo": input.request.signature_algorithm,
    "decision": allow_decision,
    "policy_version": data.crypto_policies.active_policy.policy_version,
    "denial_reasons": deny
}

allow_decision := {
    "allowed": count(deny) == 0,
    "reason": "All crypto checks passed" if count(deny) == 0 else sprintf("Denied for reasons: %v", [deny])
}

# ─────────────────────────────────────────────────────────────────────────────
# Metrics and Reporting
# ─────────────────────────────────────────────────────────────────────────────

recommendations[msg] if {
    policy := data.crypto_policies.active_policy
    policy.require_pqc_hybrid == false
    input.request.key_exchange_algorithm == "RSA-2048"
    msg := "RECOMMENDATION: Migrate to PQC-hybrid key exchange (e.g., X25519-ML-KEM-768) for quantum-safety"
}

recommendations[msg] if {
    input.request.tls_version == "TLSv1.2"
    msg := "RECOMMENDATION: Upgrade to TLSv1.3 for improved cryptographic strength"
}

recommendations[msg] if {
    input.request.cipher_suite == "ECDHE-RSA-AES-128-GCM-SHA256"
    msg := "RECOMMENDATION: Use AES-256-GCM (256-bit key) instead of AES-128-GCM"
}
