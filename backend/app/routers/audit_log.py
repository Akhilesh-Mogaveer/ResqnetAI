"""
Audit Log Router — System-wide coordinator decision audit trail
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.incident import AuditLogResponse
from backend.app.services.incident_service import get_audit_logs

router = APIRouter(prefix="/audit-log", tags=["Audit Log"])


@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    incident_id: Optional[str] = Query(None, description="Filter logs for a specific incident"),
    db: Session = Depends(get_db),
):
    """Retrieve full audit log history for compliance and oversight."""
    logs = get_audit_logs(db, incident_id=incident_id)
    return [l.to_dict() for l in logs]
