from pathlib import Path

import aiosqlite

DB_PATH = Path(__file__).resolve().parent.parent / "nutrirx.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


async def get_connection() -> aiosqlite.Connection:
    return await aiosqlite.connect(DB_PATH)


async def init_db() -> None:
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(schema)
        await db.commit()
