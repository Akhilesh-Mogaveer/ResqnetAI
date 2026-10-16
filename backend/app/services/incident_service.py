"""
RESQNET AI — Incident Management & Coordinator Audit Service
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models.incident import Incident, AuditLog, AttentionZone
from backend.app.schemas.incident import IncidentCreate, IncidentUpdate
from backend.app.services.nlp_service import enrich_incident_with_nlp

logger = logging.getLogger("RESQNET.IncidentService")


def _generate_incident_id(db: Session) -> str:
    """Generate sequential incident identifier (e.g. RQN-0435)."""
    count = db.query(Incident).count()
    return f"RQN-{430 + count:04d}"


def create_incident(db: Session, incident_in: IncidentCreate) -> Incident:
    """
    Create a new incident report in SQLite.
    Optionally runs HumAID DistilBERT text classification on the report text.
    """
    incident_id = incident_in.id or _generate_incident_id(db)
    now_iso = datetime.now(timezone.utc).isoformat()

    report_text = incident_in.report_text or incident_in.rawReportText or incident_in.raw_report_text or ""
    nlp_results = {}

    if incident_in.run_nlp_classification and report_text.strip():
        # Call HumAID classifier
        nlp_dict = enrich_incident_with_nlp({"text": report_text})
        nlp_results = {
            "humaid_category": nlp_dict.get("humaid_category"),
            "humaid_confidence": nlp_dict.get("humaid_confidence"),
            "all_probabilities": nlp_dict.get("all_probabilities", {}),
            "nlp_status": nlp_dict.get("nlp_status"),
            "nlp_disclaimer": nlp_dict.get("nlp_disclaimer"),
        }

    incident = Incident(
        id=incident_id,
        title=incident_in.title,
        type=incident_in.type,
        sector=incident_in.sector,
        locationName=incident_in.locationName,
        severity=incident_in.severity,
        priorityScore=incident_in.priorityScore,
        reportReliability=incident_in.reportReliability,
        locationConfidence=incident_in.locationConfidence,
        peopleAffected=incident_in.peopleAffected,
        affectedCountNumeric=incident_in.affectedCountNumeric,
        timeAgo="Just now",
        timestamp=now_iso,
        verificationStatus="unverified",
        responseStatus="triage",
        assignedTeam=None,
        sourceSummary=incident_in.sourceSummary or "Citizen / Dispatch incoming report",
        signalSynthesis=incident_in.signalSynthesis or "Automated sensor & transcript intake",
        whyPrioritised=incident_in.whyPrioritised or "Newly reported emergency requiring coordinator triage.",
        report_text=report_text,
        original_report_text=report_text,
        humaid_category=nlp_results.get("humaid_category"),
        humaid_confidence=nlp_results.get("humaid_confidence"),
        nlp_status=nlp_results.get("nlp_status", "SKIPPED" if not report_text else "SUCCESS"),
        nlp_disclaimer=nlp_results.get("nlp_disclaimer", "RESQNET AI Automated NLP Prediction."),
    )

    incident.coordinates = incident_in.coordinates
    incident.riskFactors = incident_in.riskFactors
    incident.notes = []
    if nlp_results.get("all_probabilities"):
        incident.all_probabilities = nlp_results["all_probabilities"]

    db.add(incident)

    # Add audit log for creation
    audit_entry = AuditLog(
        id=f"aud-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]}",
        timestamp=now_iso,
        incidentId=incident.id,
        operator="System Intake",
        actionType="INCIDENT_CREATED",
        oldValue="None",
        newValue=f"{incident.title} ({incident.severity.upper()})",
        reason="Incident intake created via RESQNET backend service.",
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(incident)
    logger.info(f"Created incident {incident.id}: {incident.title}")
    return incident


def get_incidents(
    db: Session,
    severity: Optional[str] = None,
    verificationStatus: Optional[str] = None,
    responseStatus: Optional[str] = None,
    sector: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
) -> List[Incident]:
    """Retrieve incidents with optional filtering, ordered by priority score descending."""
    query = db.query(Incident)

    if severity:
        query = query.filter(Incident.severity == severity.lower())
    if verificationStatus:
        query = query.filter(Incident.verificationStatus == verificationStatus.lower())
    if responseStatus:
        query = query.filter(Incident.responseStatus == responseStatus.lower())
    if sector:
        query = query.filter(Incident.sector.ilike(f"%{sector}%"))
    if category:
        query = query.filter(Incident.humaid_category == category.lower())
    if search:
        query = query.filter(
            (Incident.title.ilike(f"%{search}%"))
            | (Incident.locationName.ilike(f"%{search}%"))
            | (Incident.report_text.ilike(f"%{search}%"))
            | (Incident.id.ilike(f"%{search}%"))
        )

    return query.order_by(desc(Incident.priorityScore)).all()


def get_incident_by_id(db: Session, incident_id: str) -> Optional[Incident]:
    """Retrieve single incident by ID."""
    return db.query(Incident).filter(Incident.id == incident_id).first()


def update_incident_verification(
    db: Session,
    incident_id: str,
    new_status: str,
    operator: str,
    reason: str,
) -> Optional[Incident]:
    """Update human verification state and record in audit log."""
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        return None

    old_status = incident.verificationStatus
    incident.verificationStatus = new_status
    now_iso = datetime.now(timezone.utc).isoformat()

    audit_entry = AuditLog(
        id=f"aud-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]}",
        timestamp=now_iso,
        incidentId=incident.id,
        operator=operator,
        actionType="VERIFICATION_STATUS_CHANGE",
        oldValue=old_status,
        newValue=new_status,
        reason=reason,
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(incident)
    return incident


def update_incident_response_status(
    db: Session,
    incident_id: str,
    new_status: str,
    assigned_team: Optional[str],
    operator: str,
    reason: str,
) -> Optional[Incident]:
    """Update dispatch response state and assigned squad."""
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        return None

    old_status = incident.responseStatus
    incident.responseStatus = new_status
    if assigned_team is not None:
        incident.assignedTeam = assigned_team
    now_iso = datetime.now(timezone.utc).isoformat()

    audit_entry = AuditLog(
        id=f"aud-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]}",
        timestamp=now_iso,
        incidentId=incident.id,
        operator=operator,
        actionType="RESPONSE_STATUS_CHANGE",
        oldValue=old_status,
        newValue=f"{new_status}" + (f" ({assigned_team})" if assigned_team else ""),
        reason=reason,
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(incident)
    return incident


def override_incident_priority(
    db: Session,
    incident_id: str,
    new_priority: int,
    operator: str,
    reason: str,
) -> Optional[Incident]:
    """Apply manual coordinator priority override with audit log."""
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        return None

    old_priority = incident.priorityScore
    incident.priorityScore = new_priority
    now_iso = datetime.now(timezone.utc).isoformat()

    # Append note to incident notes
    current_notes = list(incident.notes)
    current_notes.append({
        "id": f"n-{len(current_notes) + 1}",
        "author": operator,
        "time": "Just now",
        "text": f"Priority manually overridden from {old_priority} to {new_priority}. Reason: {reason}",
    })
    incident.notes = current_notes

    audit_entry = AuditLog(
        id=f"aud-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]}",
        timestamp=now_iso,
        incidentId=incident.id,
        operator=operator,
        actionType="PRIORITY_OVERRIDE",
        oldValue=str(old_priority),
        newValue=str(new_priority),
        reason=reason,
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(incident)
    return incident


def get_audit_logs(db: Session, incident_id: Optional[str] = None) -> List[AuditLog]:
    """Retrieve audit trail logs ordered by timestamp descending."""
    query = db.query(AuditLog)
    if incident_id:
        query = query.filter(AuditLog.incidentId == incident_id)
    return query.order_by(desc(AuditLog.timestamp)).all()


def get_attention_zones(db: Session) -> List[AttentionZone]:
    """Retrieve all attention needed / underreported zones."""
    return db.query(AttentionZone).all()


def dispatch_zone_scout(
    db: Session,
    zone_id: str,
    operator: str = "Coordinator Jordan Davis",
) -> Optional[AttentionZone]:
    """Dispatch a field reconnaissance scout or drone to an underreported sector."""
    zone = db.query(AttentionZone).filter(AttentionZone.id == zone_id).first()
    if not zone:
        return None
    zone.scoutStatus = "Recon In Progress"
    now_iso = datetime.now(timezone.utc).isoformat()
    audit_entry = AuditLog(
        id=f"aud-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]}",
        timestamp=now_iso,
        incidentId=zone.id,
        operator=operator,
        actionType="RECON_DISPATCHED",
        oldValue="Unassigned",
        newValue="Recon Drone / Scout Dispatched",
        reason=f"Proactive ground truth scout sent to underreported sector {zone.name}.",
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(zone)
    return zone

