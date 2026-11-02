import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.db import engine

async def fix_seqs():
    tables = [
        "organizations",
        "users",
        "organization_members",
        "plans",
        "subscriptions",
        "admins",
        "products",
        "customers",
        "orders",
        "conversations",
        "messages",
        "channel_posts",
        "connected_channels",
        "webhook_events",
        "audit_logs",
        "ai_model_configurations",
        "usage_records",
    ]
    async with engine.begin() as conn:
        for t in tables:
            try:
                res = await conn.execute(text(f"SELECT pg_get_serial_sequence('{t}', 'id')"))
                seq_name = res.scalar()
                if seq_name:
                    await conn.execute(text(f"SELECT setval('{seq_name}', COALESCE((SELECT MAX(id) FROM {t}), 0) + 1, false)"))
                    print(f"Fixed sequence {seq_name} for table {t}")
            except Exception as e:
                print(f"Skipping {t}: {e}")

if __name__ == "__main__":
    asyncio.run(fix_seqs())
