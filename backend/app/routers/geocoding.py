"""
RESQNET AI — Geocoding Router

Provides search endpoints for resolving vague or colloquial location descriptions into coordinates.
Offline-first: Checks the verified Indian disaster gazetteer first.
Online fallback: OpenStreetMap Nominatim with strict rate-limiting (<=1 req/sec),
custom User-Agent, attribution, and in-memory caching.
"""

from fastapi import APIRouter, Query
from backend.app.schemas.geocoding import GeocodingSearchResponse, LocationCandidate
from backend.app.services.geocoding_service import search_location_candidates

router = APIRouter(prefix="/geocoding", tags=["Geocoding"])


@router.get("/search", response_model=GeocodingSearchResponse)
def search_location_endpoint(
    query: str = Query(..., min_length=1, description="Location name, landmark, or sector to geocode"),
    limit: int = Query(5, ge=1, le=10, description="Maximum number of candidates to return"),
    allow_online: bool = Query(True, description="Whether to query OSM Nominatim fallback if gazetteer has no exact match"),
):
    """
    Search candidate coordinates for a given location or landmark.
    
    Compliance & Safety:
    - Never geocodes on keystroke. Requires explicit search invocation.
    - OpenStreetMap Nominatim compliance: <= 1 req/sec rate limit, custom User-Agent, attribution.
    - In-memory 24-hour TTL caching for repeated queries.
    - Offline Indian gazetteer checked first (instant, 0 network, high reliability).
    """
    res = search_location_candidates(query=query, limit=limit, allow_online=allow_online)
    
    candidates = [
        LocationCandidate(
            display_name=c["display_name"],
            latitude=c["latitude"],
            longitude=c["longitude"],
            provider=c["provider"],
            confidence=c.get("confidence", 1.0),
            match_type=c.get("match_type", "exact"),
            state=c.get("state"),
            attribution=c.get("attribution", "Data © OpenStreetMap contributors, ODbL"),
        )
        for c in res.get("candidates", [])
    ]
    
    return GeocodingSearchResponse(
        query=res["query"],
        candidates=candidates,
        total_candidates=len(candidates),
        provider=res.get("provider", "offline_indian_gazetteer"),
        attribution=res.get("attribution", "Data © OpenStreetMap contributors, ODbL"),
        is_ambiguous=res.get("is_ambiguous", False),
        cached=res.get("cached", False),
        provider_status=res.get("provider_status", "SUCCESS"),
    )
