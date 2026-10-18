"""
Incidents API Router — CRUD, Verification, Response Status, and Overrides
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentUpdate,
    PriorityOverrideRequest,
    SeverityOverrideRequest,
    ResponseStatusUpdate,
    VerificationStatusUpdate,
    AuditLogResponse,
    DuplicateSuggestion,
    DuplicateMergeRequest,
    DuplicateDismissRequest,
    DuplicateMergeResponse,
    DuplicateDismissResponse,
)
from backend.app.schemas.report_structuring import (
    ReportStructuringRequest,
    ReportStructuringResponse,
)
from backend.app.schemas.geocoding import LocationConfirmationRequest
from backend.app.services.incident_service import (
    create_incident,
    get_incident_by_id,
    get_incidents,
    get_priority_queue,
    override_incident_priority,
    override_incident_severity,
    update_incident_response_status,
    update_incident_verification,
    update_incident_location,
    get_audit_logs,
)
from backend.app.services.report_structuring_service import extract_structured_incident_report
from backend.app.services.duplicate_service import (
    find_duplicate_suggestions,
    merge_duplicate_incident,
    dismiss_duplicate_suggestion,
)

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("", response_model=List[IncidentResponse])
def list_incidents(
    severity: Optional[str] = Query(None, description="Filter by severity: critical, high, moderate, low"),
    verificationStatus: Optional[str] = Query(None, description="Filter: unverified, under_review, verified, disputed"),
    responseStatus: Optional[str] = Query(None, description="Filter: unassigned, triage, dispatched, on_scene, resolved, merged_duplicate"),
    sector: Optional[str] = Query(None, description="Filter by sector name"),
    category: Optional[str] = Query(None, description="Filter by HumAID category"),
    search: Optional[str] = Query(None, description="Search term for title, location, text"),
    include_duplicates: bool = Query(False, description="Whether to include merged duplicate incidents"),
    db: Session = Depends(get_db),
):
    """Retrieve all emergency incident reports with optional filtering. Excludes merged duplicates by default."""
    incidents = get_incidents(
        db=db,
        severity=severity,
        verificationStatus=verificationStatus,
        responseStatus=responseStatus,
        sector=sector,
        category=category,
        search=search,
        include_duplicates=include_duplicates,
    )
    return [i.to_dict() for i in incidents]


@router.get("/priority-queue", response_model=List[IncidentResponse])
def get_priority_queue_endpoint(
    limit: Optional[int] = Query(None, description="Max number of priority queue items"),
    db: Session = Depends(get_db),
):
    """
    Retrieve active canonical incidents for the Operational Priority Queue.
    Strictly excludes merged duplicate records and resolved incidents.
    Returns authoritative canonical incidents ordered by priority score descending.
    """
    incidents = get_priority_queue(db=db, limit=limit)
    return [i.to_dict() for i in incidents]


@router.post("/structure-report", response_model=ReportStructuringResponse)
def structure_report_endpoint(payload: ReportStructuringRequest):
    """
    Structure messy or unstructured crisis report text into validated fields.
    Extracts hazard category, casualties, location clues, time references, and urgency flags.
    """
    return extract_structured_incident_report(payload.text)


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident_endpoint(payload: IncidentCreate, db: Session = Depends(get_db)):
    """
    Submit a new emergency incident report.
    Optionally triggers NLP classification using HumAID DistilBERT to suggest situation category.
    """
    try:
        incident = create_incident(db, payload)
        return incident.to_dict()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


@router.patch("/{incident_id}/location", response_model=IncidentResponse)
def update_location_endpoint(
    incident_id: str,
    payload: LocationConfirmationRequest,
    db: Session = Depends(get_db),
):
    """
    Confirm or correct coordinates and landmark location for an incident.
    Records operator action in the immutable audit log and rescores priority.
    """
    try:
        incident = update_incident_location(
            db=db,
            incident_id=incident_id,
            coordinates=payload.coordinates,
            location_name=payload.locationName,
            sector=payload.sector,
            confirmation_status=payload.confirmationStatus,
            operator=payload.operator,
            reason=payload.reason,
        )
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )
        return incident.to_dict()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a specific incident."""
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return incident.to_dict()


