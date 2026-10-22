"""
Health and readiness probes
"""

import logging
from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.core.config import settings
from backend.app.database.session import get_db
from backend.app.schemas.nlp import HealthResponse, DEFAULT_DISCLAIMER
from backend.app.services.nlp_service import check_model_readiness

router = APIRouter(prefix="", tags=["Health"])
logger = logging.getLogger("RESQNET.Health")


@router.get("/health", response_model=HealthResponse)
def health_check():
    """
    Lightweight liveness probe.

    This endpoint intentionally does not touch the database, model, external
    services, or inference. Use /health/ready for dependency readiness.
    """
    started = perf_counter()
    response = HealthResponse(status="ALIVE", version=settings.VERSION, disclaimer=DEFAULT_DISCLAIMER)
    logger.info("Liveness probe completed in %.2f ms", (perf_counter() - started) * 1000)
    return response


@router.get("/health/ready")
def readiness_check(db: Session = Depends(get_db)):
    """
    Readiness probe for zero-downtime container/service deployments.
    Does NOT claim ready if required local model files or database are unavailable.
    """
    model_status = check_model_readiness()

    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        db_ok = False
        db_error = str(e)

    if not model_status["is_ready"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "UNREADY",
                "reason": "Model weights or label configuration missing from local directory.",
                "details": model_status,
            },
        )

    if not db_ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "UNREADY",
                "reason": "Database connection failure.",
                "error": db_error,
            },
        )

    return {
        "status": "READY",
        "database": "CONNECTED",
        "model": "LOADED_LOCAL",
        "model_dir": model_status["model_dir"],
        "disclaimer": DEFAULT_DISCLAIMER,
    }
