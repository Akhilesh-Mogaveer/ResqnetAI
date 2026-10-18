"""
RESQNET AI — NWDP / CWC Hydrological Telemetry Adapter

Integrates National Water Data Portal (NWDP / NWIC) telemetry datasets from the
Central Water Commission (CWC):
- River Water Level Telemetry Hourly
- Rainfall Telemetry Hourly
- River Discharge Telemetry Hourly

Uses the verified CKAN Datastore API (https://nwdp.nwic.gov.in/api/3/action/datastore_search).
Clearly classifies records as official historical telemetry archives rather than live real-time feeds.
"""

import asyncio
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

logger = logging.getLogger("RESQNET.NwdpAdapter")

# Verified CKAN Resource IDs for 2021-2025 telemetry
RESOURCE_RIVER_WATER_LEVEL = "578e35aa-7044-4a53-a941-8b5b13906372"  # Subernarekha CWC 2021-2025
RESOURCE_RAINFALL = "fdabc65b-0018-4d4a-a6d0-7b5985873912"           # Andhra Pradesh CWC 2021-2025
RESOURCE_RIVER_DISCHARGE = "9c755c40-389e-4f5d-92c6-b936d28e51b3"    # Arunachal Pradesh CWC 1970-2025

# High-fidelity simulated baseline records for offline/demo operation when government server times out
OFFLINE_DEMO_RECORDS = [
    {
        "id": "cwc-demo-adityapur-rwl",
        "station": "Adityapur",
        "agency": "CWC",
        "state": "Jharkhand",
        "district": "PASHCHIMI SINGHBHUM",
        "river": "Kharkai",
        "basin": "Subernarekha",
        "lat": 22.791389,
        "lon": 86.173611,
        "time": "21-07-2025 16:30",
        "type": "water_level",
        "value": 125.85,
        "unit": "meter",
    },
    {
        "id": "cwc-demo-saraikela-rwl",
        "station": "Saraikela Rd. Bridge",
        "agency": "CWC",
        "state": "Jharkhand",
        "district": "SARAIKELA KHARSAWAN",
        "river": "Kharkai",
        "basin": "Subernarekha",
        "lat": 22.693611,
        "lon": 85.978611,
        "time": "21-07-2025 16:30",
        "type": "water_level",
        "value": 378.39,
        "unit": "meter",
    },
    {
        "id": "cwc-demo-voni-rf",
        "station": "VONI",
        "agency": "CWC",
        "state": "Andhra Pradesh",
        "district": "SRIKAKULAM",
        "river": "Vamsadhara",
        "basin": "East Flowing Rivers",
        "lat": 18.630000,
        "lon": 83.760000,
        "time": "29-12-2025 07:30",
        "type": "rainfall",
        "value": 43.0,
        "unit": "mm",
    },
    {
        "id": "cwc-demo-ziro-rd",
        "station": "Ziro",
        "agency": "CWC",
        "state": "Arunachal Pradesh",
        "district": "LOWER SUBANSIRI",
        "river": "Subansiri",
        "basin": "Brahmaputra",
        "lat": 30.288056,
        "lon": 78.984167,
        "time": "22-09-2025 15:00",
        "type": "river_discharge",
        "value": 4.64,
        "unit": "m3/sec",
    },
]


