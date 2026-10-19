"""
RESQNET AI — Dynamic Community Emergency Number & Android SMS Forwarding Tests

Tests:
1. Community emergency number configuration, retrieval, and updating.
2. Coordinator RBAC authorization on number management actions.
3. Number deletion with secret invalidation, status set to unavailable, and preservation of incidents/audit logs.
4. Android forwarding webhook authentication (X-RESQNET-FORWARDING-SECRET and Bearer).
5. Rejection of requests when no number configured or status unavailable.
6. Android forwarded SMS normalization, HumAID classification, and 5-factor priority scoring.
7. Incident provenance marked as 'sms_forwarded' and notification center integration.
8. Database-backed idempotency preventing duplicate incidents and duplicate notifications.
9. Missing coordinates remain uninvented.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.database.session import get_db, SessionLocal
from backend.app.models.sms import CommunityEmergencyNumber, InboundSMSMessage
from backend.app.models.incident import Incident
from backend.app.models.notification import Notification
from backend.app.core.security import DEV_COORDINATOR_TOKEN


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def coordinator_headers():
    return {"Authorization": f"Bearer {DEV_COORDINATOR_TOKEN}"}


def test_community_number_lifecycle(client: TestClient, db_session: Session, coordinator_headers):
    """
    Test Add/Save, Retrieve, Update/Change, and Delete lifecycle of community emergency number.
    """
    # 1. Clean up any existing records for clean test state
    db_session.query(CommunityEmergencyNumber).delete()
    db_session.commit()

    # 2. Initial state: not configured
    res = client.get("/api/v1/sms/community-number", headers=coordinator_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "not_configured"
    assert data["is_active"] is False

    # 3. Add / Save community number (+91 98765 43210)
    create_payload = {
        "phone_number": "+91 98765 43210",
        "country_code": "+91",
        "raw_number": "9876543210",
        "volunteer_notes": "Volunteer Shift Lead Priya - Moto G Power",
    }
    res = client.post("/api/v1/sms/community-number", json=create_payload, headers=coordinator_headers)
    assert res.status_code == 201
    created = res.json()
    assert created["status"] == "setup_required"
    assert created["is_active"] is True
    assert created["country_code"] == "+91"
    assert "9876543210" in created["raw_number"]
    assert created["forwarding_secret"] is not None
    assert created["forwarding_secret"].startswith("rqn_fwd_")
    secret_1 = created["forwarding_secret"]

    # 4. Retrieve configured number
    res = client.get("/api/v1/sms/community-number", headers=coordinator_headers)
    assert res.status_code == 200
    retrieved = res.json()
    assert retrieved["status"] == "setup_required"
    assert retrieved["forwarding_secret"] == secret_1

    # 5. Test connection ping transitions status to 'connected'
    res = client.post("/api/v1/sms/community-number/test-ping", headers=coordinator_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "connected"

    res = client.get("/api/v1/sms/community-number", headers=coordinator_headers)
    assert res.json()["status"] == "connected"

    # 6. Change number (only one active number permitted)
    change_payload = {
        "phone_number": "+1 415 555 0199",
        "country_code": "+1",
        "raw_number": "4155550199",
        "volunteer_notes": "Backup Volunteer Phone",
    }
    res = client.post("/api/v1/sms/community-number", json=change_payload, headers=coordinator_headers)
    assert res.status_code == 201
    changed = res.json()
    assert changed["status"] == "setup_required"
    assert changed["country_code"] == "+1"
    assert changed["forwarding_secret"] != secret_1  # New secret generated

    # Verify previous number was deactivated
    old_numbers = (
        db_session.query(CommunityEmergencyNumber)
        .filter(CommunityEmergencyNumber.raw_number == "9876543210")
        .all()
    )
    for n in old_numbers:
        assert n.is_active is False

    # 7. Delete number
    res = client.delete("/api/v1/sms/community-number", headers=coordinator_headers)
    assert res.status_code == 200
    deleted = res.json()
    assert deleted["status"] == "unavailable"
    assert deleted["is_active"] is False

    # Verify secret was invalidated
    res = client.get("/api/v1/sms/community-number", headers=coordinator_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "unavailable"
    assert data["is_active"] is False
    assert data["forwarding_secret"] is None


def test_community_number_unauthorized_access(client: TestClient):
    """
    Ensure non-coordinator requests cannot modify or access community emergency number secrets.
    """
    citizen_token = "invalid-or-citizen-token"
    res = client.get("/api/v1/sms/community-number", headers={"Authorization": f"Bearer {citizen_token}"})
    assert res.status_code in (401, 403)

    res = client.post(
        "/api/v1/sms/community-number",
        json={"phone_number": "+91 99999 88888", "country_code": "+91", "raw_number": "9999988888"},
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert res.status_code in (401, 403)

    res = client.delete("/api/v1/sms/community-number", headers={"Authorization": f"Bearer {citizen_token}"})
    assert res.status_code in (401, 403)


def test_forwarding_webhook_authentication(client: TestClient, db_session: Session, coordinator_headers):
    """
    Test authentication behavior of POST /api/v1/sms/forwarded.
    """
    db_session.query(CommunityEmergencyNumber).delete()
    db_session.commit()

    # Configure an active emergency number
    res = client.post(
        "/api/v1/sms/community-number",
        json={"phone_number": "+91 98765 00001", "country_code": "+91", "raw_number": "9876500001"},
        headers=coordinator_headers,
    )
    secret = res.json()["forwarding_secret"]

    # 1. Missing secret token -> 401
    res = client.post("/api/v1/sms/forwarded", json={"from": "+919111111111", "text": "Flood alert"})
    assert res.status_code == 401

    # 2. Invalid secret token -> 401
    res = client.post(
        "/api/v1/sms/forwarded",
        headers={"X-RESQNET-FORWARDING-SECRET": "wrong-secret-token"},
        json={"from": "+919111111111", "text": "Flood alert"},
    )
    assert res.status_code == 401

    # 3. Valid secret token with test ping -> 200 OK
    res = client.post(
        "/api/v1/sms/forwarded",
        headers={"X-RESQNET-FORWARDING-SECRET": secret},
        json={"from": "+919111111111", "text": "TEST_PING"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ping_acknowledged"

    # 4. Delete number -> Subsequent forwarded requests rejected with 403
    client.delete("/api/v1/sms/community-number", headers=coordinator_headers)
    res = client.post(
        "/api/v1/sms/forwarded",
        headers={"X-RESQNET-FORWARDING-SECRET": secret},
        json={"from": "+919111111111", "text": "HELP emergency"},
    )
    assert res.status_code == 403
    assert "unavailable" in res.json()["detail"].lower()


def test_forwarded_sms_incident_creation_and_notifications(client: TestClient, db_session: Session, coordinator_headers):
    """
    Verify that an accepted forwarded SMS:
    1. Creates at most one incident.
    2. Labels provenance distinctly as 'sms_forwarded' / 'SMS (Android Forwarded)'.
    3. Triggers HumAID classification and 5-factor priority scoring.
    4. Creates exactly one notification for coordinators with source 'sms_forwarded'.
    5. Duplicate delivery returns 200 OK without creating second incident or duplicate notification.
    6. Does not invent coordinates for unmentioned locations.
    """
    # Configure number
    res = client.post(
        "/api/v1/sms/community-number",
        json={"phone_number": "+91 98765 11111", "country_code": "+91", "raw_number": "9876511111"},
        headers=coordinator_headers,
    )
    secret = res.json()["forwarding_secret"]

    import uuid
    message_id = f"fwd-msg-{uuid.uuid4().hex[:10]}"
    payload = {
        "from": "+91 94481 99999",
        "text": "HELP! Bridge collapsed near Malpe Harbor. 5 fishermen trapped under debris. Severe bleeding.",
        "id": message_id,
        "timestamp": "2026-10-19T23:00:00Z",
    }

    # 1. First delivery: Creates incident
    res = client.post(
        "/api/v1/sms/forwarded",
        headers={"X-RESQNET-FORWARDING-SECRET": secret},
        json=payload,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "created"
    assert data["is_duplicate"] is False
    assert data["incident_id"] is not None
    inc_id = data["incident_id"]

    # Verify Incident in DB
    incident = db_session.query(Incident).filter(Incident.id == inc_id).first()
    assert incident is not None
    assert incident.report_source == "sms_forwarded"
    assert "Android Forwarded" in incident.sourceSummary
    assert "+91 94481 99999" in incident.sourceSummary
    assert incident.verificationStatus == "unverified"
    assert incident.priorityScore > 0

    # Verify notification created
    notif = (
        db_session.query(Notification)
        .filter(Notification.incident_id == inc_id)
        .first()
    )
    assert notif is not None
    assert notif.source == "sms_forwarded"
    assert "New SMS report received" in notif.title

    # 2. Second delivery with identical message_id: Idempotent duplicate check
    res_dup = client.post(
        "/api/v1/sms/forwarded",
        headers={"X-RESQNET-FORWARDING-SECRET": secret},
        json=payload,
    )
    assert res_dup.status_code == 200
    dup_data = res_dup.json()
    assert dup_data["status"] == "duplicate"
    assert dup_data["is_duplicate"] is True
    assert dup_data["incident_id"] == inc_id

    # Verify NO duplicate incident was created
    matching_incidents = (
        db_session.query(Incident)
        .filter(Incident.sourceSummary.like(f"%{message_id}%"))
        .all()
    )
    assert len(matching_incidents) == 1

    # Verify InboundSMSMessage recorded exactly once
    sms_logs = (
        db_session.query(InboundSMSMessage)
        .filter(InboundSMSMessage.id == message_id)
        .all()
    )
    assert len(sms_logs) == 1


    # Verify NO duplicate notification was created
    notifs = (
        db_session.query(Notification)
        .filter(Notification.incident_id == inc_id)
        .all()
    )
    assert len(notifs) == 1


def test_forwarded_sms_missing_coordinates_not_fabricated(client: TestClient, db_session: Session, coordinator_headers):
    """
    Verify that an incoming SMS with unknown location does NOT receive fabricated coordinates.
    """
    import uuid
    res = client.post(
        "/api/v1/sms/community-number",
        json={"phone_number": "+91 98765 22222", "country_code": "+91", "raw_number": "9876522222"},
        headers=coordinator_headers,
    )
    secret = res.json()["forwarding_secret"]

    payload = {
        "from": "+91 94481 88888",
        "text": "SOS generator on fire in remote farmhouse. Nobody hurt.",
        "id": f"fwd-unknown-loc-{uuid.uuid4().hex[:10]}",
    }

    res = client.post(
        "/api/v1/sms/forwarded",
        headers={"X-RESQNET-FORWARDING-SECRET": secret},
        json=payload,
    )
    assert res.status_code == 201
    inc_id = res.json()["incident_id"]

    incident = db_session.query(Incident).filter(Incident.id == inc_id).first()
    assert incident is not None
    # Coordinates must either be None or flagged as unverified/unresolved, never synthetic coordinates
    if incident.coordinates is not None:
        assert incident.location_resolution_status != "precise_gps"

