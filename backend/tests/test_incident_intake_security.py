"""
RESQNET AI — Incident Intake Security & Override Regression Test Suite

Verifies:
1. Anonymous public users can submit ordinary crisis reports.
2. Initial severity and priority are calculated by the deterministic scoring engine.
3. Client-supplied scores cannot inflate priority unless an authorized override is applied.
4. Anonymous users cannot activate is_priority_overridden or is_severity_overridden (HTTP 401).
5. Citizens and responders cannot activate manual overrides (HTTP 403).
6. Authorized coordinators/admins require a mandatory justification reason (HTTP 422 if absent).
7. Authorized coordinator overrides succeed, set override flags, and record immutable audit logs & notes.
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.security import SYSTEM_USERS, create_access_token
from backend.app.models.incident import Incident, AuditLog
from backend.app.database import SessionLocal


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def coordinator_headers():
    token = create_access_token(SYSTEM_USERS["coordinator"])
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def citizen_headers():
    token = create_access_token(SYSTEM_USERS["citizen"])
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def responder_headers():
    token = create_access_token(SYSTEM_USERS["responder"])
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_anonymous_ordinary_report_succeeds_with_calculated_scores(client, db_session):
    """
    Ordinary citizen report submitted without auth.
    Client-supplied priorityScore and severity must be ignored; the backend scoring
    engine must calculate the initial severity and priority score.
    """
    payload = {
        "title": "Minor standing water in pedestrian underpass",
        "type": "Flood / Inundation",
        "sector": "East Harbor District",
        "locationName": "Pier 14 Walkway",
        "report_text": "Puddle forming on sidewalk, approximately 2 inches deep, pedestrians walking around it.",
        "peopleAffected": "0 casualties",
        "severity": "critical",       # Untrusted client attempt to inflate severity
        "priorityScore": 99,          # Untrusted client attempt to inflate priority
        "is_priority_overridden": False,
        "is_severity_overridden": False,
        "run_nlp_classification": False,
    }

    resp = client.post("/api/v1/incidents", json=payload)
    assert resp.status_code == 201
    data = resp.json()

    # The backend scoring engine calculates the priority and severity, ignoring 99 and "critical"
    assert data["priorityScore"] < 90
    assert data["severity"] != "critical"
    assert data["is_priority_overridden"] is False
    assert data["is_severity_overridden"] is False

    # Check database and audit log
    inc = db_session.query(Incident).filter(Incident.id == data["id"]).first()
    assert inc is not None
    assert inc.priorityScore < 90
    assert inc.is_priority_overridden is False

    audit_created = (
        db_session.query(AuditLog)
        .filter(AuditLog.incidentId == data["id"], AuditLog.actionType == "INCIDENT_CREATED")
        .first()
    )
    assert audit_created is not None
    assert audit_created.operator == "System Intake"

    # Verify no override audit logs were created
    override_logs = (
        db_session.query(AuditLog)
        .filter(
            AuditLog.incidentId == data["id"],
            AuditLog.actionType.in_(["PRIORITY_OVERRIDE", "SEVERITY_OVERRIDE"]),
        )
        .all()
    )
    assert len(override_logs) == 0


def test_anonymous_cannot_activate_priority_override(client):
    """Anonymous payload attempting is_priority_overridden=True must receive HTTP 401."""
    payload = {
        "title": "Malicious payload with manual override",
        "report_text": "Small puddle",
        "priorityScore": 99,
        "is_priority_overridden": True,
        "override_reason": "Trying to bypass scoring engine anonymously",
        "run_nlp_classification": False,
    }

    resp = client.post("/api/v1/incidents", json=payload)
    assert resp.status_code == 401
    assert "WWW-Authenticate" in resp.headers
    assert "Authentication required" in resp.json()["detail"]


def test_anonymous_cannot_activate_severity_override(client):
    """Anonymous payload attempting is_severity_overridden=True must receive HTTP 401."""
    payload = {
        "title": "Malicious payload with severity override",
        "report_text": "Dry road with small crack",
        "severity": "critical",
        "is_severity_overridden": True,
        "override_reason": "Forcing critical severity without credentials",
        "run_nlp_classification": False,
    }

    resp = client.post("/api/v1/incidents", json=payload)
    assert resp.status_code == 401
    assert "WWW-Authenticate" in resp.headers
    assert "Authentication required" in resp.json()["detail"]


def test_citizen_role_forbidden_from_overrides(client, citizen_headers):
    """Authenticated user with citizen role cannot activate priority or severity overrides (HTTP 403)."""
    payload_prio = {
        "title": "Citizen attempting priority override",
        "report_text": "Minor road flooding",
        "priorityScore": 95,
        "is_priority_overridden": True,
        "override_reason": "I want faster attention to my street",
        "run_nlp_classification": False,
    }

    resp = client.post("/api/v1/incidents", json=payload_prio, headers=citizen_headers)
    assert resp.status_code == 403
    assert "Access denied" in resp.json()["detail"]

    payload_sev = {
        "title": "Citizen attempting severity override",
        "report_text": "Minor road flooding",
        "severity": "critical",
        "is_severity_overridden": True,
        "override_reason": "Inflating severity",
        "run_nlp_classification": False,
    }

    resp2 = client.post("/api/v1/incidents", json=payload_sev, headers=citizen_headers)
    assert resp2.status_code == 403
    assert "Access denied" in resp2.json()["detail"]


def test_responder_role_forbidden_from_overrides(client, responder_headers):
    """Field responders are not coordinators/admins and cannot set intake overrides (HTTP 403)."""
    payload = {
        "title": "Field responder trying intake override",
        "report_text": "Water rising near bridge",
        "priorityScore": 90,
        "is_priority_overridden": True,
        "override_reason": "Responder override",
        "run_nlp_classification": False,
    }

    resp = client.post("/api/v1/incidents", json=payload, headers=responder_headers)
    assert resp.status_code == 403
    assert "Access denied" in resp.json()["detail"]


def test_coordinator_override_requires_mandatory_reason(client, coordinator_headers):
    """Coordinators must supply a non-empty justification reason for overrides (HTTP 422)."""
    # Empty reason
    payload_empty = {
        "title": "Coordinator override missing reason",
        "report_text": "Emergency reported",
        "priorityScore": 88,
        "is_priority_overridden": True,
        "override_reason": "",
        "run_nlp_classification": False,
    }

    resp = client.post("/api/v1/incidents", json=payload_empty, headers=coordinator_headers)
    assert resp.status_code == 422
    assert "mandatory justification reason is required" in resp.json()["detail"]

    # Whitespace-only reason
    payload_spaces = {
        "title": "Coordinator override whitespace reason",
        "report_text": "Emergency reported",
        "priorityScore": 88,
        "is_priority_overridden": True,
        "override_reason": "   ",
        "run_nlp_classification": False,
    }

    resp2 = client.post("/api/v1/incidents", json=payload_spaces, headers=coordinator_headers)
    assert resp2.status_code == 422
    assert "mandatory justification reason is required" in resp2.json()["detail"]


def test_coordinator_authorized_priority_override_succeeds_and_creates_audit_log(
    client, coordinator_headers, db_session
):
    """
    Authenticated coordinator can apply manual priority override at intake.
    Verifies score persistence, override flags, audit log entries, and incident notes.
    """
    justification = "Direct encrypted radio dispatch confirmed 4 submerged vehicles with trapped families."
    payload = {
        "title": "Submerged vehicles near East Harbor Underpass",
        "type": "Flood / Inundation",
        "sector": "East Harbor District",
        "locationName": "Underpass Arch 3",
        "report_text": "Vehicles submerged up to window level, occupants waving for immediate evacuation.",
        "peopleAffected": "12 people trapped",
        "priorityScore": 96,
        "is_priority_overridden": True,
        "override_reason": justification,
        "run_nlp_classification": False,
    }

    resp = client.post("/api/v1/incidents", json=payload, headers=coordinator_headers)
    assert resp.status_code == 201
    data = resp.json()

    assert data["priorityScore"] == 96
    assert data["is_priority_overridden"] is True
    assert data["is_severity_overridden"] is False

    # Verify AuditLog has PRIORITY_OVERRIDE
    prio_log = (
        db_session.query(AuditLog)
        .filter(AuditLog.incidentId == data["id"], AuditLog.actionType == "PRIORITY_OVERRIDE")
        .first()
    )
    assert prio_log is not None
    assert prio_log.operator == SYSTEM_USERS["coordinator"].name
    assert prio_log.newValue == "96"
    assert prio_log.reason == justification

    # Verify initial incident notes include override record
    inc = db_session.query(Incident).filter(Incident.id == data["id"]).first()
    assert inc is not None
    assert len(inc.notes) >= 1
    prio_note = next((n for n in inc.notes if n.get("override_type") == "priority"), None)
    assert prio_note is not None
    assert prio_note["value"] == 96
    assert justification in prio_note["text"]


def test_coordinator_authorized_severity_override_succeeds_and_creates_audit_log(
    client, coordinator_headers, db_session
):
    """
    Authenticated coordinator can apply manual severity override at intake.
    Verifies severity persistence, override flags, and audit log entries.
    """
    justification = "Structural engineering inspection confirmed active retaining wall breach."
    payload = {
        "title": "Wall failure near hillside residential complex",
        "type": "Landslide / Mudslide",
        "sector": "South Ridge Estate",
        "locationName": "Ridge Crest Road",
        "report_text": "Retaining wall bowed outwards, mud sliding towards apartments.",
        "peopleAffected": "35 residents evacuated",
        "severity": "critical",
        "is_severity_overridden": True,
        "override_reason": justification,
        "run_nlp_classification": False,
    }

    resp = client.post("/api/v1/incidents", json=payload, headers=coordinator_headers)
    assert resp.status_code == 201
    data = resp.json()

    assert data["severity"] == "critical"
    assert data["is_severity_overridden"] is True
    assert data["is_priority_overridden"] is False

    # Verify AuditLog has SEVERITY_OVERRIDE
    sev_log = (
        db_session.query(AuditLog)
        .filter(AuditLog.incidentId == data["id"], AuditLog.actionType == "SEVERITY_OVERRIDE")
        .first()
    )
    assert sev_log is not None
    assert sev_log.operator == SYSTEM_USERS["coordinator"].name
    assert sev_log.newValue == "critical"
    assert sev_log.reason == justification


def test_scoring_breakdown_is_returned_and_explainable(client):
    """API responses must return explainable 5-factor scoring engine breakdown."""
    resp = client.get("/api/v1/incidents/priority-queue")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) > 0
    top = items[0]

    assert "scoring_breakdown" in top
    bd = top["scoring_breakdown"]
    assert "hazard_sub" in bd
    assert "scale_sub" in bd
    assert "verification_sub" in bd
    assert "location_sub" in bd
    assert "time_sub" in bd
    assert "weights" in bd
    assert bd["weights"]["hazard"] == 0.35
    assert bd["weights"]["scale"] == 0.25
    assert bd["weights"]["verification"] == 0.20
    assert bd["weights"]["location"] == 0.10
    assert bd["weights"]["time"] == 0.10
