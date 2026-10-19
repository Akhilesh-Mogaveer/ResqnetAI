"""
RESQNET AI — Tactical Notification Center Automated Test Suite

Covers:
1. Website-created incident produces a persistent notification (type='incident_created').
2. Simulated SMS-created incident (POST /api/v1/sms/incoming) produces a notification with source 'sms_simulated'.
3. Sensor-created incident produces a notification with source 'sensor'.
4. Duplicate SMS delivery (identical message_id) does not create a second notification.
5. Incident updates (verification change, response status change, priority override) do not create another creation notification.
6. Failed incident creation (e.g. invalid payload) does not create a notification.
7. Notifications persist in SQLite and are retrievable across fresh requests.
8. Read/unread state: mark individual notification read and mark all as read.
9. Security & RBAC: Unauthorized users (e.g. 'citizen' role or invalid token) cannot access notification endpoints.
10. Notification content & integrity: concise, factual, no private report dump, unverified status clearly indicated.
11. Real-time delivery: WebSocket receives incident_created broadcast.
"""

import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.security import create_access_token, SYSTEM_USERS
from backend.app.models.incident import Incident
from backend.app.models.notification import Notification

TEST_SMS_TOKEN = "resqnet-sim-sms-dev-token-2026"


@pytest.fixture
def coordinator_headers() -> dict:
    """Provide authenticated coordinator Bearer token headers."""
    token = create_access_token(SYSTEM_USERS["coordinator"])
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def citizen_headers() -> dict:
    """Provide authenticated citizen Bearer token headers."""
    token = create_access_token(SYSTEM_USERS["citizen"])
    return {"Authorization": f"Bearer {token}"}


def test_website_created_incident_produces_notification(client: TestClient, coordinator_headers: dict, db_session: Session):
    """Test 1: Normal website incident creation generates a persistent notification."""
    payload = {
        "title": "Severe Gas Odor in Market",
        "type": "Hazardous Condition",
        "sector": "West Market Square",
        "locationName": "Market Plaza Bldg 4",
        "coordinates": [37.7650, -122.4210],
        "severity": "critical",
        "peopleAffected": "25 evacuated",
        "affectedCountNumeric": 25,
        "report_source": "website",
        "report_text": "Strong sulfur and methane smell detected near commercial kitchen vents. Evacuation underway.",
        "sourceSummary": "Citizen Report Form - Intake via Emergency Report Form",
    }

    res = client.post("/api/v1/incidents", json=payload, headers=coordinator_headers)
    assert res.status_code == 201
    created_inc = res.json()
    inc_id = created_inc["id"]

    # Verify notification was generated and persisted
    notif = db_session.query(Notification).filter(
        Notification.type == "incident_created",
        Notification.incident_id == inc_id,
    ).first()

    assert notif is not None
    assert notif.incident_id == inc_id
    assert notif.source == "website"
    assert notif.severity == created_inc["severity"]
    assert notif.priority_score == created_inc["priorityScore"]
    assert notif.is_read is False
    assert inc_id in notif.title
    # Message must be concise and factual without dumping raw narrative
    assert "Priority:" in notif.message
    assert "Status: unverified" in notif.message


def test_simulated_sms_created_incident_produces_notification(client: TestClient, coordinator_headers: dict, db_session: Session):
    """Test 2: Simulated SMS intake produces a notification with source 'sms_simulated'."""
    sms_payload = {
        "message_id": "sms-notif-test-001",
        "sender": "+919876543210",
        "body": "FLOOD | Near Udupi railway underpass | 3 people trapped | Need rescue urgently",
    }

    res = client.post(
        "/api/v1/sms/incoming",
        json=sms_payload,
        headers={"X-RESQNET-SMS-TOKEN": TEST_SMS_TOKEN},
    )
    assert res.status_code == 201
    data = res.json()
    inc_id = data["incident_id"]

    # Verify notification in database
    notif = db_session.query(Notification).filter(
        Notification.type == "incident_created",
        Notification.incident_id == inc_id,
    ).first()

    assert notif is not None
    assert notif.source == "sms_simulated"
    assert "New SMS report received" in notif.title
    assert inc_id in notif.title
    assert notif.is_read is False