@router.patch("/{incident_id}/verification", response_model=IncidentResponse)
def update_verification_endpoint(
    incident_id: str,
    payload: VerificationStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Update human coordinator verification status (e.g. unverified -> verified).
    Records operator identity and rationale in immutable audit trail.
    """
    incident = update_incident_verification(
        db=db,
        incident_id=incident_id,
        new_status=payload.verificationStatus,
        operator=payload.operator,
        reason=payload.reason,
    )
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return incident.to_dict()


@router.patch("/{incident_id}/response-status", response_model=IncidentResponse)
def update_response_status_endpoint(
    incident_id: str,
    payload: ResponseStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Update dispatch/response status (e.g. triage -> dispatched) and assigned team.
    Records operator identity and rationale in audit trail.
    """
    incident = update_incident_response_status(
        db=db,
        incident_id=incident_id,
        new_status=payload.responseStatus,
        assigned_team=payload.assignedTeam,
        operator=payload.operator,
        reason=payload.reason,
    )
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return incident.to_dict()


@router.post("/{incident_id}/override", response_model=IncidentResponse)
def override_priority_endpoint(
    incident_id: str,
    payload: PriorityOverrideRequest,
    db: Session = Depends(get_db),
):
    """
    Apply manual coordinator priority score override with mandatory justification.
    Updates priorityScore and records event in audit trail.
    """
    incident = override_incident_priority(
        db=db,
        incident_id=incident_id,
        new_priority=payload.newPriority,
        operator=payload.operator,
        reason=payload.reason,
        response_status=payload.responseStatus,
    )
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return incident.to_dict()


@router.post("/{incident_id}/override-severity", response_model=IncidentResponse)
def override_severity_endpoint(
    incident_id: str,
    payload: SeverityOverrideRequest,
    db: Session = Depends(get_db),
):
    """
    Apply manual coordinator severity tier override with mandatory justification.
    Updates severity, recalculates priority if not overridden, and records event in audit trail.
    """
    incident = override_incident_severity(
        db=db,
        incident_id=incident_id,
        new_severity=payload.newSeverity,
        operator=payload.operator,
        reason=payload.reason,
    )
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return incident.to_dict()


@router.get("/{incident_id}/audit-log", response_model=List[AuditLogResponse])
def get_incident_audit_trail(incident_id: str, db: Session = Depends(get_db)):
    """Retrieve audit trail logs specific to this incident."""
    logs = get_audit_logs(db, incident_id=incident_id)
    return [l.to_dict() for l in logs]


@router.get("/{incident_id}/duplicates", response_model=List[DuplicateSuggestion])
def get_incident_duplicate_suggestions(incident_id: str, db: Session = Depends(get_db)):
    """
    Retrieve ranked, explainable duplicate candidate suggestions for an incident.
    Combines spatial distance, lexical similarity, time delta, and HumAID category match.
    """
    suggestions = find_duplicate_suggestions(db, incident_id)
    return suggestions


@router.post("/{incident_id}/merge-duplicate", response_model=DuplicateMergeResponse)
def merge_duplicate_endpoint(
    incident_id: str,
    payload: DuplicateMergeRequest,
    db: Session = Depends(get_db),
):
    """
    Coordinator action: Merge a duplicate report into this primary incident.
    Requires human review. Updates duplicate status, boosts corroboration, and writes audit trail.
    Supports coordinator confirmation of primary incident.
    """
    if payload.primaryIncidentId and payload.primaryIncidentId != incident_id:
        primary_id = payload.primaryIncidentId
        duplicate_id = payload.duplicateIncidentId if payload.duplicateIncidentId != primary_id else incident_id
    else:
        primary_id = incident_id
        duplicate_id = payload.duplicateIncidentId

    if primary_id == duplicate_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot merge an incident into itself.")

    try:
        primary, duplicate, audit_log = merge_duplicate_incident(
            db=db,
            primary_id=primary_id,
            duplicate_id=duplicate_id,
            operator=payload.operator,
            reason=payload.reason,
            update_corroboration=payload.updateCorroboration,
        )
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    res = primary.to_dict()
    res["primary_incident_id"] = primary.id
    res["merged_incident_id"] = duplicate.id
    res["review_status"] = "merged"
    res["message"] = f"Merged {duplicate.id} into primary record {primary.id}."
    res["merged_incident"] = duplicate.to_dict()
    res["primary_incident"] = primary.to_dict()
    res["duplicate_incident"] = duplicate.to_dict()
    res["audit_log_id"] = audit_log.id if audit_log else None
    return res


@router.post("/{incident_id}/dismiss-duplicate", response_model=DuplicateDismissResponse)
def dismiss_duplicate_endpoint(
    incident_id: str,
    payload: DuplicateDismissRequest,
    db: Session = Depends(get_db),
):
    """
    Coordinator action: Dismiss a duplicate candidate suggestion as a distinct event.
    Logs coordinator rationale and ensures the suggestion is not shown again.
    """
    primary, duplicate, audit_log = dismiss_duplicate_suggestion(
        db=db,
        primary_id=incident_id,
        duplicate_id=payload.duplicateIncidentId,
        operator=payload.operator,
        reason=payload.reason,
    )
    if not primary or not duplicate:
        raise HTTPException(status_code=404, detail="Incident not found.")

    res = primary.to_dict()
    res["primary_incident_id"] = primary.id
    res["candidate_incident_id"] = duplicate.id
    res["dismissed_suggestion_id"] = f"dup-{primary.id}-{duplicate.id}"
    res["review_status"] = "dismissed"
    res["message"] = f"Dismissed duplicate suggestion for {duplicate.id}."
    res["audit_log_id"] = audit_log.id if audit_log else None
    return res


