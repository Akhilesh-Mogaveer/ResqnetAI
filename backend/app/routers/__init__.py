"""
Routers package
"""
from .health import router as health_router
from .nlp import router as nlp_router
from .incidents import router as incidents_router
from .audit_log import router as audit_log_router
from .zones import router as zones_router
from .environmental import router as environmental_router
from .geocoding import router as geocoding_router
from .auth import router as auth_router

__all__ = [
    "health_router",
    "nlp_router",
    "incidents_router",
    "audit_log_router",
    "zones_router",
    "environmental_router",
    "geocoding_router",
    "auth_router",
]

