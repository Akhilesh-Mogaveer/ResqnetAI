"""
RESQNET AI — Environmental Data Service & API Tests (Open-Meteo Integration)

Validates coordinate bounds validation, mocked external API parsing,
caching with force-refresh bypass, upstream timeout handling, malformed response resilience,
and GloFAS river discharge partial failure handling.
"""

import pytest
from unittest.mock import AsyncMock, patch
import httpx
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.environmental_service import environmental_service

client = TestClient(app)

MOCK_WEATHER_SUCCESS = {
    "latitude": 13.34,
    "longitude": 74.74,
    "elevation": 18.0,
    "timezone": "Asia/Kolkata",
    "current": {
        "time": "2026-10-18T15:00",
        "interval": 900,
        "temperature_2m": 29.5,
        "relative_humidity_2m": 76,
        "apparent_temperature": 33.8,
        "precipitation": 1.2,
        "rain": 1.2,
        "weather_code": 61,
        "surface_pressure": 1008.2,
        "wind_speed_10m": 12.4,
        "wind_direction_10m": 270,
        "wind_gusts_10m": 24.5,
    },
    "hourly": {
        "time": [
            "2026-10-18T15:00",
            "2026-10-18T16:00",
            "2026-10-18T17:00",
            "2026-10-18T18:00",
            "2026-10-18T19:00",
            "2026-10-18T20:00",
        ],
        "precipitation": [1.2, 2.5, 3.0, 0.8, 0.0, 0.0],
        "rain": [1.2, 2.5, 3.0, 0.8, 0.0, 0.0],
        "weather_code": [61, 63, 63, 61, 2, 1],
        "temperature_2m": [29.5, 28.9, 28.0, 27.5, 27.0, 26.8],
    },
}

MOCK_FLOOD_SUCCESS = {
    "latitude": 13.34,
    "longitude": 74.74,
    "daily": {
        "time": [
            "2026-10-18",
            "2026-10-19",
            "2026-10-20",
            "2026-10-21",
            "2026-10-22",
            "2026-10-23",
            "2026-10-24",
        ],
        "river_discharge": [2.33, 1.85, 1.50, 1.30, 1.10, 0.95, 0.90],
        "river_discharge_mean": [2.20, 1.80, 1.45, 1.25, 1.05, 0.92, 0.88],
        "river_discharge_max": [3.10, 2.45, 1.95, 1.60, 1.35, 1.15, 1.05],
    },
}


@pytest.fixture(autouse=True)
def reset_service_cache():
    """Ensure in-memory cache is clean for every test."""
    environmental_service.clear_cache()
    yield
    environmental_service.clear_cache()


def test_default_location_udupi():
    """Omitting coordinates must default to Udupi, Karnataka reference location (13.3409, 74.7421)."""
    with patch.object(environmental_service, "fetch_weather_api", new_callable=AsyncMock) as mock_weather, \
         patch.object(environmental_service, "fetch_flood_api", new_callable=AsyncMock) as mock_flood:
        mock_weather.return_value = MOCK_WEATHER_SUCCESS
        mock_flood.return_value = MOCK_FLOOD_SUCCESS

        response = client.get("/api/v1/environmental-data")
        assert response.status_code == 200
        data = response.json()

        assert data["provider"] == "Open-Meteo"
        assert data["data_nature"] == "model_derived"
        assert data["location"]["name"] == "Udupi, Karnataka"
        assert abs(data["location"]["latitude"] - 13.3409) < 0.001
        assert abs(data["location"]["longitude"] - 74.7421) < 0.001


def test_successful_retrieval_and_normalization():
    """Verify that measurements, rainfall summary, and GloFAS river discharge are properly normalized."""
    with patch.object(environmental_service, "fetch_weather_api", new_callable=AsyncMock) as mock_weather, \
         patch.object(environmental_service, "fetch_flood_api", new_callable=AsyncMock) as mock_flood:
        mock_weather.return_value = MOCK_WEATHER_SUCCESS
        mock_flood.return_value = MOCK_FLOOD_SUCCESS

        response = client.get(
            "/api/v1/environmental-data?latitude=13.3409&longitude=74.7421&location_name=Udupi%20Harbor"
        )
        assert response.status_code == 200
        data = response.json()

        # Location
        assert data["location"]["name"] == "Udupi Harbor"
        assert data["location"]["timezone"] == "Asia/Kolkata"

        # Current weather
        assert data["current"]["temperature_c"] == 29.5
        assert data["current"]["apparent_temperature_c"] == 33.8
        assert data["current"]["relative_humidity_pct"] == 76
        assert data["current"]["precipitation_mm"] == 1.2
        assert data["current"]["weather_code"] == 61
        assert data["current"]["weather_description"] == "Slight rain"
        assert data["current"]["wind_speed_kmh"] == 12.4

        # Precipitation summary
        assert data["precipitation"]["current_hour_mm"] == 1.2
        assert data["precipitation"]["next_6h_total_mm"] == round(1.2 + 2.5 + 3.0 + 0.8 + 0.0 + 0.0, 2)
        assert len(data["precipitation"]["hourly"]) == 6

        # Hydrological river discharge context
        assert data["flood_risk"]["available"] is True
        assert data["flood_risk"]["model_source"] == "GloFAS v4 / ECMWF via Open-Meteo Flood API"
        assert data["flood_risk"]["current_discharge_m3s"] == 2.33
        assert data["flood_risk"]["forecast_max_discharge_m3s"] == 3.10
        assert len(data["flood_risk"]["daily_forecast"]) == 7

        # Operational disclaimer
        assert "Public meteorological" in data["disclaimer"]
        assert "Does NOT trigger automated incident creation" in data["disclaimer"]


