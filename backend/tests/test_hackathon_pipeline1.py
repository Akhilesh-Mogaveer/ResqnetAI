"""
RESQNET AI — Hackathon Pipeline Option 1 Comprehensive Test Suite

Tests:
1. Messy report text structuring with missing and uncertain fields.
2. Explicit coordinates and coordinate validation (range checking and rejection).
3. Geocoding candidate search: one candidate, multiple candidates (ambiguous), no result, provider failure, caching.
4. Officer confirmation and correction of a location (PATCH /incidents/{id}/location).
5. Creating a report and persisting coordinates cleanly.
6. Unresolved locations not receiving fake map coordinates (preserved as None).
7. Duplicate merges updating duplicate state (is_duplicate=True, responseStatus='merged_duplicate').
8. Model inference confidence strictly kept distinct from verification status.
"""

from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas.incident import IncidentCreate
from backend.app.services.geocoding_service import (
    clear_geocoding_cache,
    search_location_candidates,
    validate_coordinates,
)
from backend.app.services.report_structuring_service import (
    extract_structured_incident_report,
)

# Using the `client` fixture from conftest.py so each test gets an isolated in-memory DB


# ============================================================================
# 1. Messy Report Text Structuring Tests
# ============================================================================

def test_structure_messy_report_with_trapped_casualties_and_location():
    """Extract structured fields from distress message with casualties, location, and urgency."""
    raw_text = (
        "HELP!! Flooding at Wayanad relief camp near Meppadi, 8 people trapped inside "
        "submerged school hall, water at window level since morning! Send boats urgently!"
    )
    result = extract_structured_incident_report(raw_text)

    # Preserves original text untouched
    assert result.original_text == raw_text
    assert "Wayanad" in result.cleaned_text

    # Model inferred hazard category
    assert result.hazard_category is not None
    assert result.hazard_category_inferred is True
    assert result.hazard_category_confidence is not None

    # Casualties extracted
    assert result.casualty_numeric_count == 8
    assert "8 people" in result.casualty_estimate_text.lower()
    assert result.casualty_inferred is True

    # Location clues
    assert any("Wayanad" in c for c in result.location_clues)
    assert result.suggested_location_name is not None

    # Urgency indicators
    assert "trapped" in result.urgent_indicators
    assert result.urgency_level == "critical"

    # Separation of reported facts vs inferred
    assert "casualty_statement" in result.reported_facts
    assert "hazard_category" in result.inferred_fields
    assert "exact_gps_coordinates" in result.uncertain_or_missing_fields


def test_structure_messy_report_with_missing_casualties_and_location():
    """Uncertain or missing fields must be treated as None rather than invented."""
    raw_text = "Minor water ponding observed on service road. Traffic moving slowly."
    result = extract_structured_incident_report(raw_text)

    # Casualties must NOT be invented
    assert result.casualty_numeric_count is None
    assert result.casualty_estimate_text is None
    assert "casualty_or_people_affected" in result.uncertain_or_missing_fields

    # No life-threatening urgency
    assert result.urgency_level in ("low", "moderate")

    # Original text preserved
    assert result.original_text == raw_text


def test_structure_messy_report_empty_text():
    """Empty or whitespace text handled gracefully with missing fields listed."""
    result = extract_structured_incident_report("   ")
    assert result.nlp_status == "EMPTY_TEXT"
    assert "hazard_category" in result.uncertain_or_missing_fields
    assert "casualty_or_people_affected" in result.uncertain_or_missing_fields


