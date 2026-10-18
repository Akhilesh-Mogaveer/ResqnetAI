"""
RESQNET AI — Incident Management & Coordinator Audit Service
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models.incident import Incident, AuditLog, AttentionZone
from backend.app.schemas.incident import IncidentCreate, IncidentUpdate
from backend.app.services.nlp_service import enrich_incident_with_nlp
from backend.app.services.geocoding_service import resolve_incident_coordinates
from backend.app.services.scoring_service import calculate_incident_scores

logger = logging.getLogger("RESQNET.IncidentService")


def _generate_audit_log_id() -> str:
    """Generate a collision-resistant audit log ID."""
    return f"aud-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}-{uuid.uuid4().hex[:6]}"


def _generate_incident_id(db: Session) -> str:
    """Generate sequential incident identifier (e.g. RQN-0435)."""
    count = db.query(Incident).count()
    return f"RQN-{430 + count:04d}"


def create_incident(db: Session, incident_in: IncidentCreate) -> Incident:
    """
    Create a new incident report in SQLite.
    Runs HumAID DistilBERT text classification, coordinate resolution, and
    deterministic severity & priority scoring.
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

    # 1. Resolve Geographic Coordinates
    resolved_coords, is_synth, loc_source = resolve_incident_coordinates(
        supplied_coords=incident_in.coordinates,
        location_name=incident_in.locationName,
        sector=incident_in.sector,
        explicit_synthetic_flag=getattr(incident_in, "is_synthetic_location", False),
    )

    humaid_cat = nlp_results.get("humaid_category") or incident_in.humaid_category
    humaid_conf = nlp_results.get("humaid_confidence")
    all_probs = nlp_results.get("all_probabilities") or {}

    # 2. Execute Deterministic Severity & Priority Scoring
    scoring_result = calculate_incident_scores(
        report_text=report_text,
        title=incident_in.title,
        humaid_category=humaid_cat,
        humaid_confidence=humaid_conf,
        all_probabilities=all_probs,
        coordinates=resolved_coords,
        location_source=loc_source,
        location_name=incident_in.locationName,
        sector=incident_in.sector,
        people_affected=incident_in.peopleAffected,
        verification_status="unverified",
        duplicate_count=0,
        timestamp=now_iso,
        source_summary=incident_in.sourceSummary,
    )

    # 3. Check for deliberate manual coordinator overrides
    is_prio_overridden = bool(getattr(incident_in, "is_priority_overridden", False))
    is_sev_overridden = bool(getattr(incident_in, "is_severity_overridden", False))

    final_severity = incident_in.severity if is_sev_overridden else scoring_result.severity
    final_priority = incident_in.priorityScore if is_prio_overridden else scoring_result.priority_score
    final_location_conf = scoring_result.location_confidence
    final_reliability = (
        incident_in.reportReliability
        if "reportReliability" in incident_in.model_fields_set
        else scoring_result.report_reliability
    )
    final_affected_numeric = (
        incident_in.affectedCountNumeric
        if ("affectedCountNumeric" in incident_in.model_fields_set and incident_in.affectedCountNumeric > 0)
        else scoring_result.affected_count_numeric
    )
    final_why = (
        incident_in.whyPrioritised
        if ("whyPrioritised" in incident_in.model_fields_set and incident_in.whyPrioritised.strip())
        else scoring_result.why_prioritised
    )
    final_risks = (
        incident_in.riskFactors
        if ("riskFactors" in incident_in.model_fields_set and incident_in.riskFactors)
        else scoring_result.risk_factors
    )

    incident = Incident(
        id=incident_id,
        title=incident_in.title,
        type=incident_in.type,
        sector=incident_in.sector,
        locationName=incident_in.locationName,
        severity=final_severity,
        priorityScore=final_priority,
        reportReliability=final_reliability,
        locationConfidence=final_location_conf,
        peopleAffected=incident_in.peopleAffected,
        affectedCountNumeric=final_affected_numeric,
        timeAgo="Just now",
        timestamp=now_iso,
        verificationStatus="unverified",
        responseStatus="triage",
        assignedTeam=None,
        sourceSummary=incident_in.sourceSummary or "Citizen / Dispatch incoming report",
        signalSynthesis=incident_in.signalSynthesis or "Automated sensor & transcript intake",
        whyPrioritised=final_why,
        report_text=report_text,
        original_report_text=report_text,
        humaid_category=humaid_cat,
        humaid_confidence=humaid_conf,
        nlp_status=nlp_results.get("nlp_status", "SKIPPED" if not report_text else "SUCCESS"),
        nlp_disclaimer=nlp_results.get("nlp_disclaimer", "RESQNET AI Automated NLP Prediction."),
    )

    incident.coordinates = resolved_coords
    incident.is_synthetic_location = is_synth
    incident.location_source = loc_source
    incident.riskFactors = final_risks

    initial_notes = []
    if is_prio_overridden:
        initial_notes.append({
            "id": f"n-prio-{incident.id}",
            "author": "Coordinator Intake",
            "time": "Just now",
            "text": f"Priority manually overridden at intake to {final_priority}.",
            "override_type": "priority",
            "value": final_priority,
        })
    if is_sev_overridden:
        initial_notes.append({
            "id": f"n-sev-{incident.id}",
            "author": "Coordinator Intake",
            "time": "Just now",
            "text": f"Severity manually overridden at intake to {final_severity}.",
            "override_type": "severity",
            "value": final_severity,
        })

    incident.notes = initial_notes
    if all_probs:
        incident.all_probabilities = all_probs
    incident._is_priority_overridden = is_prio_overridden
    incident._is_severity_overridden = is_sev_overridden

    db.add(incident)

    # Add audit log for creation
    audit_entry = AuditLog(
        id=_generate_audit_log_id(),
        timestamp=now_iso,
        incidentId=incident.id,
        operator="System Intake",
        actionType="INCIDENT_CREATED",
        oldValue="None",
        newValue=f"{incident.title} ({incident.severity.upper()} - Priority {incident.priorityScore})",
        reason="Incident intake created with automated severity & priority scoring.",
    )
    db.add(audit_entry)

    if is_prio_overridden:
        audit_prio = AuditLog(
            id=_generate_audit_log_id(),
            timestamp=now_iso,
            incidentId=incident.id,
            operator="Coordinator Intake",
            actionType="PRIORITY_OVERRIDE",
            oldValue=str(scoring_result.priority_score),
            newValue=str(final_priority),
            reason="Explicit manual priority override supplied at incident intake.",
        )
        db.add(audit_prio)

    if is_sev_overridden:
        audit_sev = AuditLog(
            id=_generate_audit_log_id(),
            timestamp=now_iso,
            incidentId=incident.id,
            operator="Coordinator Intake",
            actionType="SEVERITY_OVERRIDE",
            oldValue=str(scoring_result.severity),
            newValue=str(final_severity),
            reason="Explicit manual severity override supplied at incident intake.",
        )
        db.add(audit_sev)

    db.commit()
    db.refresh(incident)
    logger.info(f"Created incident {incident.id}: {incident.title} (Severity: {incident.severity}, Priority: {incident.priorityScore})")
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
        id=_generate_audit_log_id(),
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
        id=_generate_audit_log_id(),
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
        id=_generate_audit_log_id(),
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
        id=_generate_audit_log_id(),
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

