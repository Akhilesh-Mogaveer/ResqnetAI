"""
RESQNET AI — Emergency Response Coordination Backend API

FastAPI application providing persistent incident management, coordinator audit logs,
underreported zone analytics, and real-time HumAID DistilBERT text classification.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.core.config import settings
from backend.app.database.session import SessionLocal
from backend.app.database.init_db import init_db
from backend.app.schemas.nlp import DEFAULT_DISCLAIMER
from backend.app.routers import (
    health_router,
    nlp_router,
    incidents_router,
    audit_log_router,
    zones_router,
    environmental_router,
    geocoding_router,
    auth_router,
    sms_router,
    notifications_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("RESQNET.Backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events: Database initialization and model verification."""
    logger.info("Initializing RESQNET database and initial incident records...")
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()

    logger.info("Application startup complete; NLP model is initialized on readiness/inference demand.")

    yield

    logger.info("Shutting down RESQNET backend services...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production backend for RESQNET AI emergency response coordination.\n\n"
        "### Key Capabilities:\n"
        "- **Incident Management:** Persistent incident reporting, lifecycle status, triage prioritization.\n"
        "- **Coordinator Overrides:** Human-in-the-loop priority adjustments with immutable audit trails.\n"
        "- **HumAID NLP Classification:** Categorization of crisis texts via fine-tuned DistilBERT.\n"
        "- **Attention Zones:** Signal void and underreporting anomaly detection.\n\n"
        f"**Safety Notice:** {DEFAULT_DISCLAIMER}"
    ),
    lifespan=lifespan,
)

# Configure CORS
configured_origins = (
    [o for o in settings.CORS_ORIGINS if o != "*"]
    if isinstance(settings.CORS_ORIGINS, list)
    else [o.strip() for o in str(settings.CORS_ORIGINS).split(",") if o.strip() and o.strip() != "*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins,
    allow_origin_regex=r"https://.*\.onrender\.com|https://.*\.vercel\.app|https://.*\.netlify\.app|http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount modular routers under /api/v1
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(nlp_router, prefix=settings.API_V1_STR)
app.include_router(incidents_router, prefix=settings.API_V1_STR)
app.include_router(audit_log_router, prefix=settings.API_V1_STR)
app.include_router(zones_router, prefix=settings.API_V1_STR)
app.include_router(environmental_router, prefix=settings.API_V1_STR)
app.include_router(geocoding_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(sms_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root_status():
    """Root landing endpoint with system status overview."""
    return JSONResponse(
        content={
            "project": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "docs_url": "/docs",
            "api_v1_prefix": settings.API_V1_STR,
            "disclaimer": DEFAULT_DISCLAIMER,
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
