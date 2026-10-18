"""
RESQNET AI — India Meteorological Department (IMD) Adapter

Integrates official meteorological observations and automatic weather station (AWS/ARG)
telemetry from the India Meteorological Department via api.imd.gov.in.

Access Verification:
- Documented in IMD API Reference (https://api.imd.gov.in/public/api_reference.html).
- Endpoints: /api/v1/current_wx, /api/v1/aws_data, /api/v1/districtnowcast.
- Access Protocol: Requires developer registration on api.imd.gov.in with valid 'x-api-key'
  and 'Authorization: Bearer <JWT>' headers.
- If credentials are unconfigured or upstream rejects the session, reports 'credentials_required'
  without claiming fake live connection, and provides visibly marked demo stations when enabled.
"""

from datetime import datetime, timezone
import hashlib
import logging
from typing import Any, Dict, List, Optional
import httpx

from backend.app.core.config import settings
from backend.app.schemas.india_environmental import (
    NormalizedEnvironmentalRecord,
    SourceStatusItem,
)
from backend.app.services.adapters.base_adapter import BaseEnvironmentalAdapter

logger = logging.getLogger("RESQNET.ImdAdapter")

# Representative IMD AWS/Observatory stations for offline / demo simulation
SIMULATED_IMD_STATIONS = [
    {
        "station_id": "43285",
        "station_name": "Mangaluru / Bajpe Observatory (Coastal Karnataka)",
        "lat": 12.9614,
        "lon": 74.8872,
        "state": "Karnataka",
        "district": "Dakshina Kannada",
        "temp_c": 28.4,
        "humidity_pct": 82.0,
        "rain_mm": 18.5,
        "wind_kmh": 22.0,
        "pressure_hpa": 1008.2,
    },
    {
        "station_id": "42182",
        "station_name": "New Delhi Safdarjung AWS (IMD HQ)",
        "lat": 28.5850,
        "lon": 77.2060,
        "state": "Delhi",
        "district": "New Delhi",
        "temp_c": 31.0,
        "humidity_pct": 54.0,
        "rain_mm": 0.0,
        "wind_kmh": 14.0,
        "pressure_hpa": 1012.0,
    },
    {
        "station_id": "43003",
        "station_name": "Mumbai Santacruz Observatory",
        "lat": 19.1176,
        "lon": 72.8561,
        "state": "Maharashtra",
        "district": "Mumbai Suburban",
        "temp_c": 29.2,
        "humidity_pct": 78.0,
        "rain_mm": 35.0,
        "wind_kmh": 26.0,
        "pressure_hpa": 1006.8,
    },
    {
        "station_id": "42410",
        "station_name": "Guwahati Borjhar Airport AWS",
        "lat": 26.1061,
        "lon": 91.5859,
        "state": "Assam",
        "district": "Kamrup Metropolitan",
        "temp_c": 26.8,
        "humidity_pct": 88.0,
        "rain_mm": 42.0,
        "wind_kmh": 16.0,
        "pressure_hpa": 1004.5,
    },
    {
        "station_id": "43314",
        "station_name": "Kozhikode / Wayanad Regional AWS",
        "lat": 11.2588,
        "lon": 75.7804,
        "state": "Kerala",
        "district": "Kozhikode",
        "temp_c": 27.5,
        "humidity_pct": 85.0,
        "rain_mm": 24.0,
        "wind_kmh": 18.0,
        "pressure_hpa": 1007.4,
    },
]


