"""
RESQNET AI — Incident Management & Coordinator Audit Service
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models.incident import Incident, AuditLog, AttentionZone
from backend.app.schemas.incident import IncidentCreate, IncidentUpdate
from backend.app.core.security import User, UserRole
from backend.app.services.nlp_service import enrich_incident_with_nlp
from backend.app.services.geocoding_service import (
    resolve_incident_coordinates,
    validate_coordinates,
    get_resolution_status_for_source,
)
from backend.app.services.scoring_service import (
    calculate_incident_scores,
    calculate_incident_severity,
    calculate_priority_score,
    calculate_report_reliability,
    calculate_location_confidence,
    generate_why_prioritised,
    parse_affected_count,
    extract_risk_factors,
)

logger = logging.getLogger("RESQNET.IncidentService")


def _generate_audit_log_id() -> str:
    """Generate a collision-resistant audit log ID."""
    return f"aud-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}-{uuid.uuid4().hex[:6]}"


def _generate_incident_id(db: Session) -> str:
    """Generate sequential, collision-resistant incident identifier (e.g. RQN-0451)."""
    all_ids = [row[0] for row in db.query(Incident.id).all() if row[0] and row[0].startswith("RQN-")]
    max_num = 429
    for inc_id in all_ids:
        parts = inc_id.split("-")
        if len(parts) >= 2 and parts[1].isdigit():
            max_num = max(max_num, int(parts[1]))

    candidate = max_num + 1
    while db.query(Incident).filter(Incident.id == f"RQN-{candidate:04d}").first() is not None:
        candidate += 1
    return f"RQN-{candidate:04d}"


def create_incident(
    db: Session,
    incident_in: IncidentCreate,
    current_user: Optional[User] = None,
) -> Incident:
    """
    Create a new incident report in SQLite.
    Runs HumAID DistilBERT text classification, coordinate resolution, and
    deterministic severity & priority scoring.

    Enforces that manual priority/severity overrides require coordinator or
    administrator authentication and a mandatory justification reason.
    Anonymous public reports cannot set override flags or force custom scores.
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
    if incident_in.coordinates is not None:
        is_valid_c, c_err = validate_coordinates(incident_in.coordinates)
        if not is_valid_c:
            raise ValueError(f"Invalid coordinate specification: {c_err}")

    resolved_coords, is_synth, loc_source = resolve_incident_coordinates(
        supplied_coords=incident_in.coordinates,
        location_name=incident_in.locationName,
        sector=incident_in.sector,
        explicit_synthetic_flag=getattr(incident_in, "is_synthetic_location", False),
    )
    loc_resolution_status = (
        incident_in.location_resolution_status
        or get_resolution_status_for_source(loc_source, resolved_coords)
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

    # 3. Check for deliberate manual coordinator overrides with strict server-side RBAC
    is_prio_overridden = bool(getattr(incident_in, "is_priority_overridden", False))
    is_sev_overridden = bool(getattr(incident_in, "is_severity_overridden", False))

    if is_prio_overridden or is_sev_overridden:
        if current_user is None:
            raise PermissionError(
                "Authentication required: Manual priority or severity overrides require coordinator or administrator credentials."
            )
        if current_user.role not in (UserRole.COORDINATOR, UserRole.ADMIN):
            raise PermissionError(
                f"Access denied: Role '{current_user.role.value}' is not authorized to apply manual priority or severity overrides."
            )
        override_rs = (getattr(incident_in, "override_reason", None) or "").strip()
        if not override_rs:
            raise ValueError(
                "A mandatory justification reason is required for manual priority or severity overrides."
            )
        override_op = getattr(incident_in, "override_operator", None) or current_user.name
    else:
        override_rs = None
        override_op = "System Intake"

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

    resolved_people_affected = (
        getattr(incident_in, "people_affected", None)
        or (incident_in.peopleAffected if incident_in.peopleAffected != "Unknown count" else None)
        or (f"{final_affected_numeric} individuals affected" if final_affected_numeric > 0 else incident_in.peopleAffected)
    )

    rep_source = getattr(incident_in, "report_source", None) or "Officer/Phone Call"
    src_ref = getattr(incident_in, "source_reference", None)
    if incident_in.sourceSummary:
        final_source_summary = incident_in.sourceSummary
    elif src_ref:
        final_source_summary = f"{rep_source} [Ref: {src_ref}] - Intake via Emergency Report Form"
    else:
        final_source_summary = f"{rep_source} - Intake via Emergency Report Form"

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
        peopleAffected=resolved_people_affected,
        affectedCountNumeric=final_affected_numeric,
        timeAgo="Just now",
        timestamp=now_iso,
        verificationStatus="unverified",
        responseStatus="triage",
        assignedTeam=None,
        sourceSummary=final_source_summary,
        signalSynthesis=incident_in.signalSynthesis or f"Intake channel: {rep_source}. Automated NLP & scoring applied.",
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
    incident.location_resolution_status = loc_resolution_status
    incident.riskFactors = final_risks
    incident.report_source = rep_source
    incident.source_reference = src_ref

    initial_notes = []
    if is_prio_overridden:
        initial_notes.append({
            "id": f"n-prio-{incident.id}",
            "author": override_op,
            "time": "Just now",
            "text": f"Priority manually overridden at intake to {final_priority}. Reason: {override_rs}",
            "override_type": "priority",
            "value": final_priority,
        })
    if is_sev_overridden:
        initial_notes.append({
            "id": f"n-sev-{incident.id}",
            "author": override_op,
            "time": "Just now",
            "text": f"Severity manually overridden at intake to {final_severity}. Reason: {override_rs}",
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
        operator=override_op if (is_prio_overridden or is_sev_overridden) else "System Intake",
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
            operator=override_op,
            actionType="PRIORITY_OVERRIDE",
            oldValue=str(scoring_result.priority_score),
            newValue=str(final_priority),
            reason=override_rs,
        )
        db.add(audit_prio)

    if is_sev_overridden:
        audit_sev = AuditLog(
            id=_generate_audit_log_id(),
            timestamp=now_iso,
            incidentId=incident.id,
            operator=override_op,
            actionType="SEVERITY_OVERRIDE",
            oldValue=str(scoring_result.severity),
            newValue=str(final_severity),
            reason=override_rs,
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
    include_duplicates: bool = False,
) -> List[Incident]:
    """
    Retrieve incidents with optional filtering, ordered by priority score descending.
    By default (include_duplicates=False), merged duplicate records are strictly excluded
    so operational views display only authoritative canonical records.
    """
    query = db.query(Incident)

    if not include_duplicates and responseStatus != "merged_duplicate":
        query = query.filter(Incident.is_duplicate == False).filter(Incident.responseStatus != "merged_duplicate")

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


def get_priority_queue(
    db: Session,
    limit: Optional[int] = None,
) -> List[Incident]:
    """
    Retrieve active canonical incidents for the Operational Priority Queue.
    Strictly excludes merged duplicate records and resolved incidents.
    Ordered by priority score descending.
    """
    query = (
        db.query(Incident)
        .filter(Incident.is_duplicate == False)
        .filter(Incident.responseStatus != "merged_duplicate")
        .filter(Incident.responseStatus != "resolved")
        .order_by(desc(Incident.priorityScore))
    )
    if limit and limit > 0:
        query = query.limit(limit)
    return query.all()


def get_incident_by_id(db: Session, incident_id: str) -> Optional[Incident]:
    """Retrieve single incident by ID."""
    return db.query(Incident).filter(Incident.id == incident_id).first()


def rescore_incident(
    db: Session,
    incident: Incident,
    reason: str,
    operator: str = "RESQNET Scoring Engine",
    merged_duplicate: Optional[Incident] = None,
    commit: bool = True,
) -> Tuple[Incident, List[AuditLog]]:
    """
    Recalculate deterministic incident priority and severity.
    
    Guarantees:
    - Never overwrites coordinator manual priority or severity overrides.
    - Updates affected-person count and merges risk factors when a duplicate is merged.
    - Recalculates priority score based on new verification or merged evidence.
    - Creates audit logs ONLY when priority or severity scores actually change (no duplicate logs).
    - Persists changes to SQLite database when commit=True.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    new_audit_logs: List[AuditLog] = []

    # 1. Merge evidence if a duplicate incident report is provided
    if merged_duplicate:
        # Check if duplicate reports a higher casualty / affected count
        old_affected = incident.affectedCountNumeric or 0
        dup_people_desc = getattr(merged_duplicate, "people_affected", None) or merged_duplicate.peopleAffected
        parsed_dup_affected = parse_affected_count(
            people_affected=dup_people_desc,
            text=f"{merged_duplicate.title or ''}. {merged_duplicate.report_text or ''}",
        )
        dup_affected = max(merged_duplicate.affectedCountNumeric or 0, parsed_dup_affected)
        if (not dup_people_desc or dup_people_desc.strip().lower() in ("unknown", "unknown count")) and dup_affected > 0:
            dup_people_desc = f"{dup_affected} individuals affected"

        if dup_affected > old_affected:
            incident.affectedCountNumeric = dup_affected
            if dup_people_desc and (
                not incident.peopleAffected or incident.peopleAffected.strip().lower() in ("none", "0", "0 casualties", "unknown", "unknown count")
            ):
                incident.peopleAffected = dup_people_desc
            elif dup_people_desc and incident.peopleAffected and dup_people_desc not in incident.peopleAffected:
                incident.peopleAffected = f"{incident.peopleAffected}; Merged {merged_duplicate.id}: {dup_people_desc}"

        # Combine risk factors
        current_risks = list(incident.riskFactors or [])
        dup_risks = list(merged_duplicate.riskFactors or [])
        dup_extra = extract_risk_factors(
            report_text=f"{merged_duplicate.title or ''}. {merged_duplicate.report_text or ''}",
            humaid_category=merged_duplicate.humaid_category,
            affected_count=incident.affectedCountNumeric or 0,
            coordinates=incident.coordinates,
            verification_status=incident.verificationStatus,
            duplicate_count=incident.duplicate_count or 0,
        )
        incident.riskFactors = list(dict.fromkeys(current_risks + dup_risks + dup_extra))

        full_text = f"{incident.title or ''}. {incident.report_text or ''} [Merged {merged_duplicate.id}: {merged_duplicate.title or ''}. {merged_duplicate.report_text or ''}]".strip()
    else:
        full_text = f"{incident.title or ''}. {incident.report_text or ''}".strip()

    # 2. Severity Evaluation (respecting coordinator override)
    old_severity = incident.severity
    if incident.is_severity_overridden:
        new_severity = old_severity
    else:
        new_severity = calculate_incident_severity(
            humaid_category=incident.humaid_category,
            humaid_confidence=incident.humaid_confidence,
            all_probabilities=incident.all_probabilities,
            report_text=full_text,
            affected_count=incident.affectedCountNumeric or 0,
            risk_factors=incident.riskFactors or [],
        )
        if merged_duplicate:
            # Merging duplicate should not downgrade severity if duplicate had higher severity tier
            severity_tiers = {"critical": 4, "high": 3, "moderate": 2, "low": 1}
            dup_sev = (merged_duplicate.severity or "low").lower()
            if severity_tiers.get(dup_sev, 1) > severity_tiers.get(new_severity, 1):
                new_severity = dup_sev

    # 3. Priority Evaluation (respecting coordinator override)
    old_priority = incident.priorityScore
    if incident.is_priority_overridden:
        new_priority = old_priority
    else:
        new_priority, breakdown = calculate_priority_score(
            severity=new_severity,
            humaid_category=incident.humaid_category,
            humaid_confidence=incident.humaid_confidence,
            all_probabilities=incident.all_probabilities,
            affected_count=incident.affectedCountNumeric or 0,
            verification_status=incident.verificationStatus,
            location_confidence=incident.locationConfidence or 70,
            duplicate_count=incident.duplicate_count or 0,
            timestamp=incident.timestamp,
            risk_factors=incident.riskFactors or [],
        )

    # 4. Update Report Reliability & Explainable Summary
    if incident.reportReliability is None:
        has_coords = (
            incident.coordinates is not None
            and len(incident.coordinates) == 2
            and incident.coordinates[0] is not None
        )
        incident.reportReliability = calculate_report_reliability(
            source_summary=incident.sourceSummary,
            verification_status=incident.verificationStatus,
            duplicate_count=incident.duplicate_count or 0,
            has_coordinates=has_coords,
        )
    incident.whyPrioritised = generate_why_prioritised(
        severity=new_severity,
        priority_score=new_priority,
        affected_count=incident.affectedCountNumeric or 0,
        humaid_category=incident.humaid_category,
        risk_factors=incident.riskFactors or [],
        location_confidence=incident.locationConfidence or 70,
        verification_status=incident.verificationStatus,
        duplicate_count=incident.duplicate_count or 0,
    )

    # 5. Persist audit logs ONLY when scores actually change (no duplicate audit entries)
    if new_severity != old_severity:
        incident.severity = new_severity
        audit_sev = AuditLog(
            id=_generate_audit_log_id(),
            timestamp=now_iso,
            incidentId=incident.id,
            operator=operator,
            actionType="SEVERITY_RESCORING",
            oldValue=str(old_severity),
            newValue=str(new_severity),
            reason=f"{reason} (Severity updated from '{old_severity}' to '{new_severity}')",
        )
        db.add(audit_sev)
        new_audit_logs.append(audit_sev)

    if new_priority != old_priority:
        incident.priorityScore = new_priority
        audit_prio = AuditLog(
            id=_generate_audit_log_id(),
            timestamp=now_iso,
            incidentId=incident.id,
            operator=operator,
            actionType="PRIORITY_RESCORING",
            oldValue=str(old_priority),
            newValue=str(new_priority),
            reason=f"{reason} (Priority score updated from {old_priority} to {new_priority})",
        )
        db.add(audit_prio)
        new_audit_logs.append(audit_prio)

    if commit:
        db.commit()
        db.refresh(incident)

    return incident, new_audit_logs


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
    if old_status == new_status:
        # Avoid duplicate audit entries when nothing actually changes
        return incident

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

    # Recalculate priority based on the updated verification status
    rescore_incident(
        db=db,
        incident=incident,
        reason=f"Verification status transition from '{old_status}' to '{new_status}'.",
        operator=operator,
        commit=False,
    )

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
    if old_status == new_status and assigned_team == incident.assignedTeam:
        # Avoid duplicate audit entries when nothing actually changes
        return incident

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
    response_status: Optional[str] = None,
) -> Optional[Incident]:
    """Apply manual coordinator priority override with audit log."""
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        return None

    old_priority = incident.priorityScore
    incident.priorityScore = new_priority
    incident.is_priority_overridden = True
    now_iso = datetime.now(timezone.utc).isoformat()

    # If response status was also updated in coordinator override
    if response_status and response_status != incident.responseStatus:
        old_resp = incident.responseStatus
        incident.responseStatus = response_status
        db.add(
            AuditLog(
                id=_generate_audit_log_id(),
                timestamp=now_iso,
                incidentId=incident.id,
                operator=operator,
                actionType="RESPONSE_STATUS_CHANGE",
                oldValue=str(old_resp).upper(),
                newValue=str(response_status).upper(),
                reason=f"Status adjusted during priority override: {reason}",
            )
        )

    # Append note to incident notes
    current_notes = list(incident.notes)
    current_notes.append({
        "id": f"n-{len(current_notes) + 1}",
        "author": operator,
        "time": "Just now",
        "text": f"Priority manually overridden from {old_priority} to {new_priority}. Reason: {reason}",
        "override_type": "priority",
        "value": new_priority,
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


def override_incident_severity(
    db: Session,
    incident_id: str,
    new_severity: str,
    operator: str,
    reason: str,
) -> Optional[Incident]:
    """Apply manual coordinator severity override with audit log."""
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        return None

    old_severity = incident.severity
    new_sev_clean = new_severity.strip().lower()
    incident.severity = new_sev_clean
    incident.is_severity_overridden = True
    now_iso = datetime.now(timezone.utc).isoformat()

    current_notes = list(incident.notes)
    current_notes.append({
        "id": f"n-{len(current_notes) + 1}",
        "author": operator,
        "time": "Just now",
        "text": f"Severity manually overridden from {old_severity} to {new_sev_clean}. Reason: {reason}",
        "override_type": "severity",
        "value": new_sev_clean,
    })
    incident.notes = current_notes

    audit_entry = AuditLog(
        id=_generate_audit_log_id(),
        timestamp=now_iso,
        incidentId=incident.id,
        operator=operator,
        actionType="SEVERITY_OVERRIDE",
        oldValue=str(old_severity),
        newValue=str(new_sev_clean),
        reason=reason,
    )
    db.add(audit_entry)

    # If priority is not manually overridden, recalculate priority reflecting the new severity
    if not incident.is_priority_overridden:
        rescore_incident(
            db=db,
            incident=incident,
            reason=f"Severity manually overridden to '{new_sev_clean}'.",
            operator=operator,
            commit=False,
        )

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


def update_incident_location(
    db: Session,
    incident_id: str,
    coordinates: List[float],
    location_name: Optional[str] = None,
    sector: Optional[str] = None,
    confirmation_status: str = "officer_confirmed",
    operator: str = "Coordinator Jordan Davis",
    reason: str = "Officer selected confirmed location after candidate review",
) -> Optional[Incident]:
    """
    Update or correct the coordinates and location of an existing incident report.
    Validates coordinates, updates location provenance, recalculates location confidence,
    and logs the action in the audit trail.
    """
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        return None

    is_valid, err = validate_coordinates(coordinates)
    if not is_valid:
        raise ValueError(f"Invalid coordinate values: {err}")

    old_coords = incident.coordinates
    old_source = incident.location_source or "unknown"

    clean_coords = [float(coordinates[0]), float(coordinates[1])]
    incident.coordinates = clean_coords
    if location_name and location_name.strip():
        incident.locationName = location_name.strip()
    if sector and sector.strip():
        incident.sector = sector.strip()

    incident.location_source = f"{confirmation_status} ({operator})"
    incident.location_resolution_status = "candidate_selected"
    incident.is_synthetic_location = False

    # Recalculate location confidence
    incident.locationConfidence = calculate_location_confidence(
        coordinates=clean_coords,
        location_source=incident.location_source,
        location_name=incident.locationName,
        sector=incident.sector,
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    audit_entry = AuditLog(
        id=_generate_audit_log_id(),
        timestamp=now_iso,
        incidentId=incident.id,
        operator=operator,
        actionType="LOCATION_CONFIRMED",
        oldValue=f"{old_coords} ({old_source})",
        newValue=f"{clean_coords} ({incident.location_source})",
        reason=reason,
    )
    db.add(audit_entry)

    # Append note to incident notes
    current_notes = list(incident.notes)
    current_notes.append({
        "id": f"n-loc-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]}",
        "author": operator,
        "time": "Just now",
        "text": f"Location resolved and confirmed to {clean_coords}. Reason: {reason}",
    })
    incident.notes = current_notes

    # Rescore incident to reflect updated location confidence
    rescore_incident(
        db=db,
        incident=incident,
        reason=f"Location coordinates resolved and confirmed to {clean_coords}.",
        operator=operator,
        commit=False,
    )

    db.commit()
    db.refresh(incident)
    return incident


def add_incident_note(
    db: Session,
    incident_id: str,
    text: str,
    author: str = "Coordinator Jordan Davis",
) -> Optional[Incident]:
    """
    Append an authoritative coordinator note to the incident report.
    Persists note in SQLite and writes an entry in the immutable audit log.
    """
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        return None

    clean_text = text.strip()
    if not clean_text:
        raise ValueError("Note text cannot be empty.")

    clean_author = author.strip() if author and author.strip() else "Coordinator Jordan Davis"
    now_iso = datetime.now(timezone.utc).isoformat()
    note_id = f"n-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}-{uuid.uuid4().hex[:4]}"

    new_note = {
        "id": note_id,
        "author": clean_author,
        "time": "Just now",
        "timestamp": now_iso,
        "text": clean_text,
    }

    # Prepend to notes list so newest notes appear first
    current_notes = list(incident.notes or [])
    current_notes.insert(0, new_note)
    incident.notes = current_notes

    # Add immutable audit log entry
    audit_entry = AuditLog(
        id=_generate_audit_log_id(),
        timestamp=now_iso,
        incidentId=incident.id,
        operator=clean_author,
        actionType="COORDINATOR_NOTE_ADDED",
        oldValue="N/A",
        newValue=clean_text[:120],
        reason=f"Coordinator note recorded by {clean_author}",
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(incident)
    logger.info(f"Appended note {note_id} to incident {incident.id} by {clean_author}")
    return incident

