"""
RESQNET AI — Environmental Data Router (Open-Meteo Integration)

Exposes endpoints for querying public meteorological and hydrological context
from Open-Meteo. Enforces bounds validation, caching, and clear operational disclaimers.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.environmental import (
    EnvironmentalDataResponse,
    IndiaStationsDataResponse,
)
from backend.app.services.environmental_service import (
    EnvironmentalProviderError,
    EnvironmentalValidationError,
    environmental_service,
)

logger = logging.getLogger("RESQNET.EnvironmentalRouter")

router = APIRouter(prefix="/environmental-data", tags=["Environmental Data"])


@router.get(
    "",
    response_model=EnvironmentalDataResponse,
    status_code=status.HTTP_200_OK,
    summary="Get public environmental conditions (Open-Meteo)",
    description=(
        "Retrieves public meteorological forecast variables and GloFAS river discharge projections "
        "for operational awareness. Defaults to Udupi, Karnataka (13.3409, 74.7421) if coordinates are omitted.\n\n"
        "**Operational Notice:** All metrics are model-derived numerical forecasts and do NOT "
        "constitute localized physical sensor alarms or automated incident verification."
    ),
)
async def get_environmental_data(
    latitude: Optional[float] = Query(
        default=None,
        description="Geographical latitude in WGS84 decimal degrees (-90.0 to 90.0). Defaults to 13.3409 (Udupi).",
    ),
    longitude: Optional[float] = Query(
        default=None,
        description="Geographical longitude in WGS84 decimal degrees (-180.0 to 180.0). Defaults to 74.7421 (Udupi).",
    ),
    location_name: Optional[str] = Query(
        default=None,
        description="Optional human-readable label for the operational sector or monitoring post.",
    ),
    force_refresh: bool = Query(
        default=False,
        description="Bypass backend in-memory TTL cache and force a live upstream fetch from Open-Meteo.",
    ),
):
    try:
        data = await environmental_service.get_environmental_data(
            latitude=latitude,
            longitude=longitude,
            location_name=location_name,
            force_refresh=force_refresh,
        )
        return data
    except EnvironmentalValidationError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except EnvironmentalProviderError as prov_err:
        logger.error(f"Environmental provider failure: {prov_err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Environmental data provider unavailable: {prov_err}",
        )
    except Exception as exc:
        logger.exception(f"Unexpected error retrieving environmental data: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error processing environmental conditions: {exc}",
        )


@router.get(
    "/india-stations",
    response_model=IndiaStationsDataResponse,
    status_code=status.HTTP_200_OK,
    summary="Get official India meteorological and hydrological station telemetry (IMD & NWDP/CWC)",
    description=(
        "Retrieves normalized weather and river monitoring station records from official Indian sources: "
        "India Meteorological Department (IMD) AWS/observatories and Central Water Commission (CWC) telemetry via NWDP.\n\n"
        "**Provenance Notice:** NWDP telemetry records are official published sensor archives (up to late 2025). "
        "IMD observations require API key and JWT authentication. Simulated demonstration records are clearly labelled."
    ),
)
async def get_india_stations(
    measurement_type: Optional[str] = Query(
        default=None,
        description="Filter by measurement type: 'all', 'water_level', 'rainfall', 'river_discharge', 'temperature'.",
    ),
    state: Optional[str] = Query(
        default=None,
        description="Filter by Indian State / UT name (e.g. 'Karnataka', 'Jharkhand', 'Andhra Pradesh').",
    ),
    basin: Optional[str] = Query(
        default=None,
        description="Filter by river basin (e.g. 'Subernarekha', 'Brahmaputra').",
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
        description="Maximum number of normalized records to return.",
    ),
    force_refresh: bool = Query(
        default=False,
        description="Bypass backend in-memory TTL cache and re-query upstream sources.",
    ),
):
    try:
        from backend.app.services.india_environmental_service import india_environmental_service
        return await india_environmental_service.get_india_stations_data(
            measurement_type=measurement_type,
            state=state,
            basin=basin,
            limit=limit,
            force_refresh=force_refresh,
        )
    except Exception as exc:
        logger.exception(f"Failed to retrieve India stations data: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving India station telemetry: {exc}",
        )


@router.get(
    "/alerts",
    response_model=list,
    status_code=status.HTTP_200_OK,
    summary="Get reviewable situational environmental alerts",
    description=(
        "Generates reviewable hydrological and meteorological alerts (rainfall exceedance, river surges) "
        "for the Lead Operations Coordinator. Alerts do NOT automatically verify incidents."
    ),
)
async def get_environmental_alerts():
    try:
        from backend.app.services.india_environmental_service import india_environmental_service
        data = await india_environmental_service.get_india_stations_data()
        return data.alerts
    except Exception as exc:
        logger.exception(f"Failed to generate environmental alerts: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating situational alerts: {exc}",
        )


@router.get(
    "/sources-status",
    response_model=list,
    status_code=status.HTTP_200_OK,
    summary="Get verification and access audit of all environmental data sources",
    description="Audits the upstream connection, authentication requirements, and data freshness across IMD, NWDP/CWC, and Open-Meteo.",
)
async def get_sources_status():
    try:
        from backend.app.services.india_environmental_service import india_environmental_service
        return await india_environmental_service.get_sources_status()
    except Exception as exc:
        logger.exception(f"Failed to audit environmental sources status: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking environmental sources: {exc}",
        )

