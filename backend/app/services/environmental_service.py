"""
RESQNET AI — Environmental Data Service (Open-Meteo Integration)

Fetches, normalizes, and caches public meteorological forecast data and GloFAS
river discharge models. Strictly provides model-derived environmental context
without triggering automated incident creation or modifying triage ranking.
"""

from datetime import datetime, timezone
import logging
from typing import Dict, List, Optional, Tuple
import httpx

from backend.app.core.config import settings
from backend.app.schemas.environmental import (
    CurrentWeatherMeasurement,
    EnvironmentalDataResponse,
    EnvironmentalLocation,
    FloodDischargeDay,
    FloodRiskContext,
    HourlyPrecipitationItem,
    PrecipitationSummary,
)

logger = logging.getLogger("RESQNET.EnvironmentalService")


class EnvironmentalValidationError(ValueError):
    """Raised when coordinates or request parameters fail validation bounds."""
    pass


class EnvironmentalProviderError(RuntimeError):
    """Raised when upstream meteorological provider times out or fails unexpectedly."""
    pass


# WMO Weather interpretation codes (WW)
WMO_CODE_MAP = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def get_weather_description(code: Optional[int]) -> str:
    """Translate WMO weather code to clear human-readable string."""
    if code is None:
        return "Unknown"
    return WMO_CODE_MAP.get(code, f"Weather Code {code}")


