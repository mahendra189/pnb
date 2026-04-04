#!/usr/bin/env python
"""
Create all database tables using SQLAlchemy ORM models.
Handles enum type creation for PostgreSQL.
"""

import asyncio
from sqlalchemy import text
from app.core.config import get_settings
from app.db.base import Base, engine
from app.db import models  # noqa: F401 - side-effect imports


async def create_enums():
    """Create enum types in PostgreSQL."""
    async with engine.begin() as conn:
        # Create asset_type_enum
        await conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE asset_type_enum AS ENUM (
                    'domain', 'api', 'server', 'ip_address', 'url', 
                    'certificate', 'api_endpoint', 'load_balancer'
                );
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        """))
        
        # Create asset_status_enum
        await conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE asset_status_enum AS ENUM (
                    'pending', 'scanning', 'scanned', 'approved', 'failed', 'error', 'excluded'
                );
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        """))
        
        await conn.commit()


async def create_tables():
    """Create all tables defined in Base.metadata."""
    try:
        # First create enums
        await create_enums()
        print("✓ Enum types created")
        
        # Then create all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✓ All tables created successfully")
    except Exception as e:
        print(f"✗ Error: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(create_tables())