def test_structure_report_api_endpoint(client):
    """Test POST /api/v1/incidents/structure-report endpoint."""
    resp = client.post(
        "/api/v1/incidents/structure-report",
        json={"text": "Heavy landslide reported at Joshimath near main temple, 12 workers trapped under debris 15 mins ago."}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["casualty_numeric_count"] == 12
    assert "Joshimath" in data["location_clues"]
    assert "trapped" in data["urgent_indicators"]
    assert data["urgency_level"] == "critical"
    assert data["hazard_category_inferred"] is True


# ============================================================================
# 2. Coordinate Validation Tests
# ============================================================================

def test_validate_coordinates_valid_ranges():
    """Valid coordinates must pass validation."""
    valid, err = validate_coordinates([19.0760, 72.8777])
    assert valid is True
    assert err is None

    # Edge of valid ranges
    assert validate_coordinates([90.0, 180.0])[0] is True
    assert validate_coordinates([-90.0, -180.0])[0] is True
    assert validate_coordinates([0.0, 0.0])[0] is True


def test_validate_coordinates_invalid_bounds():
    """Out-of-bound latitude and longitude must be rejected."""
    # Latitude > 90
    valid, err = validate_coordinates([91.0, 72.0])
    assert valid is False
    assert "Latitude" in err

    # Latitude < -90
    valid, err = validate_coordinates([-95.5, 72.0])
    assert valid is False
    assert "Latitude" in err

    # Longitude > 180
    valid, err = validate_coordinates([15.0, 185.0])
    assert valid is False
    assert "Longitude" in err

    # Longitude < -180
    valid, err = validate_coordinates([15.0, -185.0])
    assert valid is False
    assert "Longitude" in err

    # Non-numeric
    valid, err = validate_coordinates(["invalid", "coords"])
    assert valid is False


def test_create_incident_rejects_invalid_coordinates(client):
    """Creating an incident with invalid GPS coordinates must return 422 Unprocessable Entity."""
    resp = client.post(
        "/api/v1/incidents",
        json={
            "title": "Invalid Coordinate Test",
            "coordinates": [999.0, 72.8777],
            "locationName": "Out of World",
            "report_text": "Flooding",
            "run_nlp_classification": False,
        }
    )
    assert resp.status_code == 422
    assert "coordinate" in resp.json()["detail"].lower()


# ============================================================================
# 3. Geocoding Candidate Search Tests (Nominatim Compliance & Caching)
# ============================================================================

def test_geocoding_candidate_search_single_gazetteer():
    """Exact Indian gazetteer match returns confident candidate without network call."""
    clear_geocoding_cache()
    res = search_location_candidates("Wayanad", limit=5, allow_online=False)
    assert res["total_candidates"] >= 1
    top = res["candidates"][0]
    assert "Wayanad" in top["display_name"]
    assert top["latitude"] == pytest.approx(11.6854, 0.001)
    assert top["longitude"] == pytest.approx(76.1320, 0.001)
    assert top["provider"] == "offline_indian_gazetteer"


def test_geocoding_candidate_search_caching():
    """Second search with identical normalized query must hit in-memory cache."""
    clear_geocoding_cache()
    res1 = search_location_candidates("Shimla Hill Station", limit=5, allow_online=False)
    assert res1["cached"] is False

    res2 = search_location_candidates("Shimla Hill Station", limit=5, allow_online=False)
    assert res2["cached"] is True
    assert res2["total_candidates"] == res1["total_candidates"]


def test_geocoding_provider_failure_graceful_degradation():
    """Simulated network timeout/failure from Nominatim must not crash search service."""
    with patch("urllib.request.urlopen", side_effect=TimeoutError("Nominatim timed out")):
        res = search_location_candidates("Unknown Faraway Locality XYZ", limit=5, allow_online=True)
        assert res["candidates"] == []
        assert "NETWORK_TIMEOUT" in res["provider_status"]


def test_geocoding_api_search_endpoint(client):
    """Test GET /api/v1/geocoding/search endpoint."""
    resp = client.get("/api/v1/geocoding/search?query=Joshimath&limit=3")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_candidates"] >= 1
    assert data["candidates"][0]["latitude"] == pytest.approx(30.5574, 0.001)
    assert "attribution" in data


# ============================================================================
# 4. Officer Location Confirmation & Correction Tests
# ============================================================================

def test_officer_confirm_and_correct_location(client):
    """Officer confirms candidate or enters corrected location via PATCH /incidents/{id}/location."""
    # 1. Create incident without coordinates
    create_resp = client.post(
        "/api/v1/incidents",
        json={
            "title": "Unmapped Sector Flood",
            "locationName": "Unmapped Crossroad 12",
            "sector": "Lower Basin",
            "report_text": "Water ponding at road intersection.",
            "coordinates": None,
            "run_nlp_classification": False,
        }
    )
    assert create_resp.status_code == 201
    inc_data = create_resp.json()
    inc_id = inc_data["id"]
    assert inc_data["coordinates"] is None
    assert inc_data["location_resolution_status"] == "unknown"

    # 2. Officer confirms location coordinates
    patch_resp = client.patch(
        f"/api/v1/incidents/{inc_id}/location",
        json={
            "coordinates": [13.3409, 74.7421],  # Udupi coordinates
            "locationName": "Udupi Coastal Crossroad 12",
            "confirmationStatus": "officer_confirmed",
            "operator": "Coordinator Davis",
            "reason": "Officer verified location on satellite reconnaissance map.",
        }
    )
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert updated["coordinates"] == [13.3409, 74.7421]
    assert updated["location_resolution_status"] == "candidate_selected"
    assert "officer_confirmed" in updated["location_source"]
    assert updated["locationConfidence"] >= 80

    # 3. Verify audit log was recorded
    audit_resp = client.get(f"/api/v1/incidents/{inc_id}/audit-log")
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert any(log["actionType"] == "LOCATION_CONFIRMED" for log in logs)


def test_officer_location_update_rejects_invalid_coords(client):
    """Updating incident location with invalid coordinates returns 422 error."""
    # Create an incident
    create_resp = client.post(
        "/api/v1/incidents",
        json={
            "title": "Test Incident For Coord Check",
            "locationName": "Test Spot",
            "report_text": "Report text",
            "run_nlp_classification": False,
        }
    )
    inc_id = create_resp.json()["id"]

    patch_resp = client.patch(
        f"/api/v1/incidents/{inc_id}/location",
        json={
            "coordinates": [150.0, 74.7421],  # Invalid lat > 90
            "operator": "Coordinator Davis",
            "reason": "Test",
        }
    )
    assert patch_resp.status_code == 422


# ============================================================================
# 5. Persisting Coordinates and Unresolved Coordinates Non-Plotting Tests
# ============================================================================

def test_incident_creation_persists_explicit_coordinates(client):
    """Explicitly provided coordinates persist to database and return in API response."""
    resp = client.post(
        "/api/v1/incidents",
        json={
            "title": "Explicit GPS Incident",
            "locationName": "Custom Station 4",
            "coordinates": [12.9716, 77.5946],  # Bengaluru coordinates
            "report_text": "Transformer issue reported.",
            "run_nlp_classification": False,
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["coordinates"] == [12.9716, 77.5946]
    assert data["location_resolution_status"] in ("user_manual", "resolved_verified")
    assert data["is_synthetic_location"] is False

    # Fetch incident back to verify persistence
    get_resp = client.get(f"/api/v1/incidents/{data['id']}")
    assert get_resp.status_code == 200
    assert get_resp.json()["coordinates"] == [12.9716, 77.5946]


def test_unresolved_locations_do_not_receive_fake_coordinates(client):
    """When a location cannot be resolved, coordinates stay None; never assigned fake demo coords."""
    resp = client.post(
        "/api/v1/incidents",
        json={
            "title": "Unresolvable Location Incident",
            "locationName": "Unknown Secret Sector 999",
            "report_text": "Unknown location incident without GPS.",
            "coordinates": None,
            "run_nlp_classification": False,
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["coordinates"] is None
    assert data["is_synthetic_location"] is False
    assert data["location_resolution_status"] == "unknown"


# ============================================================================
# 6. Duplicate Merges Do Not Double-Count on Map
# ============================================================================

def test_duplicate_merge_marks_duplicate_status_for_map_filtering(client):
    """Merged duplicates receive responseStatus='merged_duplicate' and is_duplicate=True."""
    # 1. Create primary incident
    p_resp = client.post(
        "/api/v1/incidents",
        json={
            "title": "Primary Gas Leak",
            "locationName": "Mumbai",
            "sector": "Industrial",
            "report_text": "Gas leak detected from valve.",
            "run_nlp_classification": False,
        }
    )
    p_id = p_resp.json()["id"]

    # 2. Create duplicate incident
    d_resp = client.post(
        "/api/v1/incidents",
        json={
            "title": "Secondary Gas Leak Call",
            "locationName": "Mumbai",
            "sector": "Industrial",
            "report_text": "Smelling strong gas fumes near same valve.",
            "run_nlp_classification": False,
        }
    )
    d_id = d_resp.json()["id"]

    # 3. Merge duplicate into primary
    merge_resp = client.post(
        f"/api/v1/incidents/{p_id}/merge-duplicate",
        json={
            "duplicateIncidentId": d_id,
            "operator": "Lead Coordinator",
            "reason": "Corroborating second call for same valve issue."
        }
    )
    assert merge_resp.status_code == 200

    # 4. Fetch duplicate incident
    dup_fetch = client.get(f"/api/v1/incidents/{d_id}").json()
    assert dup_fetch["is_duplicate"] is True
    assert dup_fetch["duplicate_of_id"] == p_id
    assert dup_fetch["responseStatus"] == "merged_duplicate"


# ============================================================================
# 7. Report Source Provenance & Manual Override Intake Tests
# ============================================================================

def test_report_source_channels_and_provenance(client):
    """Each source channel type and reference ID is recorded in incident provenance."""
    sources = [
        ("Officer/Phone Call", "CAD-9921"),
        ("SMS", "TEL-8812"),
        ("Field Responder", "UNIT-BRAVO-3"),
        ("Sensor", "GAUGE-FL-02"),
        ("Social Media", "POST-881920"),
        ("Other", "HOTLINE-CITIZEN"),
    ]

    for src_type, src_ref in sources:
        resp = client.post(
            "/api/v1/incidents",
            json={
                "title": f"Incident via {src_type}",
                "report_source": src_type,
                "source_reference": src_ref,
                "report_text": f"Distress report received via {src_type}.",
                "run_nlp_classification": False,
            }
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["report_source"] == src_type
        assert data["source_reference"] == src_ref
        assert src_type in data["sourceSummary"]
        assert src_ref in data["sourceSummary"]
        assert data["verificationStatus"] == "unverified"


def test_authorized_priority_override_at_intake_records_audit_trail(client):
    """Manual priority override at intake sets is_priority_overridden and persists audit trail with justification."""
    resp = client.post(
        "/api/v1/incidents",
        json={
            "title": "Hospital Flooding Override",
            "coordinates": [19.0760, 72.8777],
            "locationName": "City General Hospital",
            "report_text": "Generator room threatened by flood.",
            "severity": "critical",
            "priorityScore": 99,
            "is_priority_overridden": True,
            "override_operator": "Lead Coordinator Jordan Davis",
            "override_reason": "Direct telephonic confirmation of life-support backup failure risk.",
            "run_nlp_classification": False,
        },
        headers={"Authorization": "Bearer dev-coordinator-token"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["priorityScore"] == 99
    assert data["is_priority_overridden"] is True
    assert data["verificationStatus"] == "unverified"

    # Verify audit logs
    audit_resp = client.get(f"/api/v1/incidents/{data['id']}/audit-log")
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    prio_logs = [l for l in logs if l["actionType"] == "PRIORITY_OVERRIDE"]
    assert len(prio_logs) >= 1
    assert prio_logs[0]["operator"] == "Lead Coordinator Jordan Davis"
    assert "Direct telephonic confirmation" in prio_logs[0]["reason"]
    assert prio_logs[0]["newValue"] == "99"

