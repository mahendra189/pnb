#!/usr/bin/env python
"""Test TLS/PQC scanning functionality."""

import asyncio
import sys
from app.services.scan_tools import run_sslyze_scan, run_nmap_scan, run_http_scan
from app.core.logging import logger

async def test_scanning():
    """Test all scanning functions."""
    test_target = "example.com"
    
    print(f"Testing TLS scan on {test_target}...")
    try:
        sslyze_result = await run_sslyze_scan(test_target)
        print(f"✓ SSLyze result: {sslyze_result.get('tool')} available={sslyze_result.get('available')}")
        if sslyze_result.get('available'):
            print(f"  - TLS Version: {sslyze_result.get('tls_version')}")
            print(f"  - Cipher: {sslyze_result.get('cipher')}")
            print(f"  - Key Exchange: {sslyze_result.get('key_exchange')}")
        else:
            print(f"  ERROR: {sslyze_result.get('error')}")
    except Exception as e:
        print(f"✗ SSLyze scan failed: {e}")
        import traceback
        traceback.print_exc()
    
    print(f"\nTesting Nmap scan on {test_target}...")
    try:
        nmap_result = await run_nmap_scan(test_target)
        print(f"✓ Nmap result: {nmap_result.get('tool')} available={nmap_result.get('available')}")
        print(f"  - Open ports: {nmap_result.get('open_ports')}")
    except Exception as e:
        print(f"✗ Nmap scan failed: {e}")
    
    print(f"\nTesting HTTP scan on {test_target}...")
    try:
        http_result = await run_http_scan(test_target)
        print(f"✓ HTTP result: {http_result.get('tool')} available={http_result.get('available')}")
        print(f"  - Status: {http_result.get('status_code')}")
    except Exception as e:
        print(f"✗ HTTP scan failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_scanning())
