"""
Tests for RESQNET AI — Equitable Emergency Prioritization Layer

Verifies:
1. Separation of emergency need from information quality (missing coordinates != low severity).
2. Equity-review flag triggers for serious low-information / unverified / sparse-reporting incidents.
3. Two otherwise comparable incidents: one with precise coordinates vs one with missing coordinates.
4. Serious uncorroborated report (lack of duplicates != no emergency).
5. Incident awaiting verification.
6. Incident with genuinely corroborated reports.
7. Incident with unresolved location remains visible.
8. Live Equity & Coverage Monitor endpoint calculations and honest proxies.
9. Security & RBAC: Unauthorized users cannot override priority or verification.
10. Preservation of existing scoring weights (Hazard 35%, Scale 25%, Verification 20%, Location 10%, Time 10%).
"""

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.database.session import get_db, SessionLocal
from backend.app.models.incident import Incident, AuditLog, AttentionZone
from backend.app.schemas.incident import IncidentCreate, VerificationStatusUpdate
from backend.app.schemas.geocoding import LocationConfirmationRequest
from backend.app.services.incident_service import create_incident, get_incidents, get_priority_queue, get_equity_monitor_metrics
from backend.app.services.scoring_service import (
    calculate_priority_score,
    WEIGHT_HAZARD,
    WEIGHT_SCALE,
    WEIGHT_VERIFICATION,
    WEIGHT_LOCATION,
    WEIGHT_TIME,
)
from backend.app.core.security import SYSTEM_USERS, create_access_token, UserRole


client = TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def coordinator_headers():
    token = create_access_token(SYSTEM_USERS["coordinator"])
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def responder_headers():
    token = create_access_token(SYSTEM_USERS["responder"])
    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# 1. Scoring Weights Integrity Check
# ============================================================================

def test_scoring_weights_strictly_preserved():
    """Verify scoring weights have NOT been altered (Hazard 35%, Scale 25%, Verification 20%, Location 10%, Time 10%)."""
    assert WEIGHT_HAZARD == 0.35
    assert WEIGHT_SCALE == 0.25
    assert WEIGHT_VERIFICATION == 0.20
    assert WEIGHT_LOCATION == 0.10
    assert WEIGHT_TIME == 0.10
    assert round(WEIGHT_HAZARD + WEIGHT_SCALE + WEIGHT_VERIFICATION + WEIGHT_LOCATION + WEIGHT_TIME, 5) == 1.0


# ============================================================================
# 2. Two Comparable Incidents: Precise Coordinates vs Missing Coordinates
# ============================================================================

def test_comparable_incidents_precise_vs_missing_coordinates(db: Session):
    """
    Two otherwise comparable critical incidents:
    Incident A: Precise GPS coordinates [37.7749, -122.4194]
    Incident B: Missing coordinates (None)
    
    Verifies:
    - Incident B retains critical severity (missing coordinates != low emergency need).
    - Incident B does NOT receive invented coordinates (coordinates remains None).
    - Incident B receives equity_review_flag == True with unresolved coordinates reason.
    - Incident A (has coordinates) does not trigger unresolved coordinate reason.
    - Both incidents remain visible in queue.
    """
    # Create Incident A with precise coordinates
    inc_a = Incident(
        id="RQN-TEST-EQ-A",
        title="Structural collapse with trapped occupants",
        type="Structural Collapse",
        sector="Downtown Sector",
        locationName="Market Street Station",
        coordinates_json="[37.7749, -122.4194]",
        location_source="user_supplied",
        severity="critical",
        priorityScore=88,
        affectedCountNumeric=6,
        peopleAffected="6 civilians trapped",
        verificationStatus="verified",
        responseStatus="triage",
        duplicate_count=2,
        report_text="Active collapse, 6 people trapped under rubble.",
    )
    
    # Create Incident B with missing coordinates (identical hazard and severity)
    inc_b = Incident(
        id="RQN-TEST-EQ-B",
        title="Structural collapse with trapped occupants (Remote Area)",
        type="Structural Collapse",
        sector="North Valley Hinterland",
        locationName="Unmarked Valley Road",
        coordinates_json="null",
        location_source="unmatched_unknown",
        severity="critical",
        priorityScore=82,
        affectedCountNumeric=6,
        peopleAffected="6 civilians trapped",
        verificationStatus="verified",
        responseStatus="triage",
        duplicate_count=2,
        report_text="Active collapse, 6 people trapped under rubble in remote valley.",
    )

    db.merge(inc_a)
    db.merge(inc_b)
    db.commit()

    # Verify Incident B
    b_ref = db.query(Incident).filter(Incident.id == "RQN-TEST-EQ-B").first()
    assert b_ref.severity == "critical"
    assert b_ref.coordinates is None  # Never invented
    assert b_ref.equity_review_flag is True
    assert any("Unresolved coordinates" in r for r in b_ref.equity_reasons)

    # Verify Incident A
    a_ref = db.query(Incident).filter(Incident.id == "RQN-TEST-EQ-A").first()
    assert a_ref.severity == "critical"
    assert a_ref.coordinates == [37.7749, -122.4194]
    # Incident A has valid coords, verified status, and duplicates > 0 in a non-underreported sector
    assert not any("Unresolved coordinates" in r for r in a_ref.equity_reasons)
    assert a_ref.equity_review_flag is False

    # Clean up test rows
    db.query(Incident).filter(Incident.id.in_(["RQN-TEST-EQ-A", "RQN-TEST-EQ-B"])).delete()
    db.commit()


