"""
RESQNET AI — Official India Environmental & Hydrological Data Service

Coordinates official Indian meteorological (IMD) and hydrological (NWDP/CWC)
source adapters alongside Open-Meteo numerical predictions.
Generates reviewable situational alerts without automatically modifying incident verification.
"""

import asyncio
from datetime import datetime, timezone
import logging
from typing import Dict, List, Optional, Tuple
import httpx

from backend.app.core.config import settings
from backend.app.schemas.india_environmental import (
    IndiaStationsDataResponse,
    NormalizedEnvironmentalRecord,
    ReviewableEnvironmentalAlert,
    SourceStatusItem,
)
from backend.app.services.adapters.imd_adapter import ImdAdapter
from backend.app.services.adapters.nwdp_cwc_adapter import NwdpCwcAdapter
from backend.app.services.adapters.open_meteo_adapter import OpenMeteoAdapter

logger = logging.getLogger("RESQNET.IndiaEnvironmentalService")


class IndiaEnvironmentalService:
    """
    Unified manager for India-wide weather stations, river water levels, and discharge feeds.
    Provides TTL caching, reviewable alert generation, and source health tracking.
    """

    def __init__(self):
        self.nwdp_adapter = NwdpCwcAdapter()
        self.imd_adapter = ImdAdapter()
        self.open_meteo_adapter = OpenMeteoAdapter()

        # In-memory TTL cache: cache_key -> (timestamp_epoch, IndiaStationsDataResponse)
        self._cache: Dict[str, Tuple[float, IndiaStationsDataResponse]] = {}

    def clear_cache(self):
        """Flush in-memory cache (for testing or manual force-refresh)."""
        self._cache.clear()

    async def get_sources_status(self) -> List[SourceStatusItem]:
        """Audit and report current connectivity of all official and modelled sources."""
        async with httpx.AsyncClient(verify=False) as client:
            statuses = await asyncio.gather(
                self.imd_adapter.get_status(client),
                self.nwdp_adapter.get_status(client),
                self.open_meteo_adapter.get_status(client),
                return_exceptions=True,
            )

        items: List[SourceStatusItem] = []
        for s in statuses:
            if isinstance(s, SourceStatusItem):
                items.append(s)
            elif isinstance(s, Exception):
                logger.error(f"Error checking source status: {s}")

        return items

    def _generate_alerts(
        self, records: List[NormalizedEnvironmentalRecord]
    ) -> List[ReviewableEnvironmentalAlert]:
        """
        Evaluate normalized records against operational hydrometeorological thresholds.
        Generates reviewable alerts for the Lead Operations Coordinator without
        triggering automatic incident verification.
        """
        alerts: List[ReviewableEnvironmentalAlert] = []
        now_str = datetime.now(timezone.utc).isoformat()

        for rec in records:
            if rec.value is None:
                continue

            # Requirement 6: Ensure missing timestamps, invalid coordinates, simulated fallbacks,
            # and historical archives cannot trigger alerts as if they were verified physical observations.
            if rec.quality_status == "simulated":
                continue
            if not rec.observation_timestamp or str(rec.observation_timestamp).strip() in ("", "-", "NA", "null", "None"):
                continue
            if rec.latitude is None or rec.longitude is None:
                continue
            if rec.freshness_status in ("historical_archive", "unavailable") or rec.classification == "historical":
                continue

            # 1. Heavy Rainfall Alert (> 30 mm/h or accumulated)
            if rec.measurement_type == "rainfall" and rec.value >= 30.0:
                is_extreme = rec.value >= 50.0
                alerts.append(
                    ReviewableEnvironmentalAlert(
                        id=f"alert-rf-{rec.id}",
                        alert_type="HEAVY_RAINFALL",
                        severity="critical" if is_extreme else "high",
                        title=f"Heavy Rainfall Exceedance at {rec.station_name or 'Station'}",
                        description=(
                            f"Recorded rainfall of {rec.value} {rec.unit} at {rec.station_name} "
                            f"({rec.state or 'Sector'}, {rec.observation_timestamp or 'Observation'}). "
                            f"{'Extreme cloudburst risk: Potential urban inundation and slope instability.' if is_extreme else 'Elevated rainfall rate: Monitor local low-lying sectors.'}"
                        ),
                        source=rec.source,
                        station_name=rec.station_name,
                        latitude=rec.latitude,
                        longitude=rec.longitude,
                        recorded_value=rec.value,
                        threshold=50.0 if is_extreme else 30.0,
                        unit=rec.unit,
                        observation_timestamp=rec.observation_timestamp,
                        status="pending_coordinator_review",
                        actionable_guidance="Corroborate with field responder reports before reallocating pumps or rescue teams.",
                        is_verified_incident=False,
                    )
                )

            # 2. Elevated River Water Level Alert (> 350m or major surge)
            elif rec.measurement_type == "water_level" and rec.value >= 200.0:
                alerts.append(
                    ReviewableEnvironmentalAlert(
                        id=f"alert-rwl-{rec.id}",
                        alert_type="RIVER_WATER_SURGE",
                        severity="high",
                        title=f"Elevated River Gauge Reading: {rec.river or 'River'} at {rec.station_name}",
                        description=(
                            f"River water level at gauge {rec.station_name} reached {rec.value} {rec.unit} "
                            f"(River: {rec.river or 'Basin'}, {rec.basin or 'Catchment'}, {rec.state or ''}). "
                            f"Telemetry indicates bank-fill threshold approaching."
                        ),
                        source=rec.source,
                        station_name=rec.station_name,
                        latitude=rec.latitude,
                        longitude=rec.longitude,
                        recorded_value=rec.value,
                        threshold=200.0,
                        unit=rec.unit,
                        observation_timestamp=rec.observation_timestamp,
                        status="pending_coordinator_review",
                        actionable_guidance="Alert downstream evacuation coordinators. Do not mark related flood incidents as verified without ground imagery.",
                        is_verified_incident=False,
                    )
                )

            # 3. River Discharge Surge Alert (> 4.0 m3/sec in regional tributary)
            elif rec.measurement_type == "river_discharge" and rec.value >= 4.0:
                alerts.append(
                    ReviewableEnvironmentalAlert(
                        id=f"alert-rd-{rec.id}",
                        alert_type="DISCHARGE_SPIKE",
                        severity="moderate",
                        title=f"Discharge Volume Alert: {rec.river or 'Tributary'} at {rec.station_name}",
                        description=(
                            f"Volumetric river discharge measured at {rec.value} {rec.unit} at {rec.station_name} "
                            f"({rec.state or ''}). Flow velocity remains elevated."
                        ),
                        source=rec.source,
                        station_name=rec.station_name,
                        latitude=rec.latitude,
                        longitude=rec.longitude,
                        recorded_value=rec.value,
                        threshold=4.0,
                        unit=rec.unit,
                        observation_timestamp=rec.observation_timestamp,
                        status="pending_coordinator_review",
                        actionable_guidance="Monitor bridge underpasses and low embankments along river corridor.",
                        is_verified_incident=False,
                    )
                )

        # Deduplicate alerts by (station_name, alert_type) keeping the peak recorded_value
        consolidated: Dict[Tuple[str, str], ReviewableEnvironmentalAlert] = {}
        for a in alerts:
            key = (str(a.station_name or ""), a.alert_type)
            if key not in consolidated:
                consolidated[key] = a
            else:
                existing = consolidated[key]
                if (a.recorded_value or 0) > (existing.recorded_value or 0):
                    consolidated[key] = a

        return list(consolidated.values())

    async def get_india_stations_data(
        self,
        measurement_type: Optional[str] = None,
        state: Optional[str] = None,
        basin: Optional[str] = None,
        limit: int = 60,
        force_refresh: bool = False,
    ) -> IndiaStationsDataResponse:
        """
        Fetch normalized records across IMD, NWDP/CWC, and Open-Meteo.
        Enforces caching, filtering, and reviewable alert generation.
        """
        cache_key = f"{measurement_type}:{state}:{basin}:{limit}"
        now_epoch = datetime.now(timezone.utc).timestamp()

        # Check in-memory TTL cache
        if not force_refresh and cache_key in self._cache:
            cached_at, cached_resp = self._cache[cache_key]
            if (now_epoch - cached_at) < settings.INDIA_STATIONS_CACHE_TTL_SECONDS:
                return cached_resp

        fetch_time = datetime.now(timezone.utc).isoformat()

        async with httpx.AsyncClient(verify=False) as client:
            # Parallel fetch from source adapters and health check
            tasks = [
                self.get_sources_status(),
                self.nwdp_adapter.fetch_records(client, limit=limit, state=state, basin=basin),
                self.imd_adapter.fetch_records(client, limit=limit, state=state, basin=basin),
                self.open_meteo_adapter.fetch_records(client, limit=10, state=state, basin=basin),
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        sources_status: List[SourceStatusItem] = results[0] if isinstance(results[0], list) else []
        nwdp_records: List[NormalizedEnvironmentalRecord] = results[1] if isinstance(results[1], list) else []
        imd_records: List[NormalizedEnvironmentalRecord] = results[2] if isinstance(results[2], list) else []
        meteo_records: List[NormalizedEnvironmentalRecord] = results[3] if isinstance(results[3], list) else []

        all_records = nwdp_records + imd_records + meteo_records

        # Filter by measurement_type if requested
        if measurement_type and measurement_type != "all":
            all_records = [r for r in all_records if r.measurement_type == measurement_type]

        # Filter by state if requested
        if state:
            state_lower = state.lower()
            all_records = [r for r in all_records if r.state and state_lower in r.state.lower()]

        # Filter by basin if requested
        if basin:
            basin_lower = basin.lower()
            all_records = [r for r in all_records if r.basin and basin_lower in r.basin.lower()]

        # Generate situational alerts
        alerts = self._generate_alerts(all_records)

        response = IndiaStationsDataResponse(
            provider="Official India Hydrometeorological Network (IMD & NWDP/CWC)",
            retrieval_timestamp=fetch_time,
            total_records=len(all_records),
            sources_status=sources_status,
            records=all_records,
            alerts=alerts,
        )

        # Store in cache
        self._cache[cache_key] = (now_epoch, response)
        return response


# Global singleton instance
india_environmental_service = IndiaEnvironmentalService()