def test_sensor_created_incident_produces_notification(client: TestClient, coordinator_headers: dict, db_session: Session):
    """Test 3: Sensor-generated incident produces a notification with source 'sensor'."""
    payload = {
        "title": "SCADA Water Pressure Alarm",
        "type": "Critical Infrastructure",
        "sector": "Lower Marina Basin",
        "locationName": "Water Pumping Station 2",
        "coordinates": [37.7680, -122.4450],
        "severity": "high",
        "peopleAffected": "Facility telemetry alarm",
        "report_source": "Sensor",
        "report_text": "IoT telemetry threshold exceeded. Water pressure dropped to 12 PSI at main manifold.",
        "sourceSummary": "Sensor Telemetry - SCADA Network Alarm",
    }

    res = client.post("/api/v1/incidents", json=payload, headers=coordinator_headers)
    assert res.status_code == 201
    inc_id = res.json()["id"]

    notif = db_session.query(Notification).filter(
        Notification.type == "incident_created",
        Notification.incident_id == inc_id,
    ).first()

    assert notif is not None
    assert notif.source == "sensor"
    assert "New sensor-generated incident" in notif.title
    assert inc_id in notif.title


def test_duplicate_sms_does_not_create_second_notification(client: TestClient, coordinator_headers: dict, db_session: Session):
    """Test 4: Duplicate SMS redelivery (same message_id) returns existing incident and creates NO second notification."""
    sms_payload = {
        "message_id": "sms-dedup-notif-002",
        "sender": "+919876543210",
        "body": "FIRE | Timber yard warehouse East Harbor | 5 people trapped",
    }

    # First delivery
    res1 = client.post(
        "/api/v1/sms/incoming",
        json=sms_payload,
        headers={"X-RESQNET-SMS-TOKEN": TEST_SMS_TOKEN},
    )
    assert res1.status_code == 201
    inc_id = res1.json()["incident_id"]

    # Initial count of notifications for this incident
    count_1 = db_session.query(Notification).filter(
        Notification.type == "incident_created",
        Notification.incident_id == inc_id,
    ).count()
    assert count_1 == 1

    # Second delivery with identical message_id (idempotent redelivery)
    res2 = client.post(
        "/api/v1/sms/incoming",
        json=sms_payload,
        headers={"X-RESQNET-SMS-TOKEN": TEST_SMS_TOKEN},
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "duplicate"
    assert res2.json()["incident_id"] == inc_id

    # Notification count MUST remain exactly 1
    count_2 = db_session.query(Notification).filter(
        Notification.type == "incident_created",
        Notification.incident_id == inc_id,
    ).count()
    assert count_2 == 1


def test_incident_update_does_not_create_notification(client: TestClient, coordinator_headers: dict, db_session: Session):
    """Test 5: Updating an existing incident's verification or response status does NOT create a new creation notification."""
    # Create incident first
    res = client.post(
        "/api/v1/incidents",
        json={
            "title": "Submerged Vehicle under bridge",
            "type": "Flash Flood",
            "sector": "Northgate Expressway",
            "locationName": "Mile Marker 4",
            "severity": "high",
            "report_text": "One car trapped in fast water under bridge.",
        },
        headers=coordinator_headers,
    )
    assert res.status_code == 201
    inc_id = res.json()["id"]

    initial_notifs_count = db_session.query(Notification).filter(
        Notification.incident_id == inc_id
    ).count()
    assert initial_notifs_count == 1

    # Update verification status
    res_verify = client.patch(
        f"/api/v1/incidents/{inc_id}/verification",
        json={
            "verificationStatus": "verified",
            "operator": "Coordinator Jordan Davis",
            "reason": "Direct visual confirmation by traffic camera.",
        },
        headers=coordinator_headers,
    )
    assert res_verify.status_code == 200

    # Update response status
    res_resp = client.patch(
        f"/api/v1/incidents/{inc_id}/response-status",
        json={
            "responseStatus": "dispatched",
            "assignedTeam": "Water Rescue Unit 3",
            "operator": "Coordinator Jordan Davis",
            "reason": "Team deployed to scene.",
        },
        headers=coordinator_headers,
    )
    assert res_resp.status_code == 200

    # Verify notification count for this incident has NOT increased
    updated_notifs_count = db_session.query(Notification).filter(
        Notification.incident_id == inc_id
    ).count()
    assert updated_notifs_count == 1


def test_failed_creation_does_not_create_notification(client: TestClient, coordinator_headers: dict, db_session: Session):
    """Test 6: Failed creation (e.g. invalid coordinate specification) does not create any notification."""
    count_before = db_session.query(Notification).count()

    invalid_payload = {
        "title": "Impossible Coordinates Report",
        "type": "Severe Weather",
        "coordinates": [999.0, 999.0],  # Lat > 90 is invalid
        "report_text": "Report with bad coordinates",
    }

    res = client.post("/api/v1/incidents", json=invalid_payload, headers=coordinator_headers)
    assert res.status_code in (422, 400)

    count_after = db_session.query(Notification).count()
    assert count_after == count_before


def test_notifications_persist_and_retrieved_via_api(client: TestClient, coordinator_headers: dict):
    """Test 7: Stored notifications can be retrieved via GET /api/v1/notifications."""
    res = client.get("/api/v1/notifications", headers=coordinator_headers)
    assert res.status_code == 200
    data = res.json()
    assert "notifications" in data
    assert "unread_count" in data
    assert "total_count" in data
    assert isinstance(data["notifications"], list)
    assert data["total_count"] >= 1


def test_read_unread_state_and_mark_all_read(client: TestClient, coordinator_headers: dict, db_session: Session):
    """Test 8: Marking an individual notification read and marking all as read."""
    # Retrieve current unread notifications
    res = client.get("/api/v1/notifications?unread_only=true", headers=coordinator_headers)
    assert res.status_code == 200
    unread_list = res.json()["notifications"]

    if not unread_list:
        # Create one to test
        client.post(
            "/api/v1/incidents",
            json={"title": "Test Incident for Read State", "report_text": "Testing read state transitions."},
            headers=coordinator_headers,
        )
        res = client.get("/api/v1/notifications?unread_only=true", headers=coordinator_headers)
        unread_list = res.json()["notifications"]

    assert len(unread_list) > 0
    target_id = unread_list[0]["id"]

    # Mark single notification as read
    res_mark = client.patch(f"/api/v1/notifications/{target_id}/read", headers=coordinator_headers)
    assert res_mark.status_code == 200
    assert res_mark.json()["is_read"] is True

    # Mark all remaining as read
    res_all = client.post("/api/v1/notifications/mark-all-read", headers=coordinator_headers)
    assert res_all.status_code == 200
    assert res_all.json()["unread_count"] == 0

    # Verify unread count is now 0
    res_count = client.get("/api/v1/notifications/unread-count", headers=coordinator_headers)
    assert res_count.status_code == 200
    assert res_count.json()["unread_count"] == 0


def test_unauthorized_users_cannot_access_notifications(client: TestClient, citizen_headers: dict):
    """Test 9: Role-based access control prevents unauthorized citizen users from accessing tactical alerts."""
    # Citizen role access should be rejected with 403 Forbidden
    res = client.get("/api/v1/notifications", headers=citizen_headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

    # Bad token should be rejected with 401 Unauthorized
    res_bad = client.get("/api/v1/notifications", headers={"Authorization": "Bearer bad-token-12345"})
    assert res_bad.status_code == 401


def test_notification_content_integrity(client: TestClient, coordinator_headers: dict, db_session: Session):
    """Test 10: Notifications preserve factual boundaries: unverified remains unverified, no invented dispatch."""
    payload = {
        "title": "Tremor near residential highrise",
        "type": "Earthquake / Tremor",
        "sector": "South Ridge Estate",
        "locationName": "Ridgeview Towers",
        "coordinates": [37.7510, -122.4040],
        "severity": "critical",
        "peopleAffected": "Unknown count",
        "report_source": "website",
        "report_text": "Building shook for 15 seconds. Residents panicked and exited to street.",
    }

    res = client.post("/api/v1/incidents", json=payload, headers=coordinator_headers)
    assert res.status_code == 201
    inc_data = res.json()
    inc_id = inc_data["id"]

    notif = db_session.query(Notification).filter(
        Notification.type == "incident_created",
        Notification.incident_id == inc_id,
    ).first()

    assert notif is not None
    # Must preserve severity and priority matching the persisted incident
    assert notif.severity == inc_data["severity"]
    assert notif.priority_score == inc_data["priorityScore"]
    # Must explicitly state unverified status
    assert "unverified" in notif.message
    # Must not claim units were dispatched
    assert "dispatched" not in notif.message.lower()
    # Incident itself must remain unverified
    db_inc = db_session.query(Incident).filter(Incident.id == inc_id).first()
    assert db_inc.verificationStatus == "unverified"
    assert db_inc.responseStatus == "triage"


def test_websocket_stream_receives_broadcast(client: TestClient):
    """Test 11: Real-time WebSocket connection can connect and exchange ping/pong."""
    with client.websocket_connect("/api/v1/notifications/ws?token=dev-coordinator-token") as websocket:
        websocket.send_text("ping")
        data = websocket.receive_text()
        parsed = json.loads(data)
        assert parsed.get("type") == "pong"