class ImdAdapter(BaseEnvironmentalAdapter):
    """
    Adapter for communicating with the official India Meteorological Department API Management Platform.
    Adheres strictly to verified authentication requirements and provenance transparency.
    """

    def __init__(self):
        super().__init__(
            source_id="imd_api",
            name="India Meteorological Department (IMD) Observational Network",
            timeout_seconds=settings.IMD_TIMEOUT_SECONDS,
        )
        self.base_url = settings.IMD_API_BASE_URL.rstrip("/")

    def _build_auth_headers(self) -> Dict[str, str]:
        """Construct verified IMD headers when credentials are configured."""
        headers: Dict[str, str] = {
            "User-Agent": "RESQNET-Emergency-Coordination/1.0",
            "Accept": "application/json",
        }
        if settings.IMD_API_KEY:
            headers["x-api-key"] = settings.IMD_API_KEY
        if settings.IMD_AUTH_TOKEN:
            token = settings.IMD_AUTH_TOKEN
            if not token.startswith("Bearer "):
                token = f"Bearer {token}"
            headers["Authorization"] = token
        return headers

    async def get_status(self, client: httpx.AsyncClient) -> SourceStatusItem:
        """Verify IMD API access requirements and current connectivity."""
        now_str = self.now_utc_iso()
        has_credentials = bool(settings.IMD_API_KEY and settings.IMD_AUTH_TOKEN)
        endpoint = f"{self.base_url}/current_wx"
        doc_url = "https://api.imd.gov.in/public/api_reference.html"

        if not has_credentials:
            return SourceStatusItem(
                source_id=self.source_id,
                name=self.name,
                status="credentials_required",
                access_requirements=(
                    "Official IMD API requires registration on api.imd.gov.in with valid 'x-api-key' "
                    "and 'Authorization: Bearer <JWT>' headers."
                ),
                endpoint_url=endpoint,
                documentation_url=doc_url,
                last_verified_at=now_str,
                latest_observation_time=None,
                limitation_notes=(
                    "IMD credentials not configured in environment (IMD_API_KEY, IMD_AUTH_TOKEN). "
                    "Operating in structured schema adapter mode with DEMO/SIMULATED station data."
                ),
                supports_realtime=True,
            )

        # Test live request with configured credentials
        try:
            headers = self._build_auth_headers()
            r = await client.get(endpoint, headers=headers, timeout=self.timeout_seconds)
            if r.status_code == 200:
                return SourceStatusItem(
                    source_id=self.source_id,
                    name=self.name,
                    status="active",
                    access_requirements="Authenticated via x-api-key and Bearer JWT token.",
                    endpoint_url=endpoint,
                    documentation_url=doc_url,
                    last_verified_at=now_str,
                    latest_observation_time=now_str,
                    limitation_notes="Live connection established to IMD API Management Platform.",
                    supports_realtime=True,
                )
            elif r.status_code == 401:
                return SourceStatusItem(
                    source_id=self.source_id,
                    name=self.name,
                    status="credentials_required",
                    access_requirements="Requires valid x-api-key and active Bearer JWT token.",
                    endpoint_url=endpoint,
                    documentation_url=doc_url,
                    last_verified_at=now_str,
                    limitation_notes=f"Upstream returned HTTP 401: {r.text[:120]}. Token may be expired.",
                    supports_realtime=True,
                )
        except Exception as exc:
            logger.warning(f"IMD connection check failed: {exc}")

        return SourceStatusItem(
            source_id=self.source_id,
            name=self.name,
            status="offline",
            access_requirements="IMD API upstream connection timed out or network error.",
            endpoint_url=endpoint,
            documentation_url=doc_url,
            last_verified_at=now_str,
            limitation_notes="IMD endpoint currently unreachable from server host.",
            supports_realtime=True,
        )

    async def fetch_records(
        self,
        client: httpx.AsyncClient,
        limit: int = 50,
        state: Optional[str] = None,
        basin: Optional[str] = None,
    ) -> List[NormalizedEnvironmentalRecord]:
        """
        Fetch normalized current weather and AWS observations from IMD.
        If credentials are valid, parses live upstream response.
        If credentials are not set or upstream returns 401/timeout, provides clearly marked demo stations.
        """
        records: List[NormalizedEnvironmentalRecord] = []
        fetch_time = self.now_utc_iso()
        has_credentials = bool(settings.IMD_API_KEY and settings.IMD_AUTH_TOKEN)

        if has_credentials:
            try:
                headers = self._build_auth_headers()
                r = await client.get(f"{self.base_url}/current_wx", headers=headers, timeout=self.timeout_seconds)
                if r.status_code == 200:
                    data = r.json()
                    # Parse IMD live JSON schema
                    live_list = data if isinstance(data, list) else data.get("data", [])
                    for item in live_list[:limit]:
                        st_name = item.get("Station") or item.get("Station_Name") or "IMD Station"
                        st_id = str(item.get("Station Id") or item.get("Station_Code") or "")
                        lat = self.sanitize_coordinate(item.get("Latitude") or item.get("lat"))
                        lon = self.sanitize_coordinate(item.get("Longitude") or item.get("lon"))
                        obs_time = item.get("Date of Observation") or item.get("Date")

                        # Extract rainfall if present
                        rf = self.sanitize_float(item.get("Rainfall") or item.get("rain"))
                        if rf is not None:
                            records.append(
                                NormalizedEnvironmentalRecord(
                                    id=f"imd-{st_id}-rf",
                                    source="IMD",
                                    source_type="official_meteorological_agency",
                                    station_id=st_id,
                                    station_name=st_name,
                                    latitude=lat,
                                    longitude=lon,
                                    measurement_type="rainfall",
                                    value=rf,
                                    unit="mm",
                                    observation_timestamp=obs_time,
                                    fetch_timestamp=fetch_time,
                                    classification="observation",
                                    freshness_status="fresh",
                                    quality_status="provisional",
                                    source_url="https://api.imd.gov.in/public/api_reference.html",
                                    agency="IMD",
                                    state=item.get("State"),
                                    district=item.get("District"),
                                    notes="Live observation from IMD Observatory / AWS feed.",
                                )
                            )
            except Exception as exc:
                logger.warning(f"Live IMD fetch encountered exception: {exc}")

        # If live records could not be fetched (or no credentials), fall back to simulated stations if enabled
        if not records and settings.ENABLE_DEMO_SIMULATED_FEEDS:
            logger.info("Providing simulated IMD stations with visible DEMO/SIMULATED flag")
            for st in SIMULATED_IMD_STATIONS:
                # Rainfall record
                records.append(
                    NormalizedEnvironmentalRecord(
                        id=f"imd-demo-{st['station_id']}-rf",
                        source="IMD",
                        source_type="official_meteorological_agency",
                        station_id=st["station_id"],
                        station_name=f"{st['station_name']} [SIMULATED DEMO]",
                        latitude=st["lat"],
                        longitude=st["lon"],
                        measurement_type="rainfall",
                        value=st["rain_mm"],
                        unit="mm",
                        observation_timestamp=None,
                        fetch_timestamp=fetch_time,
                        classification="model_estimate",
                        freshness_status="unavailable",
                        quality_status="simulated",
                        source_url="https://api.imd.gov.in/public/api_reference.html",
                        agency="IMD",
                        state=st["state"],
                        district=st["district"],
                        notes="[DEMO / SIMULATED IMD WEATHER - CREDENTIALS REQUIRED] Active for local UI development. Requires registered developer credentials (x-api-key + Bearer JWT) on api.imd.gov.in for live observations.",
                    )
                )
                # Temperature record
                records.append(
                    NormalizedEnvironmentalRecord(
                        id=f"imd-demo-{st['station_id']}-temp",
                        source="IMD",
                        source_type="official_meteorological_agency",
                        station_id=st["station_id"],
                        station_name=f"{st['station_name']} [SIMULATED DEMO]",
                        latitude=st["lat"],
                        longitude=st["lon"],
                        measurement_type="temperature",
                        value=st["temp_c"],
                        unit="°C",
                        observation_timestamp=None,
                        fetch_timestamp=fetch_time,
                        classification="model_estimate",
                        freshness_status="unavailable",
                        quality_status="simulated",
                        source_url="https://api.imd.gov.in/public/api_reference.html",
                        agency="IMD",
                        state=st["state"],
                        district=st["district"],
                        notes="[DEMO / SIMULATED IMD WEATHER - CREDENTIALS REQUIRED] Active for local UI development. Requires registered developer credentials (x-api-key + Bearer JWT) on api.imd.gov.in for live observations.",
                    )
                )

        return self.deduplicate_records(records)
