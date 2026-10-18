"""
Tests for Incident CRUD, Verification, Response Status, Overrides, and Audit Trail
"""

from backend.app.models.incident import Incident
from backend.app.database.session import SessionLocal


def test_list_incidents(client):
    """GET /api/v1/incidents should return seeded incident list."""
    response = client.get("/api/v1/incidents")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 8  # Baseline seeded incidents
    first = data[0]
    assert "id" in first
    assert "title" in first
    assert "severity" in first
    assert "priorityScore" in first
    assert "coordinates" in first
    assert isinstance(first["coordinates"], list)


def test_filter_incidents_by_severity(client):
    """GET /api/v1/incidents?severity=critical returns only critical incidents."""
    response = client.get("/api/v1/incidents?severity=critical")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    for inc in data:
        assert inc["severity"] == "critical"


def test_create_incident_with_nlp(client):
    """POST /api/v1/incidents creates incident and runs HumAID classification."""
    payload = {
        "title": "Severe chemical fumes detected at industrial park",
        "type": "Hazardous Material",
        "sector": "North Industrial Sector",
        "locationName": "Chemical Storage Bay 4",
        "coordinates": [37.7812, -122.3910],
        "severity": "critical",
        "priorityScore": 88,
        "report_text": "Toxic yellow smoke venting from storage tank, 4 workers coughing with severe burning eyes.",
        "run_nlp_classification": True,
    }
    response = client.post("/api/v1/incidents", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["title"] == payload["title"]
    assert data["report_text"] == payload["report_text"]
    assert data["original_report_text"] == payload["report_text"]
    assert data["verificationStatus"] == "unverified"
    assert data["responseStatus"] == "triage"

    # HumAID category attached
    assert data["humaid_category"] is not None
    assert 0.0 <= data["humaid_confidence"] <= 1.0
    assert data["nlp_status"] == "SUCCESS"

    created_id = data["id"]

    # Verify audit log was created for this incident
    audit_resp = client.get(f"/api/v1/incidents/{created_id}/audit-log")
    assert audit_resp.status_code == 200
    audit_data = audit_resp.json()
    assert len(audit_data) >= 1
    assert audit_data[0]["actionType"] == "INCIDENT_CREATED"


def test_get_incident_by_id(client):
    """GET /api/v1/incidents/{id} returns single incident or 404."""
    response = client.get("/api/v1/incidents/RQN-0427")
    assert response.status_code == 200
    assert response.json()["id"] == "RQN-0427"

    not_found = client.get("/api/v1/incidents/NON_EXISTENT_ID_999")
    assert not_found.status_code == 404


def test_update_verification_status(client):
    """PATCH /api/v1/incidents/{id}/verification updates verification status and logs audit entry."""
    payload = {
        "verificationStatus": "verified",
        "operator": "Coordinator Sarah Lin",
        "reason": "Confirmed via aerial thermal drone stream and fire department dispatch.",
    }
    response = client.patch("/api/v1/incidents/RQN-0427/verification", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verificationStatus"] == "verified"

    # Audit log check
    audit_resp = client.get("/api/v1/incidents/RQN-0427/audit-log")
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert any(
        l["actionType"] == "VERIFICATION_STATUS_CHANGE" and l["newValue"] == "verified"
        for l in logs
    )


def test_update_response_status(client):
    """PATCH /api/v1/incidents/{id}/response-status updates responseStatus and assignedTeam."""
    payload = {
        "responseStatus": "dispatched",
        "assignedTeam": "Heavy Rescue Unit Task Force 1",
        "operator": "Jordan Davis",
        "reason": "Trapped civilians confirmed; urgent extraction required.",
    }
    response = client.patch("/api/v1/incidents/RQN-0427/response-status", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["responseStatus"] == "dispatched"
    assert data["assignedTeam"] == "Heavy Rescue Unit Task Force 1"


def test_priority_override_with_audit_trail(client):
    """POST /api/v1/incidents/{id}/override updates priority and appends audit record."""
    payload = {
        "newPriority": 98,
        "operator": "Incident Commander Taylor",
        "reason": "Secondary collapse imminent; elevating priority to highest queue tier.",
    }
    response = client.post("/api/v1/incidents/RQN-0427/override", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["priorityScore"] == 98

    # Audit log record
    audit_resp = client.get("/api/v1/incidents/RQN-0427/audit-log")
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert any(
        l["actionType"] == "PRIORITY_OVERRIDE" and l["newValue"] == "98"
        for l in logs
    )


def test_list_audit_logs(client):
    """GET /api/v1/audit-log returns complete system audit history."""
    response = client.get("/api/v1/audit-log")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 4  # Seeded logs


def test_list_attention_zones(client):
    """GET /api/v1/zones returns underreported and signal void zones."""
    response = client.get("/api/v1/zones")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4
    first = data[0]
    assert "name" in first
    assert "signalDeviation" in first
    assert "populationAtRisk" in first
    assert isinstance(first["coordinates"], list)


def test_database_persistence_across_sessions(db_session_factory):
    """Verify records persist across separate database sessions without data loss."""
    # Session 1: Create
    session1 = db_session_factory()
    test_inc = Incident(
        id="RQN-PERSIST-TEST",
        title="Persisted Flash Flood Incident",
        type="Flash Flood",
        sector="West Marina",
        locationName="Pier 8",
        severity="high",
        priorityScore=82,
        peopleAffected="5 people",
        report_text="Water rising at Pier 8.",
        original_report_text="Water rising at Pier 8.",
        humaid_category="rescue_volunteering_or_donation_effort",
        humaid_confidence=0.912,
        nlp_status="SUCCESS",
    )
    test_inc.coordinates = [37.77, -122.42]
    session1.add(test_inc)
    session1.commit()
    session1.close()

    # Session 2: Fresh session read
    session2 = db_session_factory()
    retrieved = session2.query(Incident).filter(Incident.id == "RQN-PERSIST-TEST").first()
    assert retrieved is not None
    assert retrieved.title == "Persisted Flash Flood Incident"
    assert retrieved.priorityScore == 82
    assert retrieved.coordinates == [37.77, -122.42]
    assert retrieved.original_report_text == "Water rising at Pier 8."
    session2.close()


def test_end_to_end_incident_lifecycle_workflow(client):
    """
    Phase 3 End-to-End Integration Test:
    Intake -> Classify -> Dynamic Score -> Duplicate Scan -> Merge Duplicates ->
    Automatic Rescore -> Verification Transition -> Coordinator Override Protection ->
    Audit Log Verification & Idempotency.
    """
    # 1. Intake primary incident with Indian location text
    primary_payload = {
        "title": "Trapped residents in flooded apartment complex",
        "type": "Emergency Incident",
        "sector": "Mumbai Coastal Belt",
        "locationName": "Marine Drive, Mumbai",
        "report_text": "Heavy floodwaters entered ground-floor apartments on Marine Drive. 3 non-ambulatory elderly people stranded.",
        "peopleAffected": "3 elderly people stranded",
        "run_nlp_classification": True,
    }
    resp1 = client.post("/api/v1/incidents", json=primary_payload)
    assert resp1.status_code == 201
    primary = resp1.json()
    primary_id = primary["id"]

    assert primary["verificationStatus"] == "unverified"
    assert primary["severity"] in ("high", "critical")
    assert primary["priorityScore"] >= 65
    assert primary["affectedCountNumeric"] == 3
    # Geocoded for Marine Drive, Mumbai
    assert primary["coordinates"] is not None
    assert primary["coordinates"][0] > 18.0  # Mumbai latitude
    initial_priority = primary["priorityScore"]

    # 2. Intake second related report in the same sector with higher casualty scale
    duplicate_payload = {
        "title": "Flooding entering ground level residences on Marine Drive",
        "type": "Emergency Incident",
        "sector": "Mumbai Coastal Belt",
        "locationName": "Marine Drive promenade",
        "report_text": "Flooding entering ground level residences on Marine Drive. 12 residents trapped in building.",
        "peopleAffected": "12 residents trapped",
        "run_nlp_classification": True,
    }
    resp2 = client.post("/api/v1/incidents", json=duplicate_payload)
    assert resp2.status_code == 201
    duplicate = resp2.json()
    dup_id = duplicate["id"]
    assert duplicate["affectedCountNumeric"] == 12

    # 3. Retrieve duplicates for primary
    dup_resp = client.get(f"/api/v1/incidents/{primary_id}/duplicates")
    assert dup_resp.status_code == 200
    suggestions = dup_resp.json()
    assert any(s["candidate_incident_id"] == dup_id for s in suggestions)

    # 4. Coordinator Merges Duplicate Report
    merge_payload = {
        "primaryIncidentId": primary_id,
        "duplicateIncidentId": dup_id,
        "operator": "Coordinator Jordan Davis",
        "reason": "Corroborated distress report of expanding flood with 12 trapped individuals.",
        "updateCorroboration": True,
    }
    merge_resp = client.post(f"/api/v1/incidents/{primary_id}/merge-duplicate", json=merge_payload)
    assert merge_resp.status_code == 200
    merged = merge_resp.json()

    # Priority and affected count should increase from merged evidence
    assert merged["affectedCountNumeric"] == 12
    assert merged["priorityScore"] >= initial_priority
    assert merged["duplicate_count"] >= 1
    post_merge_priority = merged["priorityScore"]

    # Duplicate should now be marked merged
    dup_check = client.get(f"/api/v1/incidents/{dup_id}")
    assert dup_check.status_code == 200
    assert dup_check.json()["is_duplicate"] is True
    assert dup_check.json()["duplicate_of_id"] == primary_id
    assert dup_check.json()["responseStatus"] == "merged_duplicate"

    # 5. Coordinator verifies incident
    ver_payload = {
        "verificationStatus": "verified",
        "operator": "Coordinator Jordan Davis",
        "reason": "Ground search and rescue team confirmed 12 trapped residents.",
    }
    ver_resp = client.patch(f"/api/v1/incidents/{primary_id}/verification", json=ver_payload)
    assert ver_resp.status_code == 200
    verified = ver_resp.json()
    assert verified["verificationStatus"] == "verified"
    # Verification boosts priority score
    assert verified["priorityScore"] >= post_merge_priority
    verified_priority = verified["priorityScore"]

    # 6. Manual Priority and Status Override
    override_payload = {
        "newPriority": 96,
        "responseStatus": "dispatched",
        "operator": "Lead Coordinator Alex",
        "reason": "Emergency VIP coordination directive for rapid air evacuation.",
    }
    over_resp = client.post(f"/api/v1/incidents/{primary_id}/override", json=override_payload)
    assert over_resp.status_code == 200
    overridden = over_resp.json()
    assert overridden["priorityScore"] == 96
    assert overridden["responseStatus"] == "dispatched"
    assert overridden["is_priority_overridden"] is True

    # 7. Verification transition to 'disputed' does NOT overwrite coordinator's manual priority 96!
    disp_payload = {
        "verificationStatus": "disputed",
        "operator": "Inspector Thorne",
        "reason": "Temporary misidentification of building number.",
    }
    disp_resp = client.patch(f"/api/v1/incidents/{primary_id}/verification", json=disp_payload)
    assert disp_resp.status_code == 200
    disp_data = disp_resp.json()
    assert disp_data["verificationStatus"] == "disputed"
    assert disp_data["priorityScore"] == 96  # Manual override strictly preserved!

    # 8. Audit trail completeness and idempotency
    audit_resp = client.get(f"/api/v1/incidents/{primary_id}/audit-log")
    assert audit_resp.status_code == 200
    audit_logs = audit_resp.json()
    action_types = [l["actionType"] for l in audit_logs]

    assert "INCIDENT_CREATED" in action_types
    assert "DUPLICATE_REPORT_MERGED" in action_types
    assert "PRIORITY_RESCORING" in action_types
    assert "VERIFICATION_STATUS_CHANGE" in action_types
    assert "PRIORITY_OVERRIDE" in action_types
    assert "RESPONSE_STATUS_CHANGE" in action_types

    # Redundant update to disputed does not add extra audit log
    initial_log_count = len(audit_logs)
    client.patch(f"/api/v1/incidents/{primary_id}/verification", json=disp_payload)
    audit_resp_after = client.get(f"/api/v1/incidents/{primary_id}/audit-log")
    assert len(audit_resp_after.json()) == initial_log_count
