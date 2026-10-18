"""
RESQNET AI — Official India Environmental & Hydrological Data Schemas

Defines normalized models for IMD weather observations and NWDP/CWC river telemetry
(water level, rainfall, river discharge). Adheres strictly to classification
between physical observations, historical telemetry archives, and numerical forecasts.
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class NormalizedEnvironmentalRecord(BaseModel):
    """
    Standard normalized schema for all meteorological and hydrological observations,
    historical telemetry records, and modelled predictions across Indian sources.
    """
    id: str = Field(description="Unique deterministic identifier for the observation record.")
    source: str = Field(description="Data provider source name (e.g. 'IMD', 'NWDP/CWC', 'Open-Meteo').")
    source_type: str = Field(
        description="Type of source organization (e.g. 'official_meteorological_agency', 'official_hydrological_telemetry', 'numerical_model')."
    )
    station_id: Optional[str] = Field(default=None, description="Official station code or telemetry serial number if available.")
    station_name: Optional[str] = Field(default=None, description="Human-readable station, gauge site, or observatory name.")
    latitude: Optional[float] = Field(default=None, description="WGS84 Latitude coordinate (-90 to 90). Null if coordinates are not provided.")
    longitude: Optional[float] = Field(default=None, description="WGS84 Longitude coordinate (-180 to 180). Null if coordinates are not provided.")
    measurement_type: str = Field(
        description="Observed parameter: 'water_level', 'rainfall', 'river_discharge', 'temperature', 'humidity', 'wind_speed', 'atmospheric_pressure'."
    )
    value: Optional[float] = Field(default=None, description="Numerical measurement value. Null if unrecorded or invalid.")
    unit: str = Field(description="Standard engineering or scientific unit: 'meter', 'mm', 'm3/sec', '°C', '%', 'km/h', 'hPa'.")
    observation_timestamp: Optional[str] = Field(
        default=None,
        description="Original recording timestamp from station telemetry / sensor (e.g. '21-07-2025 16:30' or ISO 8601)."
    )
    fetch_timestamp: str = Field(description="ISO 8601 UTC timestamp when RESQNET backend retrieved this record.")
    classification: Literal["observation", "historical", "model_estimate", "forecast"] = Field(
        description="Provenance category: physical observation, historical telemetry archive, model estimate, or numerical forecast."
    )
    freshness_status: Literal["fresh", "stale", "historical_archive", "unavailable"] = Field(
        description="Current data currency flag: fresh (<6h), stale (>24h), historical archive, or unavailable feed."
    )
    quality_status: Literal["verified", "unvalidated", "provisional", "simulated"] = Field(
        description="Data validation status. Physical government telemetry is provisional/unvalidated unless corroborated; demo fallback is simulated."
    )
    source_url: str = Field(description="Direct URL to provider documentation, API endpoint, or dataset resource.")
    agency: Optional[str] = Field(default=None, description="Responsible government agency (e.g. 'CWC', 'IMD', 'ECMWF').")
    state: Optional[str] = Field(default=None, description="Indian State or Union Territory name.")
    district: Optional[str] = Field(default=None, description="District name.")
    river: Optional[str] = Field(default=None, description="River name if a river monitoring gauge.")
    basin: Optional[str] = Field(default=None, description="River basin or catchment area.")
    notes: Optional[str] = Field(default=None, description="Operational notes or validation remarks.")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Original source fields preserved for full traceability.")


class ReviewableEnvironmentalAlert(BaseModel):
    """
    Situational warning generated from elevated water levels, heavy rainfall, or discharge spikes.
    Provides operational context to the Lead Coordinator without automatically verifying incidents.
    """
    id: str = Field(description="Unique deterministic alert identifier.")
    alert_type: str = Field(description="Alert categorization: 'HEAVY_RAINFALL', 'RIVER_WATER_SURGE', 'DISCHARGE_SPIKE', 'MODELLED_FLOOD_RISK'.")
    severity: Literal["critical", "high", "moderate", "low"] = Field(description="Operational risk severity level.")
    title: str = Field(description="Actionable alert headline.")
    description: str = Field(description="Detailed situational narrative explaining the physical condition.")
    source: str = Field(description="Reporting provider: 'NWDP/CWC', 'IMD', or 'Open-Meteo/GloFAS'.")
    station_name: Optional[str] = Field(default=None, description="Associated station name.")
    latitude: Optional[float] = Field(default=None, description="Latitude for map visualization.")
    longitude: Optional[float] = Field(default=None, description="Longitude for map visualization.")
    recorded_value: Optional[float] = Field(default=None, description="Sensor reading triggering the alert.")
    threshold: Optional[float] = Field(default=None, description="Operational threshold exceeded.")
    unit: Optional[str] = Field(default=None, description="Measurement unit.")
    observation_timestamp: Optional[str] = Field(default=None, description="Timestamp of the trigger reading.")
    status: Literal["pending_coordinator_review", "reviewed", "dismissed"] = Field(
        default="pending_coordinator_review",
        description="Review workflow status. Always defaults to pending_coordinator_review."
    )
    actionable_guidance: str = Field(description="Tactical coordination advice for field units and coordinators.")
    is_verified_incident: bool = Field(
        default=False,
        description="Explicit guarantee: Environmental alerts NEVER automatically verify emergency incidents."
    )


class SourceStatusItem(BaseModel):
    """
    Diagnostic status of each official and modelled data provider.
    """
    source_id: str = Field(description="Identifier: 'imd_api', 'nwdp_cwc_river_level', 'nwdp_cwc_rainfall', 'nwdp_cwc_discharge', 'open_meteo'.")
    name: str = Field(description="Official name of the service or dataset.")
    status: Literal["active", "credentials_required", "historical_telemetry_available", "offline"] = Field(
        description="Current operational status of the upstream connection."
    )
    access_requirements: str = Field(description="Exact credentials or network protocols required for live data.")
    endpoint_url: str = Field(description="API endpoint or dataset resource URL.")
    documentation_url: str = Field(description="Official documentation reference.")
    last_verified_at: Optional[str] = Field(default=None, description="ISO 8601 UTC timestamp of last verification check.")
    latest_observation_time: Optional[str] = Field(default=None, description="Most recent timestamp recorded in the dataset.")
    limitation_notes: str = Field(description="Exact operational limitation, freshness boundaries, or authentication constraints.")
    supports_realtime: bool = Field(description="True if the source provides real-time streaming; False if published batches or models.")


class IndiaStationsDataResponse(BaseModel):
    """
    Unified payload returning official India station records, source health audits, and reviewable alerts.
    """
    provider: str = Field(default="Official India Hydrometeorological Network (IMD & NWDP/CWC)")
    retrieval_timestamp: str = Field(description="ISO 8601 UTC timestamp of response generation.")
    total_records: int = Field(description="Total normalized records returned.")
    sources_status: List[SourceStatusItem] = Field(description="Audit and verification status of all official sources.")
    records: List[NormalizedEnvironmentalRecord] = Field(description="Normalized station telemetry and observation records.")
    alerts: List[ReviewableEnvironmentalAlert] = Field(description="Generated reviewable situational alerts.")
    disclaimer: str = Field(
        default=(
            "Official Indian meteorological (IMD) and hydrological (NWDP/CWC) telemetry data for situational awareness. "
            "Telemetry records and alerts do NOT automatically verify civilian incident reports or deploy response teams without coordinator corroboration."
        ),
        description="Mandatory legal and operational disclaimer."
    )
