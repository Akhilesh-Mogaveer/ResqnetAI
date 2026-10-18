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


def test_rqn_0444_rqn_0445_exact_scenario(client):
    """
    Reproduce exact observed scenario:
    - RQN-0444 and RQN-0445 created as duplicate candidates with 79% match
    - Stable suggestion IDs and explicit primary/candidate relationships
    - Coordinator selects and confirms primary record
    - Merge persisted in SQLite with provenance preserved
    - Audit log written with coordinator, timestamp, selected primary, merged duplicate, reason
    - After merge, neither returns active duplicate suggestions
    """
    # 1. Create RQN-0444
    r1 = client.post("/api/v1/incidents", json={
        "id": "RQN-0444-TEST",
        "title": "flash flood",
        "type": "Emergency Incident",
        "sector": "East Harbor District",
        "locationName": "East Harbor District Zone",
        "coordinates": [37.7715, -122.4062],
        "severity": "high",
        "priorityScore": 75,
        "report_text": "flash flood",
        "humaid_category": "caution_and_advice",
        "run_nlp_classification": False
    })
    assert r1.status_code == 201

    # 2. Create RQN-0445 (nearby in same sector with identical narrative)
    r2 = client.post("/api/v1/incidents", json={
        "id": "RQN-0445-TEST",
        "title": "flash flood",
        "type": "caution and advice",
        "sector": "East Harbor District",
        "locationName": "East Harbor District Zone",
        "coordinates": [37.7884, -122.4237],
        "severity": "high",
        "priorityScore": 75,
        "report_text": "flash flood",
        "humaid_category": "caution_and_advice",
        "run_nlp_classification": False
    })
    assert r2.status_code == 201

    # 3. Query duplicates for RQN-0444-TEST: verify exact candidate and score
    dup_resp_444 = client.get("/api/v1/incidents/RQN-0444-TEST/duplicates")
    assert dup_resp_444.status_code == 200
    suggestions_444 = dup_resp_444.json()
    cand_445 = next((s for s in suggestions_444 if s["candidate_incident_id"] == "RQN-0445-TEST"), None)
    assert cand_445 is not None
    assert cand_445["overall_score"] == 79
    assert cand_445["id"] == "dup-RQN-0444-TEST-RQN-0445-TEST"
    assert cand_445["primary_incident_id"] == "RQN-0444-TEST"
    assert cand_445["candidate_incident_id"] == "RQN-0445-TEST"
    assert cand_445["review_status"] == "pending"

    # Query duplicates for RQN-0445-TEST: verify candidate RQN-0444-TEST
    dup_resp_445 = client.get("/api/v1/incidents/RQN-0445-TEST/duplicates")
    assert dup_resp_445.status_code == 200
    suggestions_445 = dup_resp_445.json()
    cand_444 = next((s for s in suggestions_445 if s["candidate_incident_id"] == "RQN-0444-TEST"), None)
    assert cand_444 is not None
    assert cand_444["overall_score"] == 79
    assert cand_444["id"] == "dup-RQN-0445-TEST-RQN-0444-TEST"

    # 4. Review & Merge: Coordinator explicitly confirms RQN-0445-TEST as Primary record
    # Operates on exact displayed suggestion, merges RQN-0444-TEST into RQN-0445-TEST
    merge_resp = client.post("/api/v1/incidents/RQN-0444-TEST/merge-duplicate", json={
        "duplicateIncidentId": "RQN-0444-TEST",
        "primaryIncidentId": "RQN-0445-TEST",
        "operator": "Coordinator Jordan Davis",
        "reason": "Corroborated distress report merged into primary incident after human review.",
        "updateCorroboration": True
    })
    assert merge_resp.status_code == 200
    merge_data = merge_resp.json()
    assert merge_data["primary_incident_id"] == "RQN-0445-TEST"
    assert merge_data["merged_incident_id"] == "RQN-0444-TEST"
    assert merge_data["review_status"] == "merged"
    assert merge_data["duplicate_count"] == 1
    assert "Corroborating Report Merged (RQN-0444-TEST)" in str(merge_data["notes"])

    # 5. Persisted state checks in SQLite
    # Duplicate record:
    dup_check = client.get("/api/v1/incidents/RQN-0444-TEST").json()
    assert dup_check["is_duplicate"] is True
    assert dup_check["duplicate_of_id"] == "RQN-0445-TEST"
    assert dup_check["responseStatus"] == "merged_duplicate"
    # Verification status is kept separate (not marked verified/resolved by merge)
    assert dup_check["verificationStatus"] == "unverified"
    # Original report text preserved
    assert dup_check["original_report_text"] == "flash flood"

    # Primary record:
    primary_check = client.get("/api/v1/incidents/RQN-0445-TEST").json()
    assert primary_check["is_duplicate"] is False
    assert primary_check["duplicate_count"] == 1
    assert primary_check["verificationStatus"] == "unverified"
    assert primary_check["responseStatus"] == "triage"

    # 6. Audit Trail verification for accountability
    audit_resp = client.get("/api/v1/audit-log?incident_id=RQN-0445-TEST")
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    m_log = next((l for l in logs if l["actionType"] == "DUPLICATE_REPORT_MERGED"), None)
    assert m_log is not None
    assert m_log["operator"] == "Coordinator Jordan Davis"
    assert "RQN-0444-TEST" in m_log["reason"]
    assert "RQN-0445-TEST" in m_log["reason"]

    # 7. No repeated active suggestions after merge
    post_dup_444 = client.get("/api/v1/incidents/RQN-0444-TEST/duplicates").json()
    assert len(post_dup_444) == 0  # Merged duplicate has no active suggestions
    post_dup_445 = client.get("/api/v1/incidents/RQN-0445-TEST/duplicates").json()
    assert not any(s["candidate_incident_id"] == "RQN-0444-TEST" for s in post_dup_445)