def test_invalid_latitude_and_longitude():
    """Latitude must be between -90 and 90; longitude must be between -180 and 180."""
    # Invalid latitude > 90
    resp_lat_high = client.get("/api/v1/environmental-data?latitude=95.0&longitude=74.7421")
    assert resp_lat_high.status_code == 422
    assert "Latitude 95.0 is out of valid bounds" in resp_lat_high.json()["detail"]

    # Invalid latitude < -90
    resp_lat_low = client.get("/api/v1/environmental-data?latitude=-95.0&longitude=74.7421")
    assert resp_lat_low.status_code == 422
    assert "Latitude -95.0 is out of valid bounds" in resp_lat_low.json()["detail"]

    # Invalid longitude > 180
    resp_lon_high = client.get("/api/v1/environmental-data?latitude=13.3409&longitude=195.0")
    assert resp_lon_high.status_code == 422
    assert "Longitude 195.0 is out of valid bounds" in resp_lon_high.json()["detail"]

    # Invalid string coordinate
    resp_bad_str = client.get("/api/v1/environmental-data?latitude=abc&longitude=74.7421")
    assert resp_bad_str.status_code == 422


def test_in_memory_caching_and_force_refresh():
    """Verify that cached data is returned for subsequent requests, and force_refresh bypasses cache."""
    with patch.object(environmental_service, "fetch_weather_api", new_callable=AsyncMock) as mock_weather, \
         patch.object(environmental_service, "fetch_flood_api", new_callable=AsyncMock) as mock_flood:
        mock_weather.return_value = MOCK_WEATHER_SUCCESS
        mock_flood.return_value = MOCK_FLOOD_SUCCESS

        # Request 1: Fresh live fetch
        resp1 = client.get("/api/v1/environmental-data?latitude=13.3409&longitude=74.7421")
        assert resp1.status_code == 200
        assert resp1.json()["is_cached"] is False
        assert mock_weather.call_count == 1

        # Request 2: Served from cache
        resp2 = client.get("/api/v1/environmental-data?latitude=13.3409&longitude=74.7421")
        assert resp2.status_code == 200
        assert resp2.json()["is_cached"] is True
        assert mock_weather.call_count == 1  # No additional upstream call

        # Request 3: force_refresh=true bypasses cache
        resp3 = client.get("/api/v1/environmental-data?latitude=13.3409&longitude=74.7421&force_refresh=true")
        assert resp3.status_code == 200
        assert resp3.json()["is_cached"] is False
        assert mock_weather.call_count == 2  # Upstream was called again


def test_provider_timeout_handling():
    """When upstream weather provider times out, return HTTP 503 with informative error."""
    with patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Connection timed out")):
        response = client.get("/api/v1/environmental-data?latitude=13.3409&longitude=74.7421&force_refresh=true")
        assert response.status_code == 503
        data = response.json()
        assert "Environmental data provider unavailable" in data["detail"]
        assert "timed out" in data["detail"]


def test_provider_malformed_response():
    """When upstream returns invalid dictionary or missing keys, handle gracefully."""
    with patch.object(environmental_service, "fetch_weather_api", side_effect=httpx.RequestError("Invalid JSON")):
        response = client.get("/api/v1/environmental-data?latitude=13.3409&longitude=74.7421&force_refresh=true")
        assert response.status_code == 503
        assert "Environmental data provider unavailable" in response.json()["detail"]


def test_flood_api_partial_failure_graceful_degradation():
    """
    If GloFAS Flood API is unreachable or returns None (e.g. no river reach within 5km),
    the endpoint must still succeed and return weather data with flood_risk.available=False.
    """
    with patch.object(environmental_service, "fetch_weather_api", new_callable=AsyncMock) as mock_weather, \
         patch.object(environmental_service, "fetch_flood_api", new_callable=AsyncMock) as mock_flood:
        mock_weather.return_value = MOCK_WEATHER_SUCCESS
        mock_flood.return_value = None  # Flood API failed / unavailable

        response = client.get("/api/v1/environmental-data?latitude=13.3409&longitude=74.7421")
        assert response.status_code == 200
        data = response.json()

        # Weather still succeeded
        assert data["current"]["temperature_c"] == 29.5
        assert data["current"]["weather_description"] == "Slight rain"

        # Flood context indicates graceful unavailability without failing the endpoint
        assert data["flood_risk"]["available"] is False
        assert data["flood_risk"]["current_discharge_m3s"] is None
        assert "No major GloFAS river grid cell identified" in data["flood_risk"]["notes"]
