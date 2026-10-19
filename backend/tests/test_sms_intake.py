"""
RESQNET AI — Automated SMS Intake and Idempotency Test Suite

Validates:
1. Valid authenticated simulated SMS creates an incident (HTTP 201).
2. Missing or invalid secret token is rejected (HTTP 401).
3. Empty or whitespace-only message body is rejected (HTTP 422).
4. Repeated message ID does not create duplicate incidents (idempotency, HTTP 200).
5. Unknown location remains unresolved (coordinates null, never invented).
6. Known location resolves coordinates safely.
7. Existing HumAID NLP and 5-factor priority scoring are reused.
8. New SMS incidents remain unverified.
9. Incident persists and is retrievable through existing incident APIs.
10. Pipe-delimited format (FLOOD | Near Udupi railway underpass | 3 people trapped | Need rescue)
    extracts hazard, location, people affected (3), and urgent needs.
11. Free-text format is supported.
12. Security: Simulator disabled outside dev/test returns HTTP 403.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.incident import Incident
from backend.app.models.sms import InboundSMSMessage

TEST_SMS_TOKEN = "resqnet-sim-sms-dev-token-2026"


def test_missing_auth_token_rejected(client: TestClient):
    """Confirm missing authentication token returns 401 Unauthorized."""
    payload = {
        "message_id": "test-sms-auth-missing",
        "sender": "+919876543210",
        "body": "FLOOD | Near Udupi railway underpass | 3 people trapped | Need rescue",
    }
    # No auth header
    res = client.post("/api/v1/sms/incoming", json=payload)
    assert res.status_code == 401
    assert "Missing SMS simulator authentication token" in res.json()["detail"]


def test_invalid_auth_token_rejected(client: TestClient):
    """Confirm invalid authentication token returns 401 Unauthorized."""
    payload = {
        "message_id": "test-sms-auth-invalid",
        "sender": "+919876543210",
        "body": "FLOOD | Near Udupi railway underpass | 3 people trapped | Need rescue",
    }
    res = client.post(
        "/api/v1/sms/incoming",
        json=payload,
        headers={"X-RESQNET-SMS-TOKEN": "wrong-bad-token"},
    )
    assert res.status_code == 401
    assert "Invalid SMS simulator authentication token" in res.json()["detail"]


def test_empty_or_whitespace_body_rejected(client: TestClient):
    """Confirm empty or whitespace-only message body is rejected with 422."""
    payload_empty = {
        "message_id": "test-sms-empty-body",
        "sender": "+919876543210",
        "body": "   ",
    }
    res = client.post(
        "/api/v1/sms/incoming",
        json=payload_empty,
        headers={"X-RESQNET-SMS-TOKEN": TEST_SMS_TOKEN},
    )
    assert res.status_code == 422


def test_valid_authenticated_sms_creates_incident(client: TestClient, db_session: Session):
    """Confirm a valid authenticated simulated SMS creates an incident (HTTP 201)."""
    payload = {
        "message_id": "sim-sms-msg-001",
        "sender": "+919876543210",
        "body": "FLOOD | Near Udupi railway underpass | 3 people trapped | Need rescue",
        "provider": "simulated",
    }

    res = client.post(
        "/api/v1/sms/incoming",
        json=payload,
        headers={"X-RESQNET-SMS-TOKEN": TEST_SMS_TOKEN},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "created"
    assert data["is_duplicate"] is False
    assert data["message_id"] == "sim-sms-msg-001"
    assert data["incident_id"] is not None
    assert data["incident_id"].startswith("RQN-")

    inc_data = data["incident"]
    assert inc_data["id"] == data["incident_id"]
    assert "Flood" in inc_data["type"] or "FLOOD" in inc_data["type"].upper()
    assert "Near Udupi railway underpass" in inc_data["locationName"]
    assert inc_data["affectedCountNumeric"] == 3
    assert "3 people trapped" in inc_data["peopleAffected"]
    assert inc_data["verificationStatus"] == "unverified"
    assert inc_data["report_source"] == "sms_simulated"
    assert "SMS (Simulated)" in inc_data["sourceSummary"]
    assert "sim-sms-msg-001" in inc_data["sourceSummary"]
    assert inc_data["report_text"] == payload["body"]

    # Verify unknown location remains unresolved (Never invent coordinates!)
    assert inc_data["coordinates"] is None
    assert inc_data["is_synthetic_location"] is False

    # Verify NLP and priority scoring were applied
    assert inc_data["priorityScore"] > 0
    assert inc_data["severity"] in ("critical", "high", "moderate")
    assert inc_data.get("scoring_breakdown") is not None

    # Verify database persistence
    db_inc = db_session.query(Incident).filter(Incident.id == data["incident_id"]).first()
    assert db_inc is not None
    assert db_inc.verificationStatus == "unverified"
    assert db_inc.coordinates is None

    # Verify InboundSMSMessage table persistence
    db_msg = db_session.query(InboundSMSMessage).filter(InboundSMSMessage.id == "sim-sms-msg-001").first()
    assert db_msg is not None
    assert db_msg.incident_id == data["incident_id"]
    assert db_msg.sender == "+919876543210"
    assert db_msg.status == "processed"


def test_bearer_token_auth_supported(client: TestClient):
    """Confirm Authorization: Bearer <token> is also accepted."""
    payload = {
        "message_id": "sim-sms-msg-bearer",
        "sender": "+919876543211",
        "body": "FIRE | Industrial Area Zone 4 | 12 workers safe | Fire brigade requested",
    }
    res = client.post(
        "/api/v1/sms/incoming",
        json=payload,
        headers={"Authorization": f"Bearer {TEST_SMS_TOKEN}"},
    )
    assert res.status_code == 201
    assert res.json()["status"] == "created"


def test_idempotency_prevents_duplicate_incidents(client: TestClient, db_session: Session):
    """
    Confirm repeated delivery of the same message_id does not create duplicate incidents.
    Returns HTTP 200 with is_duplicate: True and the previously created incident.
    """
    payload = {
        "message_id": "sim-sms-msg-idempotent-key",
        "sender": "+919876543222",
        "body": "FLOOD | Near Udupi railway underpass | 3 people trapped | Need rescue",
    }

    # Initial delivery: creates incident
    res1 = client.post(
        "/api/v1/sms/incoming",
        json=payload,
        headers={"X-RESQNET-SMS-TOKEN": TEST_SMS_TOKEN},
    )
    assert res1.status_code == 201
    data1 = res1.json()
    first_incident_id = data1["incident_id"]
    assert data1["is_duplicate"] is False

    initial_incident_count = db_session.query(Incident).count()

    # Repeated delivery: must NOT create duplicate incident
    res2 = client.post(
        "/api/v1/sms/incoming",
        json=payload,
        headers={"X-RESQNET-SMS-TOKEN": TEST_SMS_TOKEN},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "duplicate"
    assert data2["is_duplicate"] is True
    assert data2["message_id"] == "sim-sms-msg-idempotent-key"
    assert data2["incident_id"] == first_incident_id
    assert data2["incident"]["id"] == first_incident_id

    # Verify incident count in database did NOT increase
    post_repeat_count = db_session.query(Incident).count()
    assert post_repeat_count == initial_incident_count


def test_free_text_sms_intake_supported(client: TestClient):
    """Confirm free-text SMS reports are correctly structured and ingested."""
    payload = {
        "message_id": "sim-sms-free-text-01",
        "sender": "+919988776655",
        "body": "Heavy landslide reported at Wayanad camp with 8 people trapped inside damaged house, urgent rescue needed immediately",
    }

    res = client.post(
        "/api/v1/sms/incoming",
        json=payload,
        headers={"X-RESQNET-SMS-TOKEN": TEST_SMS_TOKEN},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "created"
    inc = data["incident"]

    assert inc["affectedCountNumeric"] == 8
    # Wayanad is in the verified Indian gazetteer, so coordinates resolve safely
    assert inc["coordinates"] is not None
    assert len(inc["coordinates"]) == 2
    assert inc["verificationStatus"] == "unverified"
    assert inc["report_source"] == "sms_simulated"


def test_retrieval_through_existing_incident_apis(client: TestClient):
    """Confirm created SMS incidents appear in standard incident listing and priority queue."""
    msg_id = "sim-sms-retrieval-check"
    payload = {
        "message_id": msg_id,
        "sender": "+919876543999",
        "body": "COLLAPSE | Central Market Complex | 5 injured | Ambulances needed",
    }
    create_res = client.post(
        "/api/v1/sms/incoming",
        json=payload,
        headers={"X-RESQNET-SMS-TOKEN": TEST_SMS_TOKEN},
    )
    assert create_res.status_code == 201
    inc_id = create_res.json()["incident_id"]

    # 1. Check GET /api/v1/incidents
    list_res = client.get("/api/v1/incidents")
    assert list_res.status_code == 200
    all_incidents = list_res.json()
    matching = [i for i in all_incidents if i["id"] == inc_id]
    assert len(matching) == 1
    found = matching[0]
    assert found["report_source"] == "sms_simulated"
    assert found["verificationStatus"] == "unverified"

    # 2. Check GET /api/v1/incidents/{id}
    detail_res = client.get(f"/api/v1/incidents/{inc_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == inc_id
    assert detail_res.json()["report_text"] == payload["body"]

    # 3. Check Priority Queue GET /api/v1/incidents/priority-queue
    pq_res = client.get("/api/v1/incidents/priority-queue")
    assert pq_res.status_code == 200
    pq_ids = [i["id"] for i in pq_res.json()]
    assert inc_id in pq_ids


def test_production_disabled_behavior(client: TestClient, monkeypatch):
    """Confirm simulator endpoint is disabled (403) in production when ENABLE_SMS_SIMULATOR is False."""
    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "ENABLE_SMS_SIMULATOR", False)

    payload = {
        "message_id": "test-prod-disabled",
        "sender": "+919876543210",
        "body": "FLOOD | Near Udupi railway underpass | 3 people trapped | Need rescue",
    }
    res = client.post(
        "/api/v1/sms/incoming",
        json=payload,
        headers={"X-RESQNET-SMS-TOKEN": TEST_SMS_TOKEN},
    )
    assert res.status_code == 403
    assert "disabled in production" in res.json()["detail"]
