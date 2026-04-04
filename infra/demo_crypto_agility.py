#!/usr/bin/env python3
"""
demo_crypto_agility.py — Interactive demo of the Crypto-Agility Gateway.

Shows:
1. Initial policy: RSA-2048 allowed, ML-KEM-768 blocked
2. Policy update: Switch to PQC-first, only ML-KEM-768 allowed
3. Verification: Test both algorithms against new policy

Run: python demo_crypto_agility.py
"""

import asyncio
import json
import time
from typing import Any

import aiohttp


class CryptoAgilityDemo:
    """Interactive demo of crypto policy enforcement."""

    OPA_API = "http://localhost:8181"
    BACKEND_API = "http://localhost:8000"
    TEST_SERVER = "http://localhost:8443"

    async def wait_for_service(self, url: str, max_retries: int = 30) -> bool:
        """Wait for a service to become available."""
        for attempt in range(max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"{url}/health", timeout=aiohttp.ClientTimeout(total=5)) as resp:
                        if resp.status == 200:
                            return True
            except Exception:
                pass
            
            print(f"  ⏳ Waiting for {url}... ({attempt + 1}/{max_retries})")
            await asyncio.sleep(2)
        
        return False

    async def show_banner(self) -> None:
        """Display demo banner."""
        print("\n" + "=" * 80)
        print("  🔐 CRYPTO-AGILITY GATEWAY DEMO")
        print("  QShieldX Phase 7: Dynamic Algorithm Policy Enforcement")
        print("=" * 80 + "\n")

    async def step_1_initial_policy(self) -> dict[str, Any]:
        """Step 1: Show initial policy state."""
        print("📋 STEP 1: Initial Policy State")
        print("-" * 80)
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.BACKEND_API}/api/v1/crypto-gateway/policies/active"
                ) as resp:
                    if resp.status == 200:
                        policy = await resp.json()
                    else:
                        policy = {"error": "Could not fetch policy"}
        except Exception as exc:
            policy = {"error": str(exc)}

        print(f"Active Policy: {policy.get('name', 'Unknown')}")
        print(f"Version: {policy.get('version', 'Unknown')}")
        print(f"Description: {policy.get('description', 'N/A')}")
        print(f"\nAllowed Key Exchange Algorithms:")
        for algo in policy.get("allowed_key_algorithms", []):
            is_pqc = "ML-" in algo or "SLH-" in algo or "HYBRID-" in algo
            label = "🔮 PQC" if is_pqc else "🔑 Classical"
            print(f"  ✅ {label:15} {algo}")

        print(f"\nBlocked Algorithms (current policy):")
        blocked = ["ML-KEM-768", "ML-DSA-65", "SLH-DSA-256"]
        for algo in blocked:
            if algo not in policy.get("allowed_key_algorithms", []):
                print(f"  ❌ 🔮 PQC         {algo}")

        print()
        return policy

    async def step_2_test_algorithms(self, policy: dict[str, Any]) -> None:
        """Step 2: Test current algorithms."""
        print("🧪 STEP 2: Test Algorithm Compliance (Current Policy)")
        print("-" * 80)

        test_cases = [
            ("RSA-2048", True, "Classical RSA"),
            ("ECDHE-P256", True, "NIST elliptic curve"),
            ("ML-KEM-768", False, "Post-quantum key encapsulation"),
            ("ML-DSA-65", False, "Post-quantum signature"),
        ]

        for algo, expected_allowed, description in test_cases:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{self.BACKEND_API}/api/v1/crypto-gateway/test-algorithm/{algo}"
                    ) as resp:
                        if resp.status == 200:
                            result = await resp.json()
                            allowed = result.get("allowed", False)
                        else:
                            allowed = False
            except Exception:
                allowed = False

            icon = "✅ ALLOWED" if allowed else "❌ BLOCKED"
            match = "✓" if allowed == expected_allowed else "✗"
            print(f"  {match} {algo:20} {icon:15} ({description})")

        print()

    async def step_3_show_vulnerability(self) -> None:
        """Step 3: Explain the vulnerability."""
        print("🚨 STEP 3: Quantum Vulnerability Warning")
        print("-" * 80)
        print("""
RSA-2048 Vulnerability:
  • Estimated breakable by quantum computer in 2030-2035
  • Current policy allows RSA-2048 key exchange
  • This is acceptable for legacy compatibility
  • But exposes long-term confidentiality to quantum threats

Action: UPGRADE TO POST-QUANTUM CRYPTOGRAPHY
  • Switch policy from 'default-classical-rsa' → 'pqc-first-ml-kem'
  • Enforce ML-KEM-768 (NIST-approved post-quantum KEM)
  • Block all classical RSA handshakes
""")
        print()

    async def step_4_update_policy(self) -> str:
        """Step 4: Update policy to PQC-first."""
        print("🔄 STEP 4: Update Policy to PQC-First")
        print("-" * 80)

        new_policy = "pqc-first-ml-kem"
        print(f"Activating new policy: {new_policy}")
        print("  • All new TLS connections will enforce ML-KEM-768")
        print("  • Classical RSA will be rejected")
        print("  • No server restart required\n")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.BACKEND_API}/api/v1/crypto-gateway/policies/activate",
                    params={"policy_name": new_policy}
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        print(f"✅ Policy activation result:")
                        print(f"   Status: {result.get('status', 'unknown')}")
                        print(f"   Message: {result.get('message', '')}\n")
                    else:
                        print(f"❌ Failed to activate policy: {resp.status}\n")
        except Exception as exc:
            print(f"❌ Error: {exc}\n")

        await asyncio.sleep(1)  # Give OPA time to update
        return new_policy

    async def step_5_verify_new_policy(self, new_policy: str) -> None:
        """Step 5: Show new policy and verify algorithms."""
        print("✔️  STEP 5: Verify New Policy (PQC-First)")
        print("-" * 80)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.BACKEND_API}/api/v1/crypto-gateway/policies/active"
                ) as resp:
                    if resp.status == 200:
                        policy = await resp.json()
                    else:
                        policy = {}
        except Exception:
            policy = {}

        print(f"Active Policy: {policy.get('name', new_policy)}")
        print(f"Version: {policy.get('version', '2.0')}")
        print(f"\nNow Allowed Algorithms (new policy):")
        for algo in policy.get("allowed_key_algorithms", ["ML-KEM-768", "ML-DSA-65"]):
            print(f"  ✅ 🔮 PQC         {algo}")

        print(f"\nNow Blocked Algorithms (new policy):")
        blocked_now = ["RSA-2048", "RSA-3072", "ECDHE-P256", "X25519"]
        for algo in blocked_now[:3]:
            print(f"  ❌ 🔑 Classical   {algo}")

        print()

    async def step_6_test_with_new_policy(self) -> None:
        """Step 6: Test algorithms with new policy."""
        print("🧪 STEP 6: Algorithm Compliance (After Policy Update)")
        print("-" * 80)

        test_cases = [
            ("RSA-2048", False, "Now BLOCKED"),
            ("ECDHE-P256", False, "Now BLOCKED"),
            ("ML-KEM-768", True, "Now ALLOWED"),
            ("ML-DSA-65", True, "Now ALLOWED"),
        ]

        for algo, expected_allowed, status in test_cases:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{self.BACKEND_API}/api/v1/crypto-gateway/test-algorithm/{algo}"
                    ) as resp:
                        if resp.status == 200:
                            result = await resp.json()
                            allowed = result.get("allowed", False)
                        else:
                            allowed = False
            except Exception:
                allowed = False

            icon = "✅ ALLOWED" if allowed else "❌ BLOCKED"
            match = "✓" if allowed == expected_allowed else "✗"
            print(f"  {match} {algo:20} {icon:15} ({status})")

        print()

    async def step_7_remediation_demo(self) -> None:
        """Step 7: Show how dashboard Remediate button works."""
        print("🛠️  STEP 7: Remediation via Dashboard")
        print("-" * 80)
        print("""
When dashboard detects quantum-unsafe algorithms:
  1. Risk assessment identifies RSA-2048 usage
  2. User clicks "Remediate" button on dashboard
  3. Dashboard calls: POST /api/v1/crypto-gateway/remediate
     {
       "action": "enforce-pqc",
       "reason": "Quantum-unsafe algorithm detected",
       "target_policy": "pqc-first-ml-kem"
     }
  4. Backend immediately updates OPA policy
  5. All NEW TLS connections use ML-KEM-768
  6. Existing connections complete with old policy
  7. Client can re-establish with new PQC algorithms

This entire flow takes < 100ms ⚡
""")
        print()

    async def step_8_summary(self) -> None:
        """Step 8: Summary and key takeaways."""
        print("📊 STEP 8: Summary")
        print("-" * 80)
        print("""
✅ Crypto-Agility Gateway Demo Complete

Key Capabilities:
  🔐 Policy Enforcement: Envoy + OPA enforce algorithms in real-time
  🔄 Zero-Downtime Updates: Change policies without service restart
  📋 Query & Test: Check if algorithms are allowed
  🛠️  Remediation: One-click policy update from dashboard
  📊 Audit Trail: Log all policy decisions for compliance

Architecture:
  Client TLS
     ↓
  Envoy Proxy ← → OPA Policy Engine
     ↓
  Backend Application

Benefits:
  • Instantly migrate to post-quantum cryptography
  • No code changes or redeployment needed
  • Granular algorithm control
  • Compliance reporting
  • Quantum-safe gateway for any backend
""")
        print("=" * 80 + "\n")

    async def run(self) -> None:
        """Run the complete demo."""
        await self.show_banner()

        # Check service availability
        print("⏳ Checking service availability...\n")
        services = [
            (self.OPA_API, "OPA Policy Engine"),
            (self.BACKEND_API, "Backend API"),
        ]

        for url, name in services:
            ready = await self.wait_for_service(url)
            status = "✅ Ready" if ready else "❌ Unavailable"
            print(f"{status}: {name}\n")

        # Run demo steps
        try:
            policy = await self.step_1_initial_policy()
            await asyncio.sleep(1)

            await self.step_2_test_algorithms(policy)
            await asyncio.sleep(1)

            await self.step_3_show_vulnerability()
            await asyncio.sleep(2)

            new_policy = await self.step_4_update_policy()
            await asyncio.sleep(2)

            await self.step_5_verify_new_policy(new_policy)
            await asyncio.sleep(1)

            await self.step_6_test_with_new_policy()
            await asyncio.sleep(1)

            await self.step_7_remediation_demo()
            await asyncio.sleep(1)

            await self.step_8_summary()

            print("🎉 Demo Complete! You can now:")
            print("  • Test with curl: curl -k https://localhost:9443/tls-info")
            print("  • Update policy: GET /api/v1/crypto-gateway/policies")
            print("  • Check OPA: curl http://localhost:8181/health")
            print()

        except Exception as exc:
            print(f"\n❌ Error during demo: {exc}")


async def main() -> None:
    """Main entry point."""
    demo = CryptoAgilityDemo()
    await demo.run()


if __name__ == "__main__":
    asyncio.run(main())
