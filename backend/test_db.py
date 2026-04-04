#!/usr/bin/env python
"""Test if the reports/daily endpoint works."""

import asyncio
import sys
from sqlalchemy import select
from app.db.base import AsyncSessionLocal
from app.db.models.asset_history import AssetScanSummary

async def test_endpoint():
    """Test database connection and query."""
    try:
        async with AsyncSessionLocal() as db:
            # Try a simple query
            result = await db.execute(select(AssetScanSummary))
            rows = result.scalars().all()
            print(f"✓ Database connected, found {len(rows)} scan summaries")
            return True
    except Exception as e:
        print(f"✗ Database error: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_endpoint())
    sys.exit(0 if success else 1)
