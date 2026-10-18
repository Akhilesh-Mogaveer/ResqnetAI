"""
Tests for Geocoding Service, Coordinate Preservation, and Canonical DB Path Resolution.
"""

import os
from pathlib import Path
from backend.app.services.geocoding_service import (
    resolve_incident_coordinates,
    match_indian_place,
    is_synthetic_sf_coordinate,
    INDIAN_GAZETTEER,
)
from backend.app.core.config import Settings


def test_match_known_indian_places():
    """Known Indian places must resolve with exact lat/long."""
    # Direct name
    result = match_indian_place("Mumbai", "Western Zone")
    assert result is not None
    coords, matched, state = result
    assert coords == [19.0760, 72.8777]
    assert matched == "Mumbai"
    assert state == "Maharashtra"

    # Disaster hotspots
    result = match_indian_place("Wayanad Landslide Area", "South Zone")
    assert result is not None
    coords, matched, state = result
    assert coords == [11.6854, 76.1320]
    assert matched == "Wayanad"

    result = match_indian_place("Joshimath Subsidence Zone")
    assert result is not None
    coords, matched, state = result
    assert coords == [30.5574, 79.5663]
    assert matched == "Joshimath"

    # Capital / Landmark (Dispur alias of Guwahati)
    result = match_indian_place("Dispur Relief Center")
    assert result is not None
    coords, matched, state = result
    assert coords == [26.1445, 91.7362]
    assert matched == "Guwahati"
    assert state == "Assam"


def test_match_unknown_location_returns_none():
    """Unrecognized places must return None and NOT fake San Francisco coords."""
    result = match_indian_place("Unknown Mystery Island X", "Unknown Sector")
    assert result is None


def test_resolve_incident_coordinates_geocodes_indian_place():
    """When an Indian place is named, geocoding matches cleanly."""
    coords, is_synth, source = resolve_incident_coordinates(
        supplied_coords=None,
        location_name="Kedarnath Valley",
        sector="Himalayan Sector",
    )
    assert coords == [30.7352, 79.0669]
    assert is_synth is False
    assert "geocoded_indian_gazetteer" in source


def test_resolve_incident_coordinates_preserves_user_gps():
    """User-supplied GPS coordinates outside Indian place matching must always be preserved."""
    user_coords = [10.5276, 76.2144]  # Thrissur
    coords, is_synth, source = resolve_incident_coordinates(
        supplied_coords=user_coords,
        location_name="Field Team Alpha Pos",
        sector="Custom Sector",
    )
    assert coords == user_coords
    assert is_synth is False
    assert source == "user_supplied"


def test_resolve_incident_coordinates_leaves_unknown_when_unmatched():
    """If location name cannot be matched and no user coordinates, coordinates remain None."""
    coords, is_synth, source = resolve_incident_coordinates(
        supplied_coords=None,
        location_name="Warehouse Section 99",
        sector="Sector Z",
    )
    assert coords is None
    assert is_synth is False
    assert source == "unmatched_unknown"


def test_detects_synthetic_sf_coordinates():
    """Coordinates falling inside San Francisco demo box must be flagged synthetic."""
    sf_coords = [37.779, -122.415]
    assert is_synthetic_sf_coordinate(sf_coords) is True

    coords, is_synth, source = resolve_incident_coordinates(
        supplied_coords=sf_coords,
        location_name="Market St",
        sector="Downtown",
    )
    assert is_synth is True
    assert source == "synthetic_demo_sf_simulation"


def test_canonical_sqlite_path_resolution():
    """Settings must resolve relative SQLite URLs to absolute canonical paths."""
    cfg = Settings(DATABASE_URL="sqlite:///./resqnet.db")
    resolved = cfg.DATABASE_URL
    assert resolved.startswith("sqlite:///")
    db_path = resolved.replace("sqlite:///", "")
    assert os.path.isabs(db_path)
    assert Path(db_path).name == "resqnet.db"
    assert "backend" in Path(db_path).parts