def test_merge_and_dismiss_produce_different_persisted_states(client):
    """
    Confirm merge and dismiss produce fundamentally different persisted states:
    - Dismiss leaves both incidents separate, active, is_duplicate=False, and suppresses suggestion
    - Merge marks duplicate with is_duplicate=True, duplicate_of_id, responseStatus=merged_duplicate
    """
    # Create Pair A (for Dismiss)
    client.post("/api/v1/incidents", json={
        "id": "RQN-DISM-P", "title": "Fire Incident Alpha", "sector": "Sector 1",
        "coordinates": [37.77, -122.41], "report_text": "Building fire alarm triggered",
        "run_nlp_classification": False
    })
    client.post("/api/v1/incidents", json={
        "id": "RQN-DISM-C", "title": "Fire Incident Beta", "sector": "Sector 1",
        "coordinates": [37.771, -122.411], "report_text": "Building fire alarm sounding",
        "run_nlp_classification": False
    })

    # Create Pair B (for Merge)
    client.post("/api/v1/incidents", json={
        "id": "RQN-MERG-P", "title": "Gas Leak Alpha", "sector": "Sector 2",
        "coordinates": [37.78, -122.42], "report_text": "Gas line rupture smell",
        "run_nlp_classification": False
    })
    client.post("/api/v1/incidents", json={
        "id": "RQN-MERG-C", "title": "Gas Leak Beta", "sector": "Sector 2",
        "coordinates": [37.781, -122.421], "report_text": "Gas line rupture smell",
        "run_nlp_classification": False
    })

    # Dismiss Pair A
    dismiss_res = client.post("/api/v1/incidents/RQN-DISM-P/dismiss-duplicate", json={
        "duplicateIncidentId": "RQN-DISM-C",
        "operator": "Coordinator Davis",
        "reason": "Confirmed separate buildings on different blocks."
    })
    assert dismiss_res.status_code == 200
    assert dismiss_res.json()["review_status"] == "dismissed"

    # Merge Pair B
    merge_res = client.post("/api/v1/incidents/RQN-MERG-P/merge-duplicate", json={
        "duplicateIncidentId": "RQN-MERG-C",
        "primaryIncidentId": "RQN-MERG-P",
        "operator": "Coordinator Davis",
        "reason": "Confirmed same gas leak event."
    })
    assert merge_res.status_code == 200
    assert merge_res.json()["review_status"] == "merged"

    # Verify Dismissed Pair A persisted state in SQLite
    dism_p = client.get("/api/v1/incidents/RQN-DISM-P").json()
    dism_c = client.get("/api/v1/incidents/RQN-DISM-C").json()
    assert dism_p["is_duplicate"] is False
    assert dism_c["is_duplicate"] is False
    assert dism_p["responseStatus"] != "merged_duplicate"
    assert dism_c["responseStatus"] != "merged_duplicate"
    assert dism_p["duplicate_of_id"] is None
    assert dism_c["duplicate_of_id"] is None
    assert "RQN-DISM-C" in dism_p["dismissed_duplicates"]
    assert "RQN-DISM-P" in dism_c["dismissed_duplicates"]

    # Verify Merged Pair B persisted state in SQLite
    merg_p = client.get("/api/v1/incidents/RQN-MERG-P").json()
    merg_c = client.get("/api/v1/incidents/RQN-MERG-C").json()
    assert merg_p["is_duplicate"] is False
    assert merg_c["is_duplicate"] is True
    assert merg_c["duplicate_of_id"] == "RQN-MERG-P"
    assert merg_c["responseStatus"] == "merged_duplicate"
    assert merg_p["duplicate_count"] == 1

    # Neither action marked incidents verified or resolved
    assert dism_p["verificationStatus"] == "unverified"
    assert dism_c["verificationStatus"] == "unverified"
    assert merg_p["verificationStatus"] == "unverified"
    assert merg_c["verificationStatus"] == "unverified"

    # Both created appropriate distinct audit entries
    dism_aud = client.get("/api/v1/audit-log?incident_id=RQN-DISM-P").json()
    assert any(a["actionType"] == "DUPLICATE_SUGGESTION_DISMISSED" for a in dism_aud)

    merg_aud = client.get("/api/v1/audit-log?incident_id=RQN-MERG-P").json()
    assert any(a["actionType"] == "DUPLICATE_REPORT_MERGED" for a in merg_aud)

