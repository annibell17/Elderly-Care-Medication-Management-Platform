import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from pathlib import Path

from app.core.config import settings
from app.core.database import Base, engine
from app.seed_data import seed_database
from app.services.scheduler import start_scheduler, shutdown_scheduler

# Routers
from app.api.auth import router as auth_router
from app.api.medications import router as medications_router
from app.api.appointments import router as appointments_router
from app.api.care_network import router as care_network_router
from app.api.intelligence import router as intelligence_router
from app.api.ocr import router as ocr_router
from app.api.notifications import router as notifications_router
from app.api.health_continuity import router as health_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("CareCircle")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing CareCircle backend...")
    # Ensure database schema is created
    Base.metadata.create_all(bind=engine)
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Seed demo data if database is fresh
    seed_database()
    # Start background scheduler for reminders, escalations, and refills
    start_scheduler()
    yield
    logger.info("Shutting down CareCircle backend...")
    shutdown_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware (Allow all origins for frictionless hackathon demonstration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 Router Registration
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(medications_router, prefix=settings.API_V1_STR)
app.include_router(appointments_router, prefix=settings.API_V1_STR)
app.include_router(care_network_router, prefix=settings.API_V1_STR)
app.include_router(intelligence_router, prefix=settings.API_V1_STR)
app.include_router(ocr_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(health_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "scheduler": "active",
        "version": settings.VERSION
    }

# Mount static frontend build if it exists
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API routes to be handled by routers
        if full_path.startswith("api/") or full_path == "api":
            return {"error": "Not Found"}
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "message": "Welcome to CareCircle API",
            "philosophy": "Independence first. Assistance when needed. Intervention when necessary.",
            "status": "online",
            "version": settings.VERSION,
            "docs_url": "/docs"
        }
