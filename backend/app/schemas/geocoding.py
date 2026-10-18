"""
RESQNET AI — Schemas for Geocoding Candidates, Nominatim Compliance, and Location Confirmation
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class LocationCandidate(BaseModel):
    display_name: str = Field(description="Formatted location name.")
    latitude: float = Field(ge=-90.0, le=90.0, description="WGS84 latitude coordinate.")
    longitude: float = Field(ge=-180.0, le=180.0, description="WGS84 longitude coordinate.")
    provider: str = Field(description="offline_indian_gazetteer | osm_nominatim | user_supplied")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Matching confidence score.")
    match_type: str = Field(default="exact", description="exact | alias | substring | nominatim_result")
    state: Optional[str] = Field(default=None, description="State or administrative region if available.")
    attribution: str = Field(default="Data © OpenStreetMap contributors, ODbL", description="Mandatory attribution statement.")


class GeocodingSearchResponse(BaseModel):
    query: str
    candidates: List[LocationCandidate] = Field(default_factory=list)
    total_candidates: int = 0
    provider: str = "offline_indian_gazetteer"
    attribution: str = "Data © OpenStreetMap contributors, ODbL"
    is_ambiguous: bool = False
    cached: bool = False
    provider_status: str = "SUCCESS"


class LocationConfirmationRequest(BaseModel):
    coordinates: List[float] = Field(description="[latitude, longitude] selected or corrected by officer.")
    locationName: Optional[str] = Field(default=None, description="Optional updated landmark or spot name.")
    sector: Optional[str] = Field(default=None, description="Optional updated sector.")
    confirmationStatus: str = Field(
        default="officer_confirmed",
        description="officer_confirmed | manual_correction"
    )
    operator: str = Field(default="Coordinator Jordan Davis", description="Officer performing the confirmation.")
    reason: str = Field(
        default="Location confirmed after candidate review",
        description="Operational justification for location confirmation."
    )
