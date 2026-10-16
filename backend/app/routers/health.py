"""
Health and readiness probes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.core.config import settings
from backend.app.database.session import get_db
from backend.app.schemas.nlp import HealthResponse, DEFAULT_DISCLAIMER
from backend.app.services.nlp_service import check_model_readiness

router = APIRouter(prefix="", tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    """
    Liveness and basic health check.
    Reports operational status of database and model availability.
    """
    model_status = check_model_readiness()

    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    overall_status = "HEALTHY" if (model_status["is_ready"] and db_ok) else "DEGRADED"

    return HealthResponse(
        status=overall_status,
        version=settings.VERSION,
        model_dir=model_status["model_dir"],
        model_loaded=model_status["is_ready"],
        database_connected=db_ok,
        disclaimer=DEFAULT_DISCLAIMER,
    )


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