class NwdpCwcAdapter(BaseEnvironmentalAdapter):
    """
    Adapter for querying official hydrological telemetry from the National Water Data Portal (NWDP / CWC).
    Retrieves hourly river water levels, rainfall, and discharge via CKAN datastore search.
    """

    def __init__(self):
        super().__init__(
            source_id="nwdp_cwc_hydrology",
            name="NWDP / Central Water Commission (CWC) Telemetry",
            timeout_seconds=settings.NWDP_TIMEOUT_SECONDS,
        )
        self.base_url = settings.NWDP_BASE_URL.rstrip("/")
        self.datastore_url = f"{self.base_url}/api/3/action/datastore_search"

    async def get_status(self, client: httpx.AsyncClient) -> SourceStatusItem:
        """Verify upstream access to NWDP CKAN API."""
        check_url = f"{self.base_url}/api/3/action/package_show?id=river-water-level-telemetry-hourly-central-water-commission-cwc"
        now_str = self.now_utc_iso()
        try:
            r = await client.get(check_url, timeout=self.timeout_seconds)
            if r.status_code == 200 and r.json().get("success"):
                return SourceStatusItem(
                    source_id=self.source_id,
                    name=self.name,
                    status="historical_telemetry_available",
                    access_requirements="Public Open Access (CKAN Action API). No API key required for datastore reading.",
                    endpoint_url=self.datastore_url,
                    documentation_url="https://nwdp.nwic.gov.in/en/dataset/river-water-level-telemetry-hourly-central-water-commission-cwc",
                    last_verified_at=now_str,
                    latest_observation_time="2025-12-29T07:30:00+05:30",
                    limitation_notes="Published historical sensor telemetry records. Data is current through periodic government telemetry batches (up to late 2025). Not a real-time sub-minute streaming wire.",
                    supports_realtime=False,
                )
        except Exception as exc:
            logger.warning(f"NWDP healthcheck failed: {exc}")

        return SourceStatusItem(
            source_id=self.source_id,
            name=self.name,
            status="offline",
            access_requirements="Public Open Access (CKAN API). Currently unreachable or timed out.",
            endpoint_url=self.datastore_url,
            documentation_url="https://nwdp.nwic.gov.in/",
            last_verified_at=now_str,
            limitation_notes="NWDP portal unreachable within configured timeout. Serving verified archival snapshot.",
            supports_realtime=False,
        )

    async def fetch_records(
        self,
        client: httpx.AsyncClient,
        limit: int = 40,
        state: Optional[str] = None,
        basin: Optional[str] = None,
    ) -> List[NormalizedEnvironmentalRecord]:
        """
        Fetch normalized river water level, rainfall, and discharge telemetry records.
        Queries the 3 official datasets and standardizes all fields.
        """
        records: List[NormalizedEnvironmentalRecord] = []
        fetch_time = self.now_utc_iso()

        targets = [
            (
                RESOURCE_RIVER_WATER_LEVEL,
                "water_level",
                "meter",
                "River Water Level Telemetry Hourly (meter)",
                "https://nwdp.nwic.gov.in/en/dataset/river-water-level-telemetry-hourly-central-water-commission-cwc",
            ),
            (
                RESOURCE_RAINFALL,
                "rainfall",
                "mm",
                "Telemetry Hourly Rainfall (mm)",
                "https://nwdp.nwic.gov.in/dataset/rainfall-cwc-telemetry-hourly",
            ),
            (
                RESOURCE_RIVER_DISCHARGE,
                "river_discharge",
                "m3/sec",
                "Telemetry Hourly River Water Discharge (m3/sec)",
                "https://nwdp.nwic.gov.in/dataset/river-discharge-telemetry-hourly-central-water-commission-cwc",
            ),
        ]

        per_resource_limit = max(10, limit // len(targets))

        async def _fetch_single_target(resource_id: str, m_type: str, unit: str, val_col: str, doc_url: str):
            res_records = []
            try:
                params: Dict[str, Any] = {
                    "resource_id": resource_id,
                    "limit": per_resource_limit,
                    "sort": "_id desc",
                }
                filters: Dict[str, Any] = {}
                if state:
                    filters["State"] = state
                if basin:
                    filters["Basin"] = basin
                if filters:
                    params["filters"] = str(filters).replace("'", '"')

                r = await client.get(self.datastore_url, params=params, timeout=self.timeout_seconds)

                if r.status_code == 200:
                    data = r.json()
                    if data.get("success"):
                        raw_records = data.get("result", {}).get("records", [])
                        for raw in raw_records:
                            rec = self._parse_nwdp_record(
                                raw=raw,
                                measurement_type=m_type,
                                unit=unit,
                                val_col=val_col,
                                resource_id=resource_id,
                                doc_url=doc_url,
                                fetch_time=fetch_time,
                            )
                            if rec:
                                res_records.append(rec)
            except Exception as exc:
                logger.warning(f"Failed to fetch NWDP resource {resource_id}: {exc}")
            return res_records

        results = await asyncio.gather(
            *[_fetch_single_target(rid, mt, un, vc, du) for rid, mt, un, vc, du in targets],
            return_exceptions=True
        )

        for res in results:
            if isinstance(res, list):
                records.extend(res)

        # If live retrieval failed or yielded empty (e.g. offline dev environment),
        # use verified offline baseline if enabled, visibly marked as simulated
        if not records and settings.ENABLE_DEMO_SIMULATED_FEEDS:
            logger.info("Providing verified baseline NWDP records in offline simulated mode")
            for demo in OFFLINE_DEMO_RECORDS:
                records.append(
                    NormalizedEnvironmentalRecord(
                        id=demo["id"],
                        source="NWDP/CWC",
                        source_type="official_hydrological_telemetry",
                        station_id=demo["station"].lower().replace(" ", "_"),
                        station_name=demo["station"],
                        latitude=demo["lat"],
                        longitude=demo["lon"],
                        measurement_type=demo["type"],
                        value=demo["value"],
                        unit=demo["unit"],
                        observation_timestamp=demo["time"],
                        fetch_timestamp=fetch_time,
                        classification="historical",
                        freshness_status="historical_archive",
                        quality_status="simulated",
                        source_url="https://nwdp.nwic.gov.in/en/dataset/river-water-level-telemetry-hourly-central-water-commission-cwc",
                        agency=demo["agency"],
                        state=demo["state"],
                        district=demo["district"],
                        river=demo["river"],
                        basin=demo["basin"],
                        notes="[DEMO / SIMULATED NWDP SNAPSHOT] Used for local verification and dashboard rendering.",
                    )
                )

        return self.deduplicate_records(records)

    def _parse_nwdp_record(
        self,
        raw: Dict[str, Any],
        measurement_type: str,
        unit: str,
        val_col: str,
        resource_id: str,
        doc_url: str,
        fetch_time: str,
    ) -> Optional[NormalizedEnvironmentalRecord]:
        """Convert a raw NWDP CKAN row into a validated NormalizedEnvironmentalRecord."""
        raw_val = raw.get(val_col)
        parsed_val = self.sanitize_float(raw_val)

        # Skip rows where measurement is completely null or missing
        if parsed_val is None:
            return None

        station_name = raw.get("Station") or "Unknown Station"
        obs_time = raw.get("Data Acquisition Time") or raw.get("Date") or None
        lat = self.sanitize_coordinate(raw.get("Latitude"))
        lon = self.sanitize_coordinate(raw.get("Longitude"))

        # Generate stable record ID based on source, station, type, and timestamp
        raw_key = f"cwc_{station_name}_{measurement_type}_{obs_time}".encode("utf-8")
        rec_id = f"cwc-{hashlib.md5(raw_key).hexdigest()[:12]}"
        classification, freshness = self.resolve_freshness_and_classification(
            obs_time, default_classification="observation"
        )

        return NormalizedEnvironmentalRecord(
            id=rec_id,
            source="NWDP/CWC",
            source_type="official_hydrological_telemetry",
            station_id=str(raw.get("SlNo") or station_name.lower().replace(" ", "_")),
            station_name=station_name,
            latitude=lat,
            longitude=lon,
            measurement_type=measurement_type,
            value=parsed_val,
            unit=unit,
            observation_timestamp=obs_time,
            fetch_timestamp=fetch_time,
            classification=classification,
            freshness_status=freshness,
            quality_status="provisional",
            source_url=f"https://nwdp.nwic.gov.in/api/3/action/datastore_search?resource_id={resource_id}",
            agency=raw.get("Agency") or "CWC",
            state=raw.get("State"),
            district=raw.get("District"),
            river=raw.get("River") or raw.get("Local River"),
            basin=raw.get("Basin"),
            notes="Official telemetry from Central Water Commission (NWDP CKAN Datastore).",
            metadata={
                "SlNo": raw.get("SlNo"),
                "Tehsil": raw.get("Tehsil"),
                "Block": raw.get("Block"),
                "Village": raw.get("Village"),
                "RL_of_zeroGauge": raw.get("RL_of_zeroGauge"),
                "MeanSeaLevel": raw.get("MeanSeaLevel"),
            },
        )