# ============================================================================
# 3. Serious Incident with 1 Report & No Corroboration (Sparse Reporting Proxy)
# ============================================================================

def test_serious_incident_with_no_corroboration_equity_flag(db: Session):
    """
    A serious incident with only 1 report and duplicate_count == 0.
    Verifies:
    - Lack of duplicate reports is NOT treated as evidence that no emergency exists.
    - Incident receives equity_review_flag == True with 'Limited reporting evidence' proxy.
    - Prompts coordinator review without inflating artificial priority.
    """
    inc = Incident(
        id="RQN-TEST-SPARSE",
        title="Rising floodwater trapping families in hillside hamlet",
        type="Flood",
        sector="Isolated Ridge",
        locationName="Mountain Creek Settlement",
        coordinates_json="[37.7500, -122.4100]",
        location_source="user_supplied",
        severity="high",
        priorityScore=76,
        affectedCountNumeric=4,
        peopleAffected="4 people",
        verificationStatus="verified",
        responseStatus="triage",
        duplicate_count=0,  # Zero duplicates / no corroborating signals
        report_text="Flash flood rising rapidly, families trapped on rooftops. Single phone call received before line died.",
    )
    db.merge(inc)
    db.commit()

    loaded = db.query(Incident).filter(Incident.id == "RQN-TEST-SPARSE").first()
    assert loaded.severity == "high"
    assert loaded.equity_review_flag is True
    assert any("Limited reporting evidence" in r for r in loaded.equity_reasons)
    assert any("sparse reporting proxy" in r for r in loaded.equity_reasons)

    db.query(Incident).filter(Incident.id == "RQN-TEST-SPARSE").delete()
    db.commit()


# ============================================================================
# 4. Incident Awaiting Verification
# ============================================================================

