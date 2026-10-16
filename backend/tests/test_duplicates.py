"""
Tests for Explainable Duplicate Incident Detection & Human-in-the-Loop Merge Workflow
"""

import pytest
from backend.app.services.duplicate_service import (
    haversine_distance_km,
    compute_text_similarity,
    compute_time_difference_minutes,
    find_duplicate_suggestions,
    merge_duplicate_incident,
    dismiss_duplicate_suggestion,
)
from backend.app.models.incident import Incident, AuditLog


def test_haversine_distance_calculation():
    """Verify spatial distance accurately calculates known coordinate separations."""
    # Pier 14 (37.7845, -122.3965) to Bayview Underpass (37.7985, -122.4120) is ~2.08 km
    dist = haversine_distance_km(37.7845, -122.3965, 37.7985, -122.4120)
    assert 1.8 < dist < 2.4

    # Identical coordinates should be 0.0 km
    assert haversine_distance_km(37.7749, -122.4194, 37.7749, -122.4194) == 0.0


def test_compute_text_similarity_and_keywords():
    """Verify lexical similarity identifies emergency overlap and extracts shared terms."""
    t1 = "Building partially collapsed at Pier 14 warehouse after heavy tremor. Workers trapped under concrete beam."
    t2 = "Structural warehouse collapse reported near Pier 14. Multiple workers trapped under structural debris."

    sim, keywords = compute_text_similarity(t1, t2)
    assert sim >= 0.40
    assert any(k in ["pier", "warehouse", "trapped", "workers", "collapse", "structural"] for k in keywords)


def test_compute_time_difference_minutes():
    """Verify temporal difference in minutes is computed accurately."""
    ts1 = "2026-10-15T20:00:00Z"
    ts2 = "2026-10-15T20:25:00Z"
    diff = compute_time_difference_minutes(ts1, ts2)
    assert diff == 25.0


def test_duplicate_suggestions_api(client):
    """
    Create a primary incident and a nearby corroborating incident with overlapping text.
    Verify that the duplicate suggestions endpoint identifies it with explainable reasons.
    """
    # 1. Primary Incident
    p_resp = client.post("/api/v1/incidents", json={
        "id": "RQN-TEST-P1",
        "title": "Industrial Warehouse Chemical Leak",
        "type": "Hazardous Materials",
        "sector": "North Industrial",
        "locationName": "Chemical Storage Tank 4",
        "coordinates": [37.7920, -122.3990],
        "severity": "critical",
        "priorityScore": 95,
        "report_text": "Anhydrous ammonia vapor venting from valve 4. Shift workers evacuating downwind.",
        "run_nlp_classification": False
    })
    assert p_resp.status_code == 201

    # 2. Candidate Duplicate (reported 120m away, 8 minutes later, same chemical and leak phrasing)
    c_resp = client.post("/api/v1/incidents", json={
        "id": "RQN-TEST-D1",
        "title": "Toxic Gas Cloud Venting at Tank 4",
        "type": "Hazardous Materials",
        "sector": "North Industrial",
        "locationName": "Storage Yard North",
        "coordinates": [37.7928, -122.3995],
        "severity": "critical",
        "priorityScore": 92,
        "report_text": "Ammonia vapor cloud detected near valve 4 in north industrial yard. Workers fleeing area.",
        "run_nlp_classification": False
    })
    assert c_resp.status_code == 201

    # 3. Request duplicate candidates for Primary
    dup_resp = client.get("/api/v1/incidents/RQN-TEST-P1/duplicates")
    assert dup_resp.status_code == 200
    suggestions = dup_resp.json()

    assert len(suggestions) >= 1
    top_cand = next((s for s in suggestions if s["candidate_id"] == "RQN-TEST-D1"), None)
    assert top_cand is not None

    # Check Explainability fields
    assert top_cand["overall_score"] >= 65
    assert top_cand["distance_km"] < 0.3
    assert top_cand["text_similarity"] > 0.35
    assert len(top_cand["reasons"]) >= 2
    assert any("proximity" in r.lower() or "meters" in r.lower() or "sector" in r.lower() for r in top_cand["reasons"])


