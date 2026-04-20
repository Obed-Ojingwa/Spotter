# C:\Users\Melody\Documents\Spotter\backend\app\main.py

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import engine, Base

# Import all model modules so Base knows about every table
import app.models          # existing 14 tables
import app.rbac.models     # new 7 RBAC tables

# Routers
from app.auth.router import router as auth_router
from app.jobs.router import router as jobs_router
from app.jobs.applications import router as applications_router
from app.users.seeker_router import router as seeker_router
from app.matching.router import router as matching_router
from app.spotters.router import router as spotter_router
from app.agents.router import router as agent_router
from app.payments.router import router as payments_router
from app.admin.router import router as admin_router
from app.organizations.router import router as org_router
from app.rbac.router import router as rbac_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create ALL tables (existing + RBAC) on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
    yield
    await engine.dispose()


app = FastAPI(
    title="SPOTTER API",
    description="Recruitment and talent-matching platform with dynamic RBAC",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://192.168.1.127:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.LOCAL_STORAGE_PATH), name="uploads")

# ── All routers ───────────────────────────────────────────────────────────
app.include_router(auth_router,         prefix="/api")
app.include_router(jobs_router,         prefix="/api")
app.include_router(applications_router, prefix="/api")
app.include_router(seeker_router,       prefix="/api")
app.include_router(org_router,          prefix="/api")
app.include_router(matching_router,     prefix="/api")
app.include_router(spotter_router,      prefix="/api")
app.include_router(agent_router,        prefix="/api")
app.include_router(payments_router,     prefix="/api")
app.include_router(admin_router,        prefix="/api")
app.include_router(rbac_router,         prefix="/api")  # ← new RBAC endpoints


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": "2.0.0"}
