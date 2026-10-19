"""
Attention Needed Zones Router — Signal anomaly and underreported zone telemetry
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.security import User, require_roles
from backend.app.database.session import get_db
from backend.app.schemas.incident import AttentionZoneResponse
from backend.app.services.incident_service import get_attention_zones, dispatch_zone_scout

router = APIRouter(prefix="/zones", tags=["Attention Zones"])


@router.get("", response_model=List[AttentionZoneResponse])
def list_attention_zones(db: Session = Depends(get_db)):
    """Retrieve all identified underreported or high-deviation operational zones."""
    zones = get_attention_zones(db)
    return [z.to_dict() for z in zones]


@router.patch("/{zone_id}/dispatch", response_model=AttentionZoneResponse)
def dispatch_scout_to_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["coordinator", "admin"])),
):
    """Dispatch a field reconnaissance scout or drone to an underreported sector."""
    zone = dispatch_zone_scout(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")
    return zone.to_dict()


