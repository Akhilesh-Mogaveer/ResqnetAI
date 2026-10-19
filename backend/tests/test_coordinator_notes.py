"""
Test Suite: Coordinator Notes Persistence, Input Validation, and Audit Logging
Verifies Phase 1 requirements:
- Missing POST /api/v1/incidents/{incident_id}/notes endpoint implemented and functional.
- Notes persist in SQLite database and associate with correct incident and author.
- Validates note text and author.
- Returns 404 for invalid incident ID.
- Returns 422 for blank note text.
- Generates audit log trail for coordinator accountability.
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.core.security import SYSTEM_USERS, create_access_token
from backend.app.models.incident import AuditLog, Incident


@pytest.fixture
def coordinator_headers():
    token = create_access_token(SYSTEM_USERS["coordinator"])
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def citizen_headers():
    token = create_access_token(SYSTEM_USERS["citizen"])
    return {"Authorization": f"Bearer {token}"}


def test_add_coordinator_note_success(client: TestClient, db_session):
    """Verify coordinator note appends to incident, persists in DB, and returns updated incident."""
    incident = db_session.query(Incident).filter(Incident.is_duplicate == False).first()
    assert incident is not None, "At least one active incident should exist in test DB"
    initial_note_count = len(incident.notes or [])

    note_payload = {
        "text": "Evacuation corridor cleared by Task Force 2. Route open for emergency logistics.",
        "author": "Coordinator Jordan Davis",
    }

    response = client.post(
        f"/api/v1/incidents/{incident.id}/notes",
        json=note_payload,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["id"] == incident.id
    assert len(data["notes"]) == initial_note_count + 1
    newest_note = data["notes"][0]
    assert newest_note["text"] == note_payload["text"]
    assert "Jordan Davis" in newest_note["author"]

    # Verify persistence in database on fresh query
    db_session.expire_all()
    reloaded = db_session.query(Incident).filter(Incident.id == incident.id).first()
    assert reloaded is not None
    assert len(reloaded.notes) == initial_note_count + 1
    assert reloaded.notes[0]["text"] == note_payload["text"]


def test_add_coordinator_note_writes_audit_log(client: TestClient, db_session):
    """Verify appending a note writes an immutable entry in the audit log."""
    incident = db_session.query(Incident).filter(Incident.is_duplicate == False).first()
    note_text = "Heavy pump units deployed at flood intake basin."

    res = client.post(
        f"/api/v1/incidents/{incident.id}/notes",
        json={"text": note_text, "author": "Lead Coordinator"},
    )
    assert res.status_code == 201

    # Check AuditLog table in database
    audit_entry = (
        db_session.query(AuditLog)
        .filter(AuditLog.incidentId == incident.id, AuditLog.actionType == "COORDINATOR_NOTE_ADDED")
        .order_by(AuditLog.id.desc())
        .first()
    )
    assert audit_entry is not None
    assert audit_entry.incidentId == incident.id
    assert "Heavy pump units" in audit_entry.newValue


def test_add_note_invalid_incident_id_returns_404(client: TestClient):
    """Verify attempting to add a note to a nonexistent incident returns 404."""
    response = client.post(
        "/api/v1/incidents/RQN-99999-NONEXISTENT/notes",
        json={"text": "Test note", "author": "Coordinator"},
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_add_note_blank_text_returns_422(client: TestClient, db_session):
    """Verify empty or whitespace-only note text is rejected with 422 Unprocessable Entity."""
    incident = db_session.query(Incident).first()

    # Empty string
    res_empty = client.post(
        f"/api/v1/incidents/{incident.id}/notes",
        json={"text": "", "author": "Coordinator"},
    )
    assert res_empty.status_code == 422

    # Whitespace only
    res_whitespace = client.post(
        f"/api/v1/incidents/{incident.id}/notes",
        json={"text": "    \n\t  ", "author": "Coordinator"},
    )
    assert res_whitespace.status_code == 422


def test_add_note_requires_authorized_role_when_token_provided(client: TestClient, db_session, citizen_headers, coordinator_headers):
    """Verify citizen role is forbidden from adding coordinator notes, but coordinator is allowed."""
    incident = db_session.query(Incident).first()

    # Citizen attempt -> 403 Forbidden
    res_citizen = client.post(
        f"/api/v1/incidents/{incident.id}/notes",
        json={"text": "Citizen unauthorized note injection attempt", "author": "Citizen"},
        headers=citizen_headers,
    )
    assert res_citizen.status_code == 403
    assert "Access denied" in res_citizen.json()["detail"]

    # Coordinator attempt -> 201 Created
    res_coord = client.post(
        f"/api/v1/incidents/{incident.id}/notes",
        json={"text": "Authorized coordinator tactical directive.", "author": "Coordinator Jordan Davis"},
        headers=coordinator_headers,
    )
    assert res_coord.status_code == 201