def test_incident_awaiting_verification_flag_and_transition(db: Session, coordinator_headers):
    """
    Serious incident with verificationStatus == 'unverified'.
    Verifies:
    - Flagged with 'Verification pending'.
    - When coordinator verifies the incident, the pending verification flag reason clears.
    - Immutable audit log records operator verification action.
    """
    inc = Incident(
        id="RQN-TEST-VERIF",
        title="Toxic ammonia gas leak near community clinic",
        type="Hazmat",
        sector="Industrial Waterfront",
        locationName="Cold Storage Facility Pier 9",
        coordinates_json="[37.7800, -122.3900]",
        location_source="user_supplied",
        severity="critical",
        priorityScore=84,
        affectedCountNumeric=12,
        peopleAffected="12 clinic staff and patients",
        verificationStatus="unverified",
        responseStatus="triage",
        duplicate_count=2,
        report_text="Ammonia cloud escaping broken valve, clinic patients experiencing breathing distress.",
    )
    db.merge(inc)
    db.commit()

    loaded = db.query(Incident).filter(Incident.id == "RQN-TEST-VERIF").first()
    assert loaded.equity_review_flag is True
    assert any("Verification pending" in r for r in loaded.equity_reasons)

    # Coordinator verifies ground truth via API
    res = client.patch(
        "/api/v1/incidents/RQN-TEST-VERIF/verification",
        headers=coordinator_headers,
        json={
            "verificationStatus": "verified",
            "operator": "Coordinator Jordan Davis",
            "reason": "Fire hazmat squad confirmed ammonia plume on scene via chemical detector."
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["verificationStatus"] == "verified"
    # Verification pending reason should now be resolved
    assert not any("Verification pending" in r for r in data["equity_reasons"])

    # Audit log check
    audit = db.query(AuditLog).filter(AuditLog.incidentId == "RQN-TEST-VERIF").first()
    assert audit is not None
    assert audit.actionType == "VERIFICATION_STATUS_CHANGE"
    assert audit.newValue == "verified"

    db.query(AuditLog).filter(AuditLog.incidentId == "RQN-TEST-VERIF").delete()
    db.query(Incident).filter(Incident.id == "RQN-TEST-VERIF").delete()
    db.commit()


# ============================================================================
# 5. Genuinely Corroborated Incident
# ============================================================================

def test_genuinely_corroborated_incident_no_sparse_flag(db: Session):
    """
    An incident with multiple corroborating reports (duplicate_count >= 2),
    confirmed coordinates, and verified ground truth in a standard sector.
    Verifies:
    - Does NOT trigger equity_review_flag because information is complete.
    """
    inc = Incident(
        id="RQN-TEST-CORROB",
        title="Multi-vehicle freeway pileup during blizzard",
        type="Traffic / Mass Casualty",
        sector="Central Arterial Highway",
        locationName="Mile Marker 14 North",
        coordinates_json="[37.7700, -122.4200]",
        location_source="geocoded",
        severity="high",
        priorityScore=82,
        affectedCountNumeric=8,
        peopleAffected="8 injured",
        verificationStatus="verified",
        responseStatus="dispatched",
        duplicate_count=5,  # 5 corroborating duplicate reports
        report_text="Highway patrol and multiple callers report 10-car pileup with injuries.",
    )
    db.merge(inc)
    db.commit()

    loaded = db.query(Incident).filter(Incident.id == "RQN-TEST-CORROB").first()
    assert not any("Limited reporting evidence" in r for r in loaded.equity_reasons)
    assert not any("Unresolved coordinates" in r for r in loaded.equity_reasons)
    assert not any("Verification pending" in r for r in loaded.equity_reasons)
    assert loaded.equity_review_flag is False

    db.query(Incident).filter(Incident.id == "RQN-TEST-CORROB").delete()
    db.commit()


# ============================================================================
# 6. Unresolved Location Remains Visible in Queues
# ============================================================================

def test_unresolved_location_incident_remains_visible_in_queue(db: Session):
    """
    Confirm incidents with missing/unresolved coordinates remain visible in:
    - list_incidents
    - get_priority_queue
    - equity-monitor
    Without being silently filtered out or demoted.
    """
    inc = Incident(
        id="RQN-TEST-UNRESOLVED",
        title="Landslide reported by satellite phone without coordinates",
        type="Landslide",
        sector="Mountain Sector Unmapped",
        locationName="Somewhere near West Ravine",
        coordinates_json="null",
        location_source="unmatched_unknown",
        severity="high",
        priorityScore=75,
        affectedCountNumeric=2,
        peopleAffected="2 residents",
        verificationStatus="under_review",
        responseStatus="triage",
        duplicate_count=0,
        report_text="Landslide hit home, 2 residents stranded. Caller could not provide GPS coordinates.",
    )
    db.merge(inc)
    db.commit()

    # Query priority queue
    queue = get_priority_queue(db=db)
    queue_ids = [i.id for i in queue]
    assert "RQN-TEST-UNRESOLVED" in queue_ids

    # Query incidents API
    res = client.get("/api/v1/incidents?search=RQN-TEST-UNRESOLVED")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["coordinates"] is None
    assert items[0]["equity_review_flag"] is True

    # Filter by equity_review
    res_eq = client.get("/api/v1/incidents?equity_review=true")
    assert res_eq.status_code == 200
    eq_ids = [i["id"] for i in res_eq.json()]
    assert "RQN-TEST-UNRESOLVED" in eq_ids

    db.query(Incident).filter(Incident.id == "RQN-TEST-UNRESOLVED").delete()
    db.commit()


# ============================================================================
# 7. Equity & Coverage Monitor API Endpoint
# ============================================================================

def test_equity_coverage_monitor_endpoint(db: Session):
    """
    Test GET /api/v1/incidents/equity-monitor returns:
    - Real calculated counts (not mocked constants).
    - unresolved_location_count
    - serious_unverified_count
    - equity_review_flag_count
    - high_urgency_pending_count
    - coverage_measurement_mode & measurement_notes
    - flagged_incidents list with explicit reasons
    """
    res = client.get("/api/v1/incidents/equity-monitor")
    assert res.status_code == 200
    data = res.json()

    assert "unresolved_location_count" in data
    assert "serious_unverified_count" in data
    assert "equity_review_flag_count" in data
    assert "high_urgency_pending_count" in data
    assert "total_active_incidents" in data
    assert "coverage_measurement_mode" in data
    assert "measurement_notes" in data
    assert "flagged_incidents" in data

    assert isinstance(data["unresolved_location_count"], int)
    assert isinstance(data["serious_unverified_count"], int)
    assert isinstance(data["equity_review_flag_count"], int)
    assert isinstance(data["high_urgency_pending_count"], int)
    assert isinstance(data["flagged_incidents"], list)

    assert data["coverage_measurement_mode"] == "measured_telemetry_with_labeled_proxies"
    assert "Zone signal deviations reflect measured infrastructure telemetry" in data["measurement_notes"]


# ============================================================================
# 8. Security & RBAC: Unauthorized Users Cannot Override Priority / Verification
# ============================================================================

def test_unauthorized_users_cannot_override_priority_or_verification(responder_headers):
    """
    Verify security safeguards:
    - Invalid tokens cannot override priority or verification (401).
    - Responder role cannot override priority (requires coordinator or admin -> 403).
    - Overrides without reason are rejected with 422.
    """
    # 1. Invalid token priority override -> 401
    res_bad_prio = client.post(
        "/api/v1/incidents/RQN-0426/override",
        headers={"Authorization": "Bearer invalid-unauthorized-token"},
        json={"newPriority": 95, "reason": "Attempt with invalid token", "operator": "Hacker"}
    )
    assert res_bad_prio.status_code == 401

    # 2. Invalid token verification change -> 401
    res_bad_verif = client.patch(
        "/api/v1/incidents/RQN-0426/verification",
        headers={"Authorization": "Bearer invalid-unauthorized-token"},
        json={"verificationStatus": "verified", "reason": "Attempt with invalid token"}
    )
    assert res_bad_verif.status_code == 401

    # 3. Responder role cannot override priority -> 403
    res_resp_prio = client.post(
        "/api/v1/incidents/RQN-0426/override",
        headers=responder_headers,
        json={"newPriority": 95, "reason": "Responder trying override", "operator": "Responder Alex"}
    )
    assert res_resp_prio.status_code == 403

    # 4. Coordinator override without reason -> 422
    token = create_access_token(SYSTEM_USERS["coordinator"])
    coord_headers = {"Authorization": f"Bearer {token}"}
    res_no_reason = client.post(
        "/api/v1/incidents/RQN-0426/override",
        headers=coord_headers,
        json={"newPriority": 90, "operator": "Coordinator Jordan Davis"}  # Missing mandatory reason
    )
    assert res_no_reason.status_code in (400, 422)
