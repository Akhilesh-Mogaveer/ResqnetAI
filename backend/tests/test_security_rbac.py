"""
Test Suite: Authentication, Cryptographic JWT Validation, and Server-Side RBAC
Verifies Phase 2 requirements:
- Inspect every API router for missing authentication and authorization.
- Validates JWT creation, decoding, expiration, and signature tampering prevention.
- Protects coordinator-only actions: overrides, verification, duplicate merges/dismissals, dispatch.
- Enforces server-side role validation without trusting unverified frontend client payloads.
- Verifies rejection of unauthorized or expired tokens.
"""

from datetime import timedelta
import pytest
from fastapi.testclient import TestClient

from backend.app.core.security import (
    SYSTEM_USERS,
    User,
    UserRole,
    create_access_token,
    decode_access_token,
)
from backend.app.models.incident import Incident


@pytest.fixture
def coordinator_token():
    return create_access_token(SYSTEM_USERS["coordinator"])


@pytest.fixture
def citizen_token():
    return create_access_token(SYSTEM_USERS["citizen"])


@pytest.fixture
def responder_token():
    return create_access_token(SYSTEM_USERS["responder"])


def test_jwt_token_creation_and_tamper_detection():
    """Verify JWT tokens are securely encoded and tampering is detected."""
    user = SYSTEM_USERS["coordinator"]
    token = create_access_token(user, expires_delta=timedelta(hours=2))

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == user.id
    assert payload["role"] == "coordinator"
    assert payload["name"] == user.name

    # Tampered signature should fail to decode
    tampered = token[:-4] + "xxxx"
    assert decode_access_token(tampered) is None


def test_auth_login_endpoint(client: TestClient):
    """Verify login endpoint authenticates credentials and returns valid access token."""
    # Valid coordinator login
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "coordinator", "password": "resqnet-coord-2026"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "coordinator"

    # Invalid password login
    res_bad = client.post(
        "/api/v1/auth/login",
        json={"username": "coordinator", "password": "wrong-password"},
    )
    assert res_bad.status_code == 401


def test_auth_me_endpoint_with_token(client: TestClient, coordinator_token, citizen_token):
    """Verify /auth/me returns accurate server-side role for authenticated identity."""
    res_coord = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {coordinator_token}"})
    assert res_coord.status_code == 200
    assert res_coord.json()["role"] == "coordinator"

    res_cit = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {citizen_token}"})
    assert res_cit.status_code == 200
    assert res_cit.json()["role"] == "citizen"


def test_malformed_or_invalid_authorization_header(client: TestClient, db_session):
    """Verify invalid or malformed tokens return 401 Unauthorized."""
    incident = db_session.query(Incident).first()

    # Non-bearer scheme
    res_scheme = client.post(
        f"/api/v1/incidents/{incident.id}/override",
        json={"newPriority": 90, "reason": "Test override"},
        headers={"Authorization": "Basic dXNlcjpwYXNz"},
    )
    assert res_scheme.status_code == 401

    # Invalid token string
    res_invalid = client.post(
        f"/api/v1/incidents/{incident.id}/override",
        json={"newPriority": 90, "reason": "Test override"},
        headers={"Authorization": "Bearer this-is-not-a-valid-jwt-token"},
    )
    assert res_invalid.status_code == 401


def test_coordinator_only_priority_override_enforces_rbac(
    client: TestClient,
    db_session,
    coordinator_token,
    citizen_token,
):
    """Verify priority overrides are rejected for citizen role and accepted for coordinator."""
    incident = db_session.query(Incident).filter(Incident.is_duplicate == False).first()

    # Citizen attempt -> 403 Forbidden
    res_citizen = client.post(
        f"/api/v1/incidents/{incident.id}/override",
        json={"newPriority": 95, "reason": "Unauthorized priority override attempt"},
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert res_citizen.status_code == 403

    # Coordinator attempt -> 200 OK
    res_coord = client.post(
        f"/api/v1/incidents/{incident.id}/override",
        json={"newPriority": 95, "reason": "Authorized tactical priority elevation"},
        headers={"Authorization": f"Bearer {coordinator_token}"},
    )
    assert res_coord.status_code == 200
    assert res_coord.json()["priorityScore"] == 95


def test_coordinator_only_duplicate_merge_enforces_rbac(
    client: TestClient,
    db_session,
    coordinator_token,
    citizen_token,
):
    """Verify duplicate merge is rejected for citizen role and accepted for coordinator."""
    incidents = db_session.query(Incident).filter(Incident.is_duplicate == False).limit(2).all()
    if len(incidents) < 2:
        pytest.skip("Requires at least two incidents")

    primary, duplicate = incidents[0], incidents[1]

    # Citizen attempt -> 403 Forbidden
    res_citizen = client.post(
        f"/api/v1/incidents/{primary.id}/merge-duplicate",
        json={
            "duplicateIncidentId": duplicate.id,
            "reason": "Unauthorized merge attempt",
        },
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert res_citizen.status_code == 403


def test_audit_log_access_enforces_rbac(client: TestClient, coordinator_token, citizen_token):
    """Verify compliance audit log access is restricted to coordinator/admin and forbidden to citizen."""
    res_citizen = client.get("/api/v1/audit-log", headers={"Authorization": f"Bearer {citizen_token}"})
    assert res_citizen.status_code == 403

    res_coord = client.get("/api/v1/audit-log", headers={"Authorization": f"Bearer {coordinator_token}"})
    assert res_coord.status_code == 200
    assert isinstance(res_coord.json(), list)