def test_human_merge_duplicate_workflow(client):
    """
    Verify human coordinator merge authorization workflow:
    - Duplicate marked as merged
    - Corroboration added to primary notes
    - Primary reliability safely incremented
    - Audit trail entry written
    """
    # Setup test pair
    client.post("/api/v1/incidents", json={
        "id": "RQN-TEST-P2",
        "title": "Substation Fire Outbreak",
        "type": "Fire",
        "sector": "West Market",
        "locationName": "Substation 7",
        "coordinates": [37.7680, -122.4220],
        "severity": "high",
        "priorityScore": 82,
        "reportReliability": 75,
        "report_text": "Transformer oil on fire at Substation 7.",
        "run_nlp_classification": False
    })

    client.post("/api/v1/incidents", json={
        "id": "RQN-TEST-D2",
        "title": "Smoke Plume at 14th St Substation",
        "type": "Fire",
        "sector": "West Market",
        "locationName": "14th and Market",
        "coordinates": [37.7684, -122.4225],
        "severity": "high",
        "priorityScore": 80,
        "report_text": "Heavy black smoke rising from electrical transformer.",
        "run_nlp_classification": False
    })

    # Merge Authorization Request
    merge_resp = client.post("/api/v1/incidents/RQN-TEST-P2/merge-duplicate", json={
        "duplicateIncidentId": "RQN-TEST-D2",
        "operator": "Coordinator Jordan Davis",
        "reason": "Confirmed independent 911 call reporting same transformer fire.",
        "updateCorroboration": True
    })
    assert merge_resp.status_code == 200
    merged_primary = merge_resp.json()

    assert merged_primary["duplicate_count"] == 1
    assert merged_primary["reportReliability"] == 80  # 75 + 5
    assert any("Corroborating Report Merged (RQN-TEST-D2)" in n["text"] for n in merged_primary["notes"])

    # Verify duplicate incident state in DB
    dup_resp = client.get("/api/v1/incidents/RQN-TEST-D2")
    assert dup_resp.status_code == 200
    dup_data = dup_resp.json()
    assert dup_data["is_duplicate"] is True
    assert dup_data["duplicate_of_id"] == "RQN-TEST-P2"
    assert dup_data["responseStatus"] == "merged_duplicate"

    # Verify Audit Log
    audit_resp = client.get("/api/v1/audit-log?incident_id=RQN-TEST-P2")
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    merge_log = next((l for l in logs if l["actionType"] == "DUPLICATE_REPORT_MERGED"), None)
    assert merge_log is not None
    assert merge_log["operator"] == "Coordinator Jordan Davis"
    assert "Confirmed independent 911 call" in merge_log["reason"]


def test_dismiss_duplicate_suggestion(client):
    """
    Verify coordinator dismissal of duplicate suggestion:
    - Adds to dismissed_duplicates
    - Records audit trail
    - Subsequent calls do not suggest the dismissed candidate
    """
    client.post("/api/v1/incidents", json={
        "id": "RQN-TEST-P3",
        "title": "Flooded Senior Center Basement",
        "type": "Flood",
        "sector": "Marina",
        "locationName": "Marina Senior Living",
        "coordinates": [37.7720, -122.4410],
        "report_text": "Basement flooded with 2 feet water.",
        "run_nlp_classification": False
    })

    client.post("/api/v1/incidents", json={
        "id": "RQN-TEST-D3",
        "title": "Flooded Pharmacy Adjacent to Senior Center",
        "type": "Flood",
        "sector": "Marina",
        "locationName": "Marina Pharmacy",
        "coordinates": [37.7722, -122.4412],
        "report_text": "Ground floor water penetration in pharmacy shop.",
        "run_nlp_classification": False
    })

    # Dismiss duplicate suggestion
    dismiss_resp = client.post("/api/v1/incidents/RQN-TEST-P3/dismiss-duplicate", json={
        "duplicateIncidentId": "RQN-TEST-D3",
        "operator": "Coordinator Jordan Davis",
        "reason": "Distinct commercial pharmacy structure with separate electrical grid; requires distinct dispatch."
    })
    assert dismiss_resp.status_code == 200

    # Verify it is no longer suggested
    dup_check = client.get("/api/v1/incidents/RQN-TEST-P3/duplicates")
    suggestions = dup_check.json()
    assert not any(s["candidate_id"] == "RQN-TEST-D3" for s in suggestions)

    # Verify Audit Log entry
    audit_resp = client.get("/api/v1/audit-log?incident_id=RQN-TEST-P3")
    assert audit_resp.status_code == 200
    dismiss_log = next((l for l in audit_resp.json() if l["actionType"] == "DUPLICATE_SUGGESTION_DISMISSED"), None)
    assert dismiss_log is not None
    assert "Distinct commercial pharmacy" in dismiss_log["reason"]
