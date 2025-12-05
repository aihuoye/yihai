import os
from typing import Any

import aiomysql
from aiomysql.cursors import DictCursor
from fastapi import HTTPException, Request

DB_CONFIG: dict[str, Any] = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "db": os.getenv("DB_NAME", "medical_points"),
    "port": int(os.getenv("DB_PORT", "3306")),
}


async def init_db_pool() -> aiomysql.Pool:
    return await aiomysql.create_pool(
        autocommit=True,
        minsize=1,
        maxsize=10,
        charset="utf8mb4",
        cursorclass=DictCursor,
        **DB_CONFIG,
    )


async def get_pool(request: Request) -> aiomysql.Pool:
    pool: aiomysql.Pool = getattr(request.app.state, "db_pool", None)
    if not pool:
        raise HTTPException(status_code=500, detail="Database pool not initialized")
    return pool
