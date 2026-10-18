"""
RESQNET AI — Official India Meteorological and Hydrological Monitoring Tests

Tests the multi-source adapter architecture, NWDP/CWC CKAN telemetry parsing,
IMD credential verification and authentication headers, Open-Meteo bridge,
caching, coordinate sanity, and reviewable situational alert generation.
Guarantees alerts NEVER automatically verify emergency incidents.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, patch
import httpx
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.services.india_environmental_service import india_environmental_service
from backend.app.services.adapters.nwdp_cwc_adapter import (
    NwdpCwcAdapter,
    RESOURCE_RIVER_WATER_LEVEL,
    RESOURCE_RAINFALL,
    RESOURCE_RIVER_DISCHARGE,
)
from backend.app.services.adapters.imd_adapter import ImdAdapter

client = TestClient(app)

MOCK_NWDP_WATER_LEVEL_RECORDS = [
    {
        "_id": 1049,
        "Station": "Saraikela Rd. Bridge",
        "Agency": "CWC",
        "State": "Jharkhand",
        "District": "Saraikela-Kharsawan",
        "River": "Kharkai",
        "Basin": "Subernarekha",
        "Latitude": "22.7",
        "Longitude": "86.01",
        "Data Acquisition Time": "03-10-2025 18:00",
        "River Water Level Telemetry Hourly (meter)": "378.39",
    },
    {
        "_id": 1050,
        "Station": "Saraikela Rd. Bridge",
        "Agency": "CWC",
        "State": "Jharkhand",
        "District": "Saraikela-Kharsawan",
        "River": "Kharkai",
        "Basin": "Subernarekha",
        "Latitude": "22.7",
        "Longitude": "86.01",
        "Data Acquisition Time": "03-10-2025 17:00",
        "River Water Level Telemetry Hourly (meter)": "377.10",
    },
]

MOCK_NWDP_RAINFALL_RECORDS = [
    {
        "_id": 4081,
        "Station": "VONI",
        "Agency": "CWC",
        "State": "Andhra Pradesh",
        "District": "Srikakulam",
        "Basin": "Vamsadhara",
        "Latitude": "18.82",
        "Longitude": "83.74",
        "Data Acquisition Time": "28-07-2025 09:00",
        "Telemetry Hourly Rainfall (mm)": "45.0",
    }
]

MOCK_NWDP_DISCHARGE_RECORDS = [
    {
        "_id": 901,
        "Station": "Anandpur",
        "Agency": "CWC",
        "State": "Odisha",
        "District": "Kendujhar",
        "River": "Baitarani",
        "Basin": "Brahmani and Baitarni",
        "Latitude": "21.22",
        "Longitude": "86.12",
        "Data Acquisition Time": "15-08-2025 12:00",
        "Telemetry Hourly River Water Discharge (m3/sec)": "412.5",
    }
]


@pytest.fixture(autouse=True)
def clean_india_cache():
    """Ensure India environmental service cache is cleared before each test."""
    india_environmental_service.clear_cache()
    yield
    india_environmental_service.clear_cache()


# ==============================================================================
# 1. API Route Tests
# ==============================================================================

def test_get_india_stations_endpoint():
    """Test GET /api/v1/environmental-data/india-stations returns normalized records."""
    response = client.get("/api/v1/environmental-data/india-stations?limit=20")
    assert response.status_code == 200
    data = response.json()

    assert "provider" in data
    assert "retrieval_timestamp" in data
    assert "records" in data
    assert "sources_status" in data
    assert "alerts" in data
    assert "disclaimer" in data

    # Verify disclaimer explicitly states incidents are NOT auto-verified
    assert "NOT automatically verify civilian incident reports" in data["disclaimer"]


def test_get_india_stations_filtering_by_measurement_type():
    """Test filtering by measurement parameter returns only requested types."""
    response = client.get("/api/v1/environmental-data/india-stations?measurement_type=water_level&limit=10")
    assert response.status_code == 200
    data = response.json()

    for rec in data["records"]:
        assert rec["measurement_type"] == "water_level"


def test_get_india_stations_filtering_by_state():
    """Test filtering by Indian state."""
    response = client.get("/api/v1/environmental-data/india-stations?state=Jharkhand&limit=10")
    assert response.status_code == 200
    data = response.json()

    for rec in data["records"]:
        assert rec["state"] == "Jharkhand"


def test_get_environmental_alerts_endpoint():
    """Test GET /api/v1/environmental-data/alerts returns situational alerts."""
    response = client.get("/api/v1/environmental-data/alerts")
    assert response.status_code == 200
    alerts = response.json()
    assert isinstance(alerts, list)

    # CRITICAL: Every single alert must guarantee is_verified_incident is False
    for alert in alerts:
        assert alert["is_verified_incident"] is False
        assert alert["severity"] in ["info", "warning", "low", "moderate", "high", "critical"]
        assert "recorded_value" in alert
        assert "threshold" in alert


def test_get_sources_status_endpoint():
    """Test GET /api/v1/environmental-data/sources-status provides honest access auditing."""
    response = client.get("/api/v1/environmental-data/sources-status")
    assert response.status_code == 200
    sources = response.json()
    assert isinstance(sources, list)

    source_ids = [s["source_id"] for s in sources]
    assert "imd_api" in source_ids
    assert "nwdp_cwc_hydrology" in source_ids
    assert "open_meteo_models" in source_ids

    # Without IMD credentials configured, IMD must state credentials_required
    imd_status = next(s for s in sources if s["source_id"] == "imd_api")
    if not settings.IMD_API_KEY:
        assert imd_status["status"] == "credentials_required"
        assert "x-api-key" in imd_status["access_requirements"]


# ==============================================================================
# 2. NWDP / CWC Adapter Unit Tests
# ==============================================================================

def test_nwdp_cwc_adapter_parsing():
    """Test NWDP/CWC CKAN datastore payload normalization."""
    adapter = NwdpCwcAdapter()

    async def run_test():
        async def mock_get(url, params=None, timeout=None):
            from unittest.mock import MagicMock
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            res_id = params.get("resource_id") if params else None
            if res_id == RESOURCE_RIVER_WATER_LEVEL:
                mock_resp.json.return_value = {"success": True, "result": {"records": MOCK_NWDP_WATER_LEVEL_RECORDS}}
            elif res_id == RESOURCE_RAINFALL:
                mock_resp.json.return_value = {"success": True, "result": {"records": MOCK_NWDP_RAINFALL_RECORDS}}
            elif res_id == RESOURCE_RIVER_DISCHARGE:
                mock_resp.json.return_value = {"success": True, "result": {"records": MOCK_NWDP_DISCHARGE_RECORDS}}
            else:
                mock_resp.json.return_value = {"success": True, "result": {"records": []}}
            return mock_resp

        mock_client = AsyncMock()
        mock_client.get = mock_get

        records = await adapter.fetch_records(mock_client, limit=10)
        assert len(records) == 4

        # Verify River Level record
        wl_rec = next(r for r in records if r.measurement_type == "water_level")
        assert wl_rec.source == "NWDP/CWC"
        assert wl_rec.station_name == "Saraikela Rd. Bridge"
        assert wl_rec.value == 378.39
        assert wl_rec.unit == "meter"
        assert wl_rec.classification == "historical"
        assert wl_rec.freshness_status == "historical_archive"
        assert wl_rec.latitude == 22.7
        assert wl_rec.longitude == 86.01
        assert wl_rec.river == "Kharkai"
        assert wl_rec.basin == "Subernarekha"

        # Verify Rainfall record
        rf_rec = next(r for r in records if r.measurement_type == "rainfall")
        assert rf_rec.station_name == "VONI"
        assert rf_rec.value == 45.0
        assert rf_rec.unit == "mm"

        # Verify Discharge record
        dc_rec = next(r for r in records if r.measurement_type == "river_discharge")
        assert dc_rec.station_name == "Anandpur"
        assert dc_rec.value == 412.5
        assert dc_rec.unit == "m3/sec"

    asyncio.run(run_test())


def test_nwdp_cwc_adapter_timeout_resilience():
    """Test adapter gracefully handles upstream network timeouts."""
    adapter = NwdpCwcAdapter()

    async def run_test():
        mock_client = AsyncMock()
        mock_client.get.side_effect = httpx.TimeoutException("Connection to NWDP timed out")

        with patch.object(settings, "ENABLE_DEMO_SIMULATED_FEEDS", False):
            records = await adapter.fetch_records(mock_client, limit=5)
            assert records == []

    asyncio.run(run_test())


def test_coordinate_sanity_validation():
    """Test base adapter rejects invalid or out-of-bounds geographic coordinates."""
    adapter = NwdpCwcAdapter()

    # Valid Indian bounds
    assert adapter.sanitize_coordinate(13.3409) == 13.3409
    assert adapter.sanitize_coordinate("74.7421") == 74.7421

    # Invalid latitude/longitude bounds
    assert adapter.sanitize_coordinate(999.0) is None
    assert adapter.sanitize_coordinate(-190.0) is None
    assert adapter.sanitize_coordinate("invalid") is None
    assert adapter.sanitize_coordinate(None) is None


# ==============================================================================
# 3. IMD Adapter Unit Tests
# ==============================================================================

def test_imd_adapter_unconfigured_demo_mode():
    """Test IMD adapter without API key returns simulated baseline with visible tag."""
    adapter = ImdAdapter()

    async def run_test():
        mock_client = AsyncMock()
        with patch.object(settings, "IMD_API_KEY", None), \
             patch.object(settings, "IMD_AUTH_TOKEN", None), \
             patch.object(settings, "ENABLE_DEMO_SIMULATED_FEEDS", True):
            records = await adapter.fetch_records(mock_client)
            assert len(records) > 0
            for r in records:
                assert r.quality_status == "simulated"
                assert "DEMO / SIMULATED" in r.notes or "DEMO" in r.station_name
                assert r.classification == "model_estimate"
                assert r.freshness_status == "unavailable"
                assert r.observation_timestamp is None

    asyncio.run(run_test())


def test_imd_adapter_unconfigured_no_demo():
    """Test IMD adapter returns empty list when unconfigured and demo disabled."""
    adapter = ImdAdapter()

    async def run_test():
        mock_client = AsyncMock()
        with patch.object(settings, "IMD_API_KEY", None), \
             patch.object(settings, "IMD_AUTH_TOKEN", None), \
             patch.object(settings, "ENABLE_DEMO_SIMULATED_FEEDS", False):
            records = await adapter.fetch_records(mock_client)
            assert records == []

    asyncio.run(run_test())


def test_imd_adapter_authenticated_headers():
    """Test IMD adapter passes correct headers when credentials are configured."""
    from unittest.mock import MagicMock
    adapter = ImdAdapter()

    async def run_test():
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = []
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)

        with patch.object(settings, "IMD_API_KEY", "test-api-key"), \
             patch.object(settings, "IMD_AUTH_TOKEN", "test-jwt-token"):

            await adapter.fetch_records(mock_client)

            assert mock_client.get.called
            headers = mock_client.get.call_args[1].get("headers", {})
            assert headers.get("x-api-key") == "test-api-key"
            assert headers.get("Authorization") == "Bearer test-jwt-token"

    asyncio.run(run_test())


def test_alerts_safety_guards_reject_unqualified_records():
    """
    Test Requirement 6: Missing timestamps, invalid coordinates, simulated fallbacks,
    and historical archives (>24h) cannot trigger alerts as if they were verified physical observations.
    """
    from backend.app.schemas.india_environmental import NormalizedEnvironmentalRecord

    now_iso = "2026-10-18T18:00:00Z"

    # 1. Simulated record with high rainfall -> MUST NOT trigger alert
    simulated_rec = NormalizedEnvironmentalRecord(
        id="sim-1",
        source="IMD",
        source_type="official_meteorological_agency",
        station_name="Guwahati AWS [SIMULATED DEMO]",
        latitude=26.1,
        longitude=91.5,
        measurement_type="rainfall",
        value=65.0,
        unit="mm",
        observation_timestamp=None,
        fetch_timestamp=now_iso,
        classification="model_estimate",
        freshness_status="unavailable",
        quality_status="simulated",
        source_url="https://api.imd.gov.in/",
    )

    # 2. Historical archive from 2025 with high water level -> MUST NOT trigger alert
    historical_rec = NormalizedEnvironmentalRecord(
        id="hist-1",
        source="NWDP/CWC",
        source_type="official_hydrological_telemetry",
        station_name="Saraikela Bridge",
        latitude=22.7,
        longitude=86.0,
        measurement_type="water_level",
        value=390.0,
        unit="meter",
        observation_timestamp="21-07-2025 16:30",
        fetch_timestamp=now_iso,
        classification="historical",
        freshness_status="historical_archive",
        quality_status="provisional",
        source_url="https://nwdp.nwic.gov.in/",
    )

    # 3. Missing coordinates -> MUST NOT trigger alert
    no_coords_rec = NormalizedEnvironmentalRecord(
        id="nocoord-1",
        source="NWDP/CWC",
        source_type="official_hydrological_telemetry",
        station_name="Unknown River Gauge",
        latitude=None,
        longitude=None,
        measurement_type="rainfall",
        value=55.0,
        unit="mm",
        observation_timestamp="18-10-2026 17:30",
        fetch_timestamp=now_iso,
        classification="observation",
        freshness_status="fresh",
        quality_status="provisional",
        source_url="https://nwdp.nwic.gov.in/",
    )

    # 4. Missing timestamp -> MUST NOT trigger alert
    no_ts_rec = NormalizedEnvironmentalRecord(
        id="nots-1",
        source="NWDP/CWC",
        source_type="official_hydrological_telemetry",
        station_name="Ganga Gauge",
        latitude=25.3,
        longitude=83.0,
        measurement_type="rainfall",
        value=55.0,
        unit="mm",
        observation_timestamp=None,
        fetch_timestamp=now_iso,
        classification="observation",
        freshness_status="fresh",
        quality_status="provisional",
        source_url="https://nwdp.nwic.gov.in/",
    )

    # 5. Legitimate FRESH observation -> MUST trigger alert
    fresh_valid_rec = NormalizedEnvironmentalRecord(
        id="fresh-1",
        source="NWDP/CWC",
        source_type="official_hydrological_telemetry",
        station_name="Fresh Active Sensor",
        latitude=13.34,
        longitude=74.74,
        measurement_type="rainfall",
        value=55.0,
        unit="mm",
        observation_timestamp="18-10-2026 17:30",
        fetch_timestamp=now_iso,
        classification="observation",
        freshness_status="fresh",
        quality_status="provisional",
        source_url="https://nwdp.nwic.gov.in/",
    )

    test_records = [simulated_rec, historical_rec, no_coords_rec, no_ts_rec, fresh_valid_rec]
    alerts = india_environmental_service._generate_alerts(test_records)

    # Only the fresh valid physical observation must produce an alert
    assert len(alerts) == 1
    assert alerts[0].station_name == "Fresh Active Sensor"
    assert alerts[0].recorded_value == 55.0
    assert alerts[0].is_verified_incident is False

