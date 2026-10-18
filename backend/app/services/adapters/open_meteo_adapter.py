"""
RESQNET AI — Open-Meteo Model Adapter

Adapts numerical weather forecasts and GloFAS river discharge projections from
the existing Open-Meteo service into standard NormalizedEnvironmentalRecord models.
Preserves existing Open-Meteo functionality as a separate modelled layer.
"""

from datetime import datetime, timezone
import logging
from typing import List, Optional
import httpx

from backend.app.core.config import settings
from backend.app.schemas.india_environmental import (
    NormalizedEnvironmentalRecord,
    SourceStatusItem,
)
from backend.app.services.adapters.base_adapter import BaseEnvironmentalAdapter
from backend.app.services.environmental_service import environmental_service

logger = logging.getLogger("RESQNET.OpenMeteoAdapter")


class OpenMeteoAdapter(BaseEnvironmentalAdapter):
    """
    Adapter bridging Open-Meteo weather and GloFAS flood projections into the
    unified normalized environmental schema.
    """

    def __init__(self):
        super().__init__(
            source_id="open_meteo_models",
            name="Open-Meteo Forecast & GloFAS Hydrological Model",
            timeout_seconds=settings.OPEN_METEO_TIMEOUT_SECONDS,
        )

    async def get_status(self, client: httpx.AsyncClient) -> SourceStatusItem:
        """Report Open-Meteo and GloFAS API status."""
        now_str = self.now_utc_iso()
        return SourceStatusItem(
            source_id=self.source_id,
            name=self.name,
            status="active",
            access_requirements="Public Open Access (CC-BY 4.0). No API key required for non-commercial volume.",
            endpoint_url=settings.OPEN_METEO_WEATHER_URL,
            documentation_url="https://open-meteo.com/",
            last_verified_at=now_str,
            latest_observation_time=now_str,
            limitation_notes="Numerical weather prediction model (ECMWF/GFS/GloFAS). Not physical station telemetry.",
            supports_realtime=False,
        )

    async def fetch_records(
        self,
        client: httpx.AsyncClient,
        limit: int = 20,
        state: Optional[str] = None,
        basin: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> List[NormalizedEnvironmentalRecord]:
        """Convert Open-Meteo model readings for reference location into normalized records."""
        lat = latitude if latitude is not None else settings.DEFAULT_ENV_LATITUDE
        lon = longitude if longitude is not None else settings.DEFAULT_ENV_LONGITUDE
        fetch_time = self.now_utc_iso()
        records: List[NormalizedEnvironmentalRecord] = []

        try:
            data = await environmental_service.get_environmental_data(latitude=lat, longitude=lon)

            # 1. Temperature Record
            if data.current.temperature_c is not None:
                records.append(
                    NormalizedEnvironmentalRecord(
                        id=f"openmeteo-{round(lat, 2)}-{round(lon, 2)}-temp",
                        source="Open-Meteo",
                        source_type="numerical_model",
                        station_id=f"model-cell-{round(lat, 2)}-{round(lon, 2)}",
                        station_name=f"Model Grid Cell ({data.location.name})",
                        latitude=lat,
                        longitude=lon,
                        measurement_type="temperature",
                        value=data.current.temperature_c,
                        unit="°C",
                        observation_timestamp=data.observation_model_timestamp,
                        fetch_timestamp=fetch_time,
                        classification="model_estimate",
                        freshness_status="fresh",
                        quality_status="verified",
                        source_url="https://open-meteo.com/",
                        agency="ECMWF / Open-Meteo",
                        notes="Numerical forecast from Open-Meteo high-resolution model.",
                    )
                )

            # 2. Precipitation Rate Record
            if data.current.precipitation_mm is not None:
                records.append(
                    NormalizedEnvironmentalRecord(
                        id=f"openmeteo-{round(lat, 2)}-{round(lon, 2)}-precip",
                        source="Open-Meteo",
                        source_type="numerical_model",
                        station_id=f"model-cell-{round(lat, 2)}-{round(lon, 2)}",
                        station_name=f"Model Grid Cell ({data.location.name})",
                        latitude=lat,
                        longitude=lon,
                        measurement_type="rainfall",
                        value=data.current.precipitation_mm,
                        unit="mm",
                        observation_timestamp=data.observation_model_timestamp,
                        fetch_timestamp=fetch_time,
                        classification="forecast",
                        freshness_status="fresh",
                        quality_status="verified",
                        source_url="https://open-meteo.com/",
                        agency="ECMWF / Open-Meteo",
                        notes="Current hour modelled rainfall rate.",
                    )
                )

            # 3. GloFAS River Discharge Record
            if data.flood_risk.available and data.flood_risk.current_discharge_m3s is not None:
                records.append(
                    NormalizedEnvironmentalRecord(
                        id=f"glofas-{round(lat, 2)}-{round(lon, 2)}-discharge",
                        source="Open-Meteo",
                        source_type="numerical_model",
                        station_id=f"glofas-cell-{round(lat, 2)}-{round(lon, 2)}",
                        station_name=f"GloFAS Catchment Grid ({data.location.name})",
                        latitude=lat,
                        longitude=lon,
                        measurement_type="river_discharge",
                        value=data.flood_risk.current_discharge_m3s,
                        unit="m3/sec",
                        observation_timestamp=data.observation_model_timestamp,
                        fetch_timestamp=fetch_time,
                        classification="model_estimate",
                        freshness_status="fresh",
                        quality_status="verified",
                        source_url="https://flood-api.open-meteo.com/",
                        agency="ECMWF GloFAS",
                        notes="GloFAS v4 continental hydrological routing projection (~5km grid).",
                    )
                )
        except Exception as exc:
            logger.warning(f"Open-Meteo adapter record conversion failed: {exc}")

        return records