class EnvironmentalDataService:
    """
    Manages communication with Open-Meteo public APIs with TTL caching,
    coordinate validation, timeout guardrails, and graceful model degradation.
    """

    def __init__(self):
        # In-memory cache: (lat_rounded, lon_rounded) -> (cached_at_epoch, EnvironmentalDataResponse)
        self._cache: Dict[Tuple[float, float], Tuple[float, EnvironmentalDataResponse]] = {}

    def _cache_key(self, lat: float, lon: float) -> Tuple[float, float]:
        """Round coordinates to 4 decimal places (~11m spatial resolution) for cache matching."""
        return (round(lat, 4), round(lon, 4))

    def get_cached(self, lat: float, lon: float) -> Optional[EnvironmentalDataResponse]:
        """Retrieve unexpired cached response if available."""
        key = self._cache_key(lat, lon)
        if key in self._cache:
            cached_at, data = self._cache[key]
            now_epoch = datetime.now(timezone.utc).timestamp()
            if (now_epoch - cached_at) < settings.ENV_DATA_CACHE_TTL_SECONDS:
                # Return copy with is_cached=True
                return data.model_copy(update={"is_cached": True})
        return None

    def set_cached(self, lat: float, lon: float, data: EnvironmentalDataResponse):
        """Store freshly retrieved response in cache."""
        key = self._cache_key(lat, lon)
        now_epoch = datetime.now(timezone.utc).timestamp()
        self._cache[key] = (now_epoch, data)

    def clear_cache(self):
        """Clear all cached entries (primarily for testing)."""
        self._cache.clear()

    @staticmethod
    def validate_coordinates(latitude: Optional[float], longitude: Optional[float]) -> Tuple[float, float]:
        """
        Validate geographical coordinates.
        Latitude must be between -90 and 90; longitude must be between -180 and 180.
        """
        if latitude is None or longitude is None:
            raise EnvironmentalValidationError("Both latitude and longitude parameters are required.")

        try:
            lat = float(latitude)
            lon = float(longitude)
        except (ValueError, TypeError):
            raise EnvironmentalValidationError(f"Invalid coordinate format: latitude={latitude}, longitude={longitude}")

        if not (-90.0 <= lat <= 90.0):
            raise EnvironmentalValidationError(
                f"Latitude {lat} is out of valid bounds. Latitude must be between -90.0 and 90.0 degrees."
            )
        if not (-180.0 <= lon <= 180.0):
            raise EnvironmentalValidationError(
                f"Longitude {lon} is out of valid bounds. Longitude must be between -180.0 and 180.0 degrees."
            )

        return lat, lon

    async def fetch_weather_api(
        self,
        lat: float,
        lon: float,
        client: httpx.AsyncClient,
    ) -> dict:
        """
        Call Open-Meteo Weather Forecast API.
        Retrieves current conditions and hourly precipitation time series.
        """
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
            "hourly": "precipitation,rain,weather_code,temperature_2m",
            "forecast_days": 2,
            "timezone": "auto",
        }
        headers = {"User-Agent": "RESQNET-AI/1.0 (Emergency Coordination Platform)"}

        try:
            resp = await client.get(
                settings.OPEN_METEO_WEATHER_URL,
                params=params,
                headers=headers,
                timeout=settings.OPEN_METEO_TIMEOUT_SECONDS,
            )
            resp.raise_for_status()
            data = resp.json()
            if not isinstance(data, dict) or "current" not in data:
                raise EnvironmentalProviderError("Malformed response structure from Open-Meteo Weather API.")
            return data
        except httpx.TimeoutException as exc:
            logger.warning(f"Open-Meteo Weather API timed out for ({lat}, {lon}): {exc}")
            raise EnvironmentalProviderError(
                f"Weather provider request timed out after {settings.OPEN_METEO_TIMEOUT_SECONDS}s."
            ) from exc
        except httpx.HTTPStatusError as exc:
            logger.warning(f"Open-Meteo Weather API HTTP error {exc.response.status_code} for ({lat}, {lon})")
            raise EnvironmentalProviderError(
                f"Weather provider returned status code {exc.response.status_code}."
            ) from exc
        except (httpx.RequestError, ValueError) as exc:
            logger.warning(f"Open-Meteo Weather API request failed: {exc}")
            raise EnvironmentalProviderError(f"Failed to communicate with Open-Meteo Weather API: {exc}") from exc

    async def fetch_flood_api(
        self,
        lat: float,
        lon: float,
        client: httpx.AsyncClient,
    ) -> Optional[dict]:
        """
        Call Open-Meteo GloFAS Flood API.
        Retrieves 7-day river discharge forecast. Gracefully returns None if
        coordinate is away from GloFAS river grid cells or provider fails.
        """
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "river_discharge,river_discharge_mean,river_discharge_max",
            "forecast_days": 7,
        }
        headers = {"User-Agent": "RESQNET-AI/1.0 (Emergency Coordination Platform)"}

        try:
            resp = await client.get(
                settings.OPEN_METEO_FLOOD_URL,
                params=params,
                headers=headers,
                timeout=settings.OPEN_METEO_TIMEOUT_SECONDS,
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict) and "daily" in data:
                    return data
            logger.info(f"Open-Meteo Flood API returned status {resp.status_code} for ({lat}, {lon})")
            return None
        except Exception as exc:
            logger.info(f"Open-Meteo Flood API unavailable or timed out for ({lat}, {lon}): {exc}")
            return None

    async def get_environmental_data(
        self,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_name: Optional[str] = None,
        force_refresh: bool = False,
        client: Optional[httpx.AsyncClient] = None,
    ) -> EnvironmentalDataResponse:
        """
        Retrieve normalized environmental and hydrological model data.
        Defaults to Udupi, Karnataka when coordinates are omitted.
        """
        # Default to configured development reference location if omitted
        if latitude is None:
            latitude = settings.DEFAULT_ENV_LATITUDE
        if longitude is None:
            longitude = settings.DEFAULT_ENV_LONGITUDE

        # Validate coordinates strictly
        lat, lon = self.validate_coordinates(latitude, longitude)

        # Resolve location name
        if not location_name or not location_name.strip():
            if round(lat, 4) == round(settings.DEFAULT_ENV_LATITUDE, 4) and round(lon, 4) == round(settings.DEFAULT_ENV_LONGITUDE, 4):
                resolved_name = settings.DEFAULT_ENV_LOCATION_NAME
            else:
                resolved_name = f"Operational Sector ({lat:.4f}°N, {lon:.4f}°E)"
        else:
            resolved_name = location_name.strip()

        # Check Cache if force_refresh is not requested
        if not force_refresh:
            cached = self.get_cached(lat, lon)
            if cached:
                # Update location name if user provided explicit label
                if location_name and location_name.strip():
                    cached.location.name = resolved_name
                return cached

        # Fetch live data from upstream providers
        created_client = False
        if client is None:
            client = httpx.AsyncClient()
            created_client = True

        try:
            weather_raw = await self.fetch_weather_api(lat, lon, client)
            flood_raw = await self.fetch_flood_api(lat, lon, client)
        except (httpx.RequestError, httpx.HTTPError) as exc:
            logger.warning(f"Upstream provider communication failure for ({lat}, {lon}): {exc}")
            raise EnvironmentalProviderError(f"Upstream provider failure: {exc}") from exc
        finally:
            if created_client:
                await client.aclose()

        # Parse Weather Data
        current_raw = weather_raw.get("current", {})
        weather_code = current_raw.get("weather_code")
        current_measurement = CurrentWeatherMeasurement(
            temperature_c=current_raw.get("temperature_2m"),
            apparent_temperature_c=current_raw.get("apparent_temperature"),
            relative_humidity_pct=current_raw.get("relative_humidity_2m"),
            precipitation_mm=current_raw.get("precipitation"),
            rain_mm=current_raw.get("rain"),
            surface_pressure_hpa=current_raw.get("surface_pressure"),
            wind_speed_kmh=current_raw.get("wind_speed_10m"),
            wind_direction_deg=current_raw.get("wind_direction_10m"),
            wind_gusts_kmh=current_raw.get("wind_gusts_10m"),
            weather_code=weather_code,
            weather_description=get_weather_description(weather_code),
        )

        # Parse Hourly Precipitation
        hourly_raw = weather_raw.get("hourly", {})
        times = hourly_raw.get("time", [])
        precips = hourly_raw.get("precipitation", [])
        rains = hourly_raw.get("rain", [])
        temps = hourly_raw.get("temperature_2m", [])
        codes = hourly_raw.get("weather_code", [])

        hourly_items: List[HourlyPrecipitationItem] = []
        for i in range(min(len(times), 24)):  # Focus on next 24 hours
            p_val = float(precips[i]) if i < len(precips) and precips[i] is not None else 0.0
            r_val = float(rains[i]) if i < len(rains) and rains[i] is not None else 0.0
            t_val = float(temps[i]) if i < len(temps) and temps[i] is not None else None
            c_val = int(codes[i]) if i < len(codes) and codes[i] is not None else None
            hourly_items.append(
                HourlyPrecipitationItem(
                    time=times[i],
                    precipitation_mm=round(p_val, 2),
                    rain_mm=round(r_val, 2),
                    temperature_c=t_val,
                    weather_code=c_val,
                )
            )

        precip_vals = [item.precipitation_mm for item in hourly_items]
        current_hour_mm = precip_vals[0] if precip_vals else 0.0
        next_6h_total_mm = round(sum(precip_vals[:6]), 2) if precip_vals else 0.0
        next_24h_total_mm = round(sum(precip_vals[:24]), 2) if precip_vals else 0.0
        max_hourly_rate_mm = round(max(precip_vals), 2) if precip_vals else 0.0

        precipitation_summary = PrecipitationSummary(
            current_hour_mm=current_hour_mm,
            next_6h_total_mm=next_6h_total_mm,
            next_24h_total_mm=next_24h_total_mm,
            max_hourly_rate_mm=max_hourly_rate_mm,
            hourly=hourly_items,
        )

        # Parse GloFAS River Discharge
        if flood_raw and "daily" in flood_raw:
            daily_raw = flood_raw["daily"]
            f_dates = daily_raw.get("time", [])
            f_discharge = daily_raw.get("river_discharge", [])
            f_mean = daily_raw.get("river_discharge_mean", [])
            f_max = daily_raw.get("river_discharge_max", [])

            flood_days: List[FloodDischargeDay] = []
            for i in range(min(len(f_dates), 7)):
                d_val = float(f_discharge[i]) if i < len(f_discharge) and f_discharge[i] is not None else None
                m_val = float(f_mean[i]) if i < len(f_mean) and f_mean[i] is not None else None
                mx_val = float(f_max[i]) if i < len(f_max) and f_max[i] is not None else None
                flood_days.append(
                    FloodDischargeDay(
                        date=f_dates[i],
                        river_discharge_m3s=round(d_val, 2) if d_val is not None else None,
                        river_discharge_mean_m3s=round(m_val, 2) if m_val is not None else None,
                        river_discharge_max_m3s=round(mx_val, 2) if mx_val is not None else None,
                    )
                )

            valid_discharges = [d.river_discharge_m3s for d in flood_days if d.river_discharge_m3s is not None]
            valid_maxes = [d.river_discharge_max_m3s for d in flood_days if d.river_discharge_max_m3s is not None]

            flood_context = FloodRiskContext(
                available=True,
                model_source="GloFAS v4 / ECMWF via Open-Meteo Flood API",
                current_discharge_m3s=valid_discharges[0] if valid_discharges else None,
                forecast_max_discharge_m3s=max(valid_maxes) if valid_maxes else (max(valid_discharges) if valid_discharges else None),
                daily_forecast=flood_days,
                notes="GloFAS 5km grid model projection for closest river reach. Values represent simulated flow volume.",
            )
        else:
            flood_context = FloodRiskContext(
                available=False,
                model_source="GloFAS v4 / ECMWF via Open-Meteo Flood API",
                current_discharge_m3s=None,
                forecast_max_discharge_m3s=None,
                daily_forecast=[],
                notes="No major GloFAS river grid cell identified within local 5km threshold, or hydrological model feed offline.",
            )

        now_utc = datetime.now(timezone.utc).isoformat()
        response = EnvironmentalDataResponse(
            provider="Open-Meteo",
            provider_attribution="Weather data by Open-Meteo.com (CC-BY 4.0); River discharge by GloFAS / ECMWF.",
            provider_url="https://open-meteo.com/",
            data_nature="model_derived",
            is_cached=False,
            cached_at=now_utc,
            retrieval_timestamp=now_utc,
            observation_model_timestamp=current_raw.get("time"),
            location=EnvironmentalLocation(
                name=resolved_name,
                latitude=lat,
                longitude=lon,
                elevation_m=weather_raw.get("elevation"),
                timezone=weather_raw.get("timezone"),
            ),
            current=current_measurement,
            precipitation=precipitation_summary,
            flood_risk=flood_context,
            disclaimer="Public meteorological and hydrological model data for operational awareness only. "
                       "Does NOT trigger automated incident creation or replace verified civilian ground reports.",
        )

        # Cache response
        self.set_cached(lat, lon, response)
        return response


# Shared singleton instance
environmental_service = EnvironmentalDataService()
