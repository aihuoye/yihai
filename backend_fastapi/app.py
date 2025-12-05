import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend_fastapi.db import get_pool, init_db_pool
from backend_fastapi.routers import appointments, doctors, schedules, wechat

load_dotenv()

ROOT_DIR = Path(__file__).resolve().parent.parent
LEGACY_BACKEND_DIR = ROOT_DIR / "backend"
ADMIN_DIR = LEGACY_BACKEND_DIR / "admin"

app = FastAPI(title="Medical Backend (FastAPI)", version="1.0.0")

# 全局中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态管理后台
if ADMIN_DIR.exists():
    app.mount("/admin", StaticFiles(directory=str(ADMIN_DIR), html=True), name="admin")


@app.on_event("startup")
async def _startup() -> None:
    app.state.db_pool = await init_db_pool()


@app.on_event("shutdown")
async def _shutdown() -> None:
    pool = getattr(app.state, "db_pool", None)
    if pool:
        pool.close()
        await pool.wait_closed()


# 注册路由
app.include_router(doctors.router)
app.include_router(schedules.router)
app.include_router(appointments.router)
app.include_router(wechat.router)
