"""
RESQNET AI — Environmental Data Schemas (Open-Meteo Integration)

Defines normalized models for meteorological variables, rainfall forecasts,
and GloFAS river discharge projections. Explicitly designates all data as
model-derived numerical predictions rather than physical sensor telemetry.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class CurrentWeatherMeasurement(BaseModel):
    temperature_c: Optional[float] = Field(default=None, description="Current ambient temperature in Celsius at 2m.")
    apparent_temperature_c: Optional[float] = Field(default=None, description="Perceived 'feels like' temperature in Celsius.")
    relative_humidity_pct: Optional[int] = Field(default=None, description="Relative humidity percentage at 2m.")
    precipitation_mm: Optional[float] = Field(default=None, description="Current precipitation rate in mm.")
    rain_mm: Optional[float] = Field(default=None, description="Current rain rate in mm.")
    surface_pressure_hpa: Optional[float] = Field(default=None, description="Atmospheric surface pressure in hPa.")
    wind_speed_kmh: Optional[float] = Field(default=None, description="Wind speed at 10m in km/h.")
    wind_direction_deg: Optional[int] = Field(default=None, description="Wind direction in degrees (0-360).")
    wind_gusts_kmh: Optional[float] = Field(default=None, description="Wind gusts at 10m in km/h.")
    weather_code: Optional[int] = Field(default=None, description="WMO weather code (0-99).")
    weather_description: str = Field(default="Unknown", description="Human-readable WMO weather classification.")


class HourlyPrecipitationItem(BaseModel):
    time: str = Field(description="ISO 8601 or local timestamp for the forecast hour.")
    precipitation_mm: float = Field(default=0.0, description="Total expected liquid precipitation in mm.")
    rain_mm: float = Field(default=0.0, description="Expected rainfall in mm.")
    temperature_c: Optional[float] = Field(default=None, description="Forecast temperature in Celsius.")
    weather_code: Optional[int] = Field(default=None, description="WMO weather code.")


class PrecipitationSummary(BaseModel):
    current_hour_mm: float = Field(default=0.0, description="Precipitation in the current hour in mm.")
    next_6h_total_mm: float = Field(default=0.0, description="Accumulated rainfall expected over next 6 hours in mm.")
    next_24h_total_mm: float = Field(default=0.0, description="Accumulated rainfall expected over next 24 hours in mm.")
    max_hourly_rate_mm: float = Field(default=0.0, description="Peak hourly rainfall rate in forecast window in mm/h.")
    hourly: List[HourlyPrecipitationItem] = Field(default_factory=list, description="Hourly time-series projection.")


class FloodDischargeDay(BaseModel):
    date: str = Field(description="Date string (YYYY-MM-DD) for hydrological projection.")
    river_discharge_m3s: Optional[float] = Field(default=None, description="Representative river discharge in m³/s.")
    river_discharge_mean_m3s: Optional[float] = Field(default=None, description="Ensemble mean river discharge in m³/s.")
    river_discharge_max_m3s: Optional[float] = Field(default=None, description="Ensemble maximum river discharge in m³/s.")


class FloodRiskContext(BaseModel):
    available: bool = Field(default=False, description="Whether GloFAS river discharge model data is available for this cell.")
    model_source: str = Field(default="GloFAS v4 / ECMWF via Open-Meteo Flood API", description="Hydrological model attribution.")
    current_discharge_m3s: Optional[float] = Field(default=None, description="Current or today's river discharge in m³/s.")
    forecast_max_discharge_m3s: Optional[float] = Field(default=None, description="Maximum river discharge forecasted over the next 7 days in m³/s.")
    daily_forecast: List[FloodDischargeDay] = Field(default_factory=list, description="7-day daily river discharge projections.")
    notes: str = Field(default="", description="Operational interpretation and resolution notes.")


class EnvironmentalLocation(BaseModel):
    name: str = Field(default="Operational Sector", description="Identified or user-specified location label.")
    latitude: float = Field(description="WGS84 latitude coordinate (-90 to 90).")
    longitude: float = Field(description="WGS84 longitude coordinate (-180 to 180).")
    elevation_m: Optional[float] = Field(default=None, description="Topographical elevation above sea level in meters.")
    timezone: Optional[str] = Field(default=None, description="Resolved geographical timezone string.")


class EnvironmentalDataResponse(BaseModel):
    provider: str = Field(default="Open-Meteo", description="Primary meteorological data provider.")
    provider_attribution: str = Field(
        default="Weather data by Open-Meteo.com (CC-BY 4.0); River discharge from Global Flood Awareness System (GloFAS / ECMWF).",
        description="Mandatory legal attribution for external open data."
    )
    provider_url: str = Field(default="https://open-meteo.com/", description="Direct URL to provider documentation.")
    data_nature: str = Field(
        default="model_derived",
        description="Designates that values are numerical model predictions, NOT localized physical sensor telemetry."
    )
    is_cached: bool = Field(default=False, description="True if response was served from backend in-memory TTL cache.")
    cached_at: Optional[str] = Field(default=None, description="UTC timestamp when data was cached in memory.")
    retrieval_timestamp: str = Field(description="ISO 8601 UTC timestamp of backend retrieval.")
    observation_model_timestamp: Optional[str] = Field(default=None, description="Model step/observation timestamp from Open-Meteo.")
    location: EnvironmentalLocation
    current: CurrentWeatherMeasurement
    precipitation: PrecipitationSummary
    flood_risk: FloodRiskContext
    disclaimer: str = Field(
        default="Public meteorological and hydrological model data for operational awareness only. "
                "Does NOT trigger automated incident creation or replace verified civilian ground reports.",
        description="Safety and non-interference operational disclaimer."
    )


# Re-export official India schemas for unified access
from backend.app.schemas.india_environmental import (
    IndiaStationsDataResponse,
    NormalizedEnvironmentalRecord,
    ReviewableEnvironmentalAlert,
    SourceStatusItem,
)

