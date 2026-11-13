import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal
from sqlalchemy import text

async def cleanup():
    async with SessionLocal() as db:
        query = text("""
            DELETE FROM organizations 
            WHERE id != 1 
              AND slug NOT IN ('artel-flagship', 'artel-official-2026')
              AND (
                  slug LIKE 'shop-%' 
                  OR slug LIKE 'webhook-%' 
                  OR slug LIKE 'boutique-%' 
                  OR slug LIKE 'auto-parts-%' 
                  OR slug LIKE 'cosmetics-%'
                  OR slug LIKE 'store-%'
                  OR slug LIKE 'org-%'
                  OR slug LIKE 'billing-%'
                  OR slug LIKE 'target-store-%'
                  OR slug LIKE 'electro-hub-%'
                  OR slug LIKE 'tech-hub-%'
                  OR slug LIKE 'fashion-brand-%'
                  OR slug LIKE 'parfume-shop-%'
                  OR slug LIKE 'prod-org-%'
                  OR slug = 'test'
              );
        """)
        res = await db.execute(query)
        await db.commit()
        print(f"Deleted {res.rowcount} test organizations.")

        # Show remaining organizations
        res = await db.execute(text("SELECT id, name, slug, status FROM organizations ORDER BY id ASC"))
        rows = res.all()
        print(f"Remaining organizations count: {len(rows)}")
        for r in rows:
            print(f" - ID: {r[0]} | Name: {r[1]} | Slug: {r[2]} | Status: {r[3]}")

if __name__ == "__main__":
    asyncio.run(cleanup())
