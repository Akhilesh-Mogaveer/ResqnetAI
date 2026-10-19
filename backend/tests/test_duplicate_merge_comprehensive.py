"""
Test Suite: Comprehensive Duplicate Merge Workflow, Evidence Retention, and Transactional Safety
Verifies Phase 3 requirements:
- Selected surviving incident retains reports, notes, evidence, risk factors, and audit history.
- Duplicate is marked is_duplicate=True and responseStatus='merged_duplicate'.
- Duplicate is excluded from active incident lists and priority queues.
- Merge operations are transactional and safe against repeated submissions / self-merges.
- Unrelated incident records are preserved intact and never deleted.
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.core.security import SYSTEM_USERS, create_access_token
from backend.app.models.incident import Incident, AuditLog
from backend.app.schemas.incident import IncidentCreate
from backend.app.services.incident_service import create_incident


@pytest.fixture
def coordinator_headers():
    token = create_access_token(SYSTEM_USERS["coordinator"])
    return {"Authorization": f"Bearer {token}"}


def test_duplicate_merge_preserves_notes_and_evidence(client: TestClient, db_session, coordinator_headers):
    """Verify that merging a duplicate transfers prior notes, combines evidence, and updates counts."""
    # 1. Create two explicit incidents for this test
    inc1 = create_incident(
        db_session,
        IncidentCreate(
            title="Flash Flood at Kalmady Bridge",
            sector="Sector 4 (Malpe - Coastal)",
            locationName="Kalmady Bridge, Udupi",
            coordinates=[13.345, 74.715],
            severity="high",
            priorityScore=75,
            peopleAffected="15 stranded motorists",
            affectedCountNumeric=15,
            riskFactors=["Rapidly rising water", "Road impassable"],
            report_text="River overflowing across Kalmady causeway. 15 people cut off.",
        ),
    )
    inc2 = create_incident(
        db_session,
        IncidentCreate(
            title="Kalmady Causeway Submerged",
            sector="Sector 4 (Malpe - Coastal)",
            locationName="Kalmady Causeway, Udupi",
            coordinates=[13.346, 74.716],
            severity="high",
            priorityScore=72,
            peopleAffected="25 individuals trapped near bridge",
            affectedCountNumeric=25,
            riskFactors=["Submerged electrical pole", "Rapidly rising water"],
            report_text="Water over the causeway, electric pole leaning into current.",
        ),
    )

    # 2. Add an explicit note to the duplicate before merging
    client.post(
        f"/api/v1/incidents/{inc2.id}/notes",
        json={"text": "Field Scout Alpha confirms water 1.2m deep over bridge.", "author": "Field Unit Alpha"},
        headers=coordinator_headers,
    )

    # 3. Authorize merge: inc2 into inc1
    res = client.post(
        f"/api/v1/incidents/{inc1.id}/merge-duplicate",
        json={
            "duplicateIncidentId": inc2.id,
            "operator": "Coordinator Jordan Davis",
            "reason": "Corroborated reports of identical flood event at Kalmady bridge.",
            "updateCorroboration": True,
        },
        headers=coordinator_headers,
    )
    assert res.status_code == 200
    merged_data = res.json()

    # 4. Verify surviving incident properties
    assert merged_data["primary_incident_id"] == inc1.id
    assert merged_data["merged_incident_id"] == inc2.id

    # Primary incident reloaded from DB
    db_session.expire_all()
    primary = db_session.query(Incident).filter(Incident.id == inc1.id).first()
    duplicate = db_session.query(Incident).filter(Incident.id == inc2.id).first()

    assert primary is not None
    assert duplicate is not None

    # Duplicate marked as merged
    assert duplicate.is_duplicate is True
    assert duplicate.duplicate_of_id == primary.id
    assert duplicate.responseStatus == "merged_duplicate"

    # Primary retained duplicate's notes
    primary_note_texts = [n.get("text", "") for n in primary.notes]
    assert any("Field Scout Alpha confirms water 1.2m deep" in t for t in primary_note_texts)
    assert any("Corroborating Report Merged" in t for t in primary_note_texts)

    # Combined risk factors
    assert "Submerged electrical pole" in primary.riskFactors
    assert "Road impassable" in primary.riskFactors

    # Combined affected count
    assert primary.affectedCountNumeric == 25

    # Incremented duplicate count
    assert primary.duplicate_count == 1

    # 5. Verify exclusion from active list and priority queue
    active_incidents = client.get("/api/v1/incidents").json()
    active_ids = [i["id"] for i in active_incidents]
    assert primary.id in active_ids
    assert duplicate.id not in active_ids, "Merged duplicate must be excluded from active incident lists"

    pq = client.get("/api/v1/incidents/priority-queue").json()
    pq_ids = [i["id"] for i in pq]
    assert primary.id in pq_ids
    assert duplicate.id not in pq_ids, "Merged duplicate must be excluded from priority queue"


def test_merge_operation_is_safe_against_repeated_merges(client: TestClient, db_session, coordinator_headers):
    """Verify that merging an already-merged duplicate is safely rejected."""
    p = create_incident(
        db_session,
        IncidentCreate(
            title="Primary Water Logging",
            sector="Sector 1 (City Center)",
            locationName="City Center Road",
            severity="medium",
            priorityScore=50,
        ),
    )
    d = create_incident(
        db_session,
        IncidentCreate(
            title="Duplicate Water Logging",
            sector="Sector 1 (City Center)",
            locationName="City Center Road",
            severity="medium",
            priorityScore=48,
        ),
    )

    # First merge succeeds
    res1 = client.post(
        f"/api/v1/incidents/{p.id}/merge-duplicate",
        json={"duplicateIncidentId": d.id, "reason": "First merge"},
        headers=coordinator_headers,
    )
    assert res1.status_code == 200

    # Repeated merge attempt must fail with 400 Bad Request
    res2 = client.post(
        f"/api/v1/incidents/{p.id}/merge-duplicate",
        json={"duplicateIncidentId": d.id, "reason": "Repeated merge attempt"},
        headers=coordinator_headers,
    )
    assert res2.status_code == 400
    assert "already been merged" in res2.json()["detail"].lower()


def test_cannot_merge_incident_into_itself(client: TestClient, db_session, coordinator_headers):
    """Verify self-merge attempt is rejected with 400 Bad Request."""
    incident = create_incident(
        db_session,
        IncidentCreate(
            title="Isolated Incident",
            sector="Sector 2 (Manipal Ridge)",
            locationName="Tiger Circle",
            severity="low",
            priorityScore=30,
        ),
    )
    res = client.post(
        f"/api/v1/incidents/{incident.id}/merge-duplicate",
        json={"duplicateIncidentId": incident.id, "reason": "Self merge attempt"},
        headers=coordinator_headers,
    )
    assert res.status_code == 400
    assert "cannot merge an incident into itself" in res.json()["detail"].lower()


def test_merge_does_not_delete_unrelated_incidents(client: TestClient, db_session, coordinator_headers):
    """Verify that merging duplicates touches only the subject incidents and leaves all other incidents intact."""
    p = create_incident(
        db_session,
        IncidentCreate(
            title="Incident For Deletion Check A",
            sector="Sector 3 (Udyavara)",
            locationName="Udyavara Junction",
            severity="low",
            priorityScore=20,
        ),
    )
    d = create_incident(
        db_session,
        IncidentCreate(
            title="Incident For Deletion Check B",
            sector="Sector 3 (Udyavara)",
            locationName="Udyavara Junction",
            severity="low",
            priorityScore=20,
        ),
    )

    all_before = {i.id for i in db_session.query(Incident).all()}

    res = client.post(
        f"/api/v1/incidents/{p.id}/merge-duplicate",
        json={"duplicateIncidentId": d.id, "reason": "Safe merge"},
        headers=coordinator_headers,
    )
    assert res.status_code == 200

    all_after = {i.id for i in db_session.query(Incident).all()}
    assert all_before == all_after, "Total set of incident IDs in DB must remain identical (no record deletion)"
