"""
RESQNET AI — Verified Indian Geographic Dataset and Geocoding Service

Provides safe, deterministic location matching for Indian cities, districts,
state capitals, disaster-prone regions (floods, cyclones, landslides, seismic zones),
and landmarks across India.

Features:
- Offline verified Indian gazetteer (100+ disaster-relevant places with coordinates).
- Alias resolution (e.g. Bangalore -> Bengaluru, Bombay -> Mumbai, Cochin -> Kochi).
- Token and substring matching against location names and sectors.
- Fallback to safe unknown coordinates (None) when no match is found.
- Explicit labeling of user-supplied vs geocoded vs synthetic demo coordinates.
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple, Union

logger = logging.getLogger("RESQNET.Geocoding")

# Verified coordinates [latitude, longitude] for Indian places
# Coordinates sourced from official Survey of India / OpenStreetMap geographic centroids
INDIAN_GAZETTEER: Dict[str, Dict[str, Union[List[float], str, List[str]]]] = {
    # Major Metros & Capital Hubs
    "new delhi": {
        "coords": [28.6139, 77.2090],
        "state": "Delhi",
        "aliases": ["delhi", "ncr", "national capital region", "connaught place", "dwarka", "rohini"]
    },
    "mumbai": {
        "coords": [19.0760, 72.8777],
        "state": "Maharashtra",
        "aliases": ["bombay", "mumbai city", "navi mumbai", "bandra", "andheri", "dadar", "kurla", "colaba", "worli"]
    },
    "bengaluru": {
        "coords": [12.9716, 77.5946],
        "state": "Karnataka",
        "aliases": ["bangalore", "whitefield", "indiranagar", "koramangala", "electronic city", "jayanagar", "hebbal"]
    },
    "kolkata": {
        "coords": [22.5726, 88.3639],
        "state": "West Bengal",
        "aliases": ["calcutta", "howrah", "salt lake", "new town", "alipore", "dum dum", "park street"]
    },
    "chennai": {
        "coords": [13.0827, 80.2707],
        "state": "Tamil Nadu",
        "aliases": ["madras", "adyar", "t nagar", "velachery", "mylapore", "anna nagar", "guindy", "tambaram"]
    },
    "hyderabad": {
        "coords": [17.3850, 78.4867],
        "state": "Telangana",
        "aliases": ["secunderabad", "cyberabad", "gachibowli", "hitec city", "jubilee hills", "banjara hills", "charminar"]
    },
    "ahmedabad": {
        "coords": [23.0225, 72.5714],
        "state": "Gujarat",
        "aliases": ["amdavad", "maninagar", "satellite", "navrangpura", "sabarmati", "bopal"]
    },
    "pune": {
        "coords": [18.5204, 73.8567],
        "state": "Maharashtra",
        "aliases": ["poona", "kothrud", "wakad", "hinjewadi", "viman nagar", "hadapsar", "baner", "shivajinagar"]
    },

    # Flood / Landslide Prone Himalayan & Hill Zones
    "wayanad": {
        "coords": [11.6854, 76.1320],
        "state": "Kerala",
        "aliases": ["chooralmala", "mundakkai", "meppadi", "kalpetta", "sulthan bathery", "mananthavady"]
    },
    "joshimath": {
        "coords": [30.5574, 79.5663],
        "state": "Uttarakhand",
        "aliases": ["chamoli", "jyotirmath", "dhauliganga", "rishi ganga"]
    },
    "kedarnath": {
        "coords": [30.7352, 79.0669],
        "state": "Uttarakhand",
        "aliases": ["rudraprayag", "mandakini valley", "gaurikund", "rambara"]
    },
    "badrinath": {
        "coords": [30.7433, 79.4938],
        "state": "Uttarakhand",
        "aliases": ["alknanda valley", "mana village"]
    },
    "uttarkashi": {
        "coords": [30.7268, 78.4354],
        "state": "Uttarakhand",
        "aliases": ["bhagirathi valley", "dharasu", "barkot"]
    },
    "dehradun": {
        "coords": [30.3165, 78.0322],
        "state": "Uttarakhand",
        "aliases": ["doon valley", "rajpur", "clementine town", "rishikesh", "haridwar"]
    },
    "shimla": {
        "coords": [31.1048, 77.1734],
        "state": "Himachal Pradesh",
        "aliases": ["simla", "kufri", "mashobra", "chotta shimla", "sanjauli"]
    },
    "kullu": {
        "coords": [31.9579, 77.1095],
        "state": "Himachal Pradesh",
        "aliases": ["kullu valley", "bhuntar", "beas valley"]
    },
    "manali": {
        "coords": [32.2432, 77.1892],
        "state": "Himachal Pradesh",
        "aliases": ["solang valley", "rohtang", "old manali"]
    },
    "mandi": {
        "coords": [31.7087, 76.9320],
        "state": "Himachal Pradesh",
        "aliases": ["pandoh", "aut", "sundernagar"]
    },
    "dharamshala": {
        "coords": [32.2190, 76.3234],
        "state": "Himachal Pradesh",
        "aliases": ["dharamsala", "mcleodganj", "kangra"]
    },
    "srinagar": {
        "coords": [34.0837, 74.7973],
        "state": "Jammu and Kashmir",
        "aliases": ["dal lake", "lal chowk", "dalgate", "rajbagh", "jhelum valley"]
    },
    "leh": {
        "coords": [34.1526, 77.5771],
        "state": "Ladakh",
        "aliases": ["ladakh", "khardung la", "choglamsar", "nubra"]
    },
    "jammu": {
        "coords": [32.7266, 74.8570],
        "state": "Jammu and Kashmir",
        "aliases": ["tawi valley", "katra", "udhampur"]
    },

    # Coastal & Cyclone-Prone Eastern & Western Belts
    "bhubaneswar": {
        "coords": [20.2961, 85.8245],
        "state": "Odisha",
        "aliases": ["khordha", "patia", "saheed nagar", "jaydev vihar"]
    },
    "cuttack": {
        "coords": [20.4625, 85.8828],
        "state": "Odisha",
        "aliases": ["mahanadi delta", "badambadi", "choudwar"]
    },
    "puri": {
        "coords": [19.8135, 85.8312],
        "state": "Odisha",
        "aliases": ["swargadwar", "sea beach puri", "konark"]
    },
    "visakhapatnam": {
        "coords": [17.6868, 83.2185],
        "state": "Andhra Pradesh",
        "aliases": ["vizag", "waltair", "gajuwaka", "rushikonda", "rk beach"]
    },
    "vijayawada": {
        "coords": [16.5062, 80.6480],
        "state": "Andhra Pradesh",
        "aliases": ["bezawada", "krishna river delta", "kanuru", "benz circle"]
    },
    "kochi": {
        "coords": [9.9312, 76.2673],
        "state": "Kerala",
        "aliases": ["cochin", "ernakulam", "edapally", "kakkanad", "fort kochi", "mattancherry"]
    },
    "thiruvananthapuram": {
        "coords": [8.5241, 76.9366],
        "state": "Kerala",
        "aliases": ["trivandrum", "technopark", "kowdiar", "kazhakkoottam", "vizhinjam"]
    },
    "alappuzha": {
        "coords": [9.4981, 76.3388],
        "state": "Kerala",
        "aliases": ["alleppey", "kuttanad", "vembanad"]
    },
    "surat": {
        "coords": [21.1702, 72.8311],
        "state": "Gujarat",
        "aliases": ["tapti river", "adajan", "varachha", "katargam"]
    },
    "bhuj": {
        "coords": [23.2420, 69.6669],
        "state": "Gujarat",
        "aliases": ["kutch", "kachchh", "anjar", "gandhidham", "mandvi"]
    },

    # North-East Flash Flood & Landslide Regions
    "guwahati": {
        "coords": [26.1445, 91.7362],
        "state": "Assam",
        "aliases": ["brahmaputra valley", "dispur", "jalukbari", "paltan bazaar", "chandmari"]
    },
    "silchar": {
        "coords": [24.8333, 92.7789],
        "state": "Assam",
        "aliases": ["barak valley", "cachar"]
    },
    "dibrugarh": {
        "coords": [27.4728, 94.9120],
        "state": "Assam",
        "aliases": ["upper assam", "brahmaputra bank"]
    },
    "shillong": {
        "coords": [25.5788, 91.8933],
        "state": "Meghalaya",
        "aliases": ["khasi hills", "police bazaar", "cherrapunji", "sohra"]
    },
    "gangtok": {
        "coords": [27.3389, 88.6065],
        "state": "Sikkim",
        "aliases": ["east sikkim", "teesta valley", "deorali"]
    },
    "imphal": {
        "coords": [24.8170, 93.9368],
        "state": "Manipur",
        "aliases": ["kangla", "imphal west", "imphal east"]
    },

    # Major Inland Regional Centers
    "jaipur": {
        "coords": [26.9124, 75.7873],
        "state": "Rajasthan",
        "aliases": ["pink city", "mansarovar", "vaishali nagar", "malviya nagar", "amer"]
    },
    "jodhpur": {
        "coords": [26.2389, 73.0243],
        "state": "Rajasthan",
        "aliases": ["marwar", "sardarpura", "ratanada"]
    },
    "lucknow": {
        "coords": [26.8467, 80.9462],
        "state": "Uttar Pradesh",
        "aliases": ["gomti nagar", "hazratganj", "alambagh", "indira nagar"]
    },
    "kanpur": {
        "coords": [26.4499, 80.3319],
        "state": "Uttar Pradesh",
        "aliases": ["ganga nagar", "kalyanpur", "civil lines kanpur"]
    },
    "varanasi": {
        "coords": [25.3176, 82.9739],
        "state": "Uttar Pradesh",
        "aliases": ["benares", "kashi", "dashashwamedh", "sigra", "bhu campus"]
    },
    "prayagraj": {
        "coords": [25.4358, 81.8463],
        "state": "Uttar Pradesh",
        "aliases": ["allahabad", "sangam", "civil lines allahabad", "georgetown"]
    },
    "patna": {
        "coords": [25.5941, 85.1376],
        "state": "Bihar",
        "aliases": ["kankarbagh", "boring road", "patliputra", "danapur", "gandhi maidan"]
    },
    "bhopal": {
        "coords": [23.2599, 77.4126],
        "state": "Madhya Pradesh",
        "aliases": ["mp nagar", "arera colony", "upper lake bhopal"]
    },
    "indore": {
        "coords": [22.7196, 75.8577],
        "state": "Madhya Pradesh",
        "aliases": ["vijay nagar", "palasia", "rajwada"]
    },
    "nagpur": {
        "coords": [21.1458, 79.0882],
        "state": "Maharashtra",
        "aliases": ["dharampeth", "sitabuldi", "wardha road"]
    },
    "chandigarh": {
        "coords": [30.7333, 76.7794],
        "state": "Chandigarh",
        "aliases": ["sector 17 chandigarh", "mohali", "panchkula", "tricity"]
    },
    "ranchi": {
        "coords": [23.3441, 85.3096],
        "state": "Jharkhand",
        "aliases": ["doranda", "morabadi", "harmu"]
    },
    "raipur": {
        "coords": [21.2514, 81.6296],
        "state": "Chhattisgarh",
        "aliases": ["pandri", "shankar nagar", "telibandha"]
    },
    "panaji": {
        "coords": [15.4909, 73.8278],
        "state": "Goa",
        "aliases": ["panjim", "miramar", "fontainhas", "mandovi river"]
    },
    "port blair": {
        "coords": [11.6234, 92.7265],
        "state": "Andaman and Nicobar Islands",
        "aliases": ["andaman", "nicobar", "south andaman", "havelock"]
    }
}


def normalize_place_name(text: Optional[str]) -> str:
    """Normalize text for consistent gazetteer lookup."""
    if not text:
        return ""
    cleaned = text.lower()
    # Remove common filler terms
    cleaned = re.sub(r"\b(district|zone|sector|area|region|city|subdivision|near|at|in|road|street|expressway|station|bridge|underpass)\b", " ", cleaned)
    # Remove punctuation & extra spaces
    cleaned = re.sub(r"[^\w\s]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def match_indian_place(
    location_name: Optional[str],
    sector: Optional[str] = None
) -> Optional[Tuple[List[float], str, str]]:
    """
    Safely match a location name or sector string against the verified Indian gazetteer.

    Returns:
        Optional[Tuple[coordinates, matched_canonical_name, state]]
        or None if no confident match is found.
    """
    search_texts = []
    if location_name and location_name.strip():
        search_texts.append(location_name.strip())
    if sector and sector.strip():
        search_texts.append(sector.strip())

    if not search_texts:
        return None

    # Full combined text and normalized queries
    combined_raw = " ".join(search_texts)
    norm_combined = normalize_place_name(combined_raw)

    # 1. Exact canonical name match
    for place, data in INDIAN_GAZETTEER.items():
        if place in norm_combined or norm_combined == place:
            logger.info(f"Geocoded '{combined_raw}' -> Canonical Match '{place}' ({data['state']})")
            return list(data["coords"]), place.title(), str(data["state"])

    # 2. Alias match
    for place, data in INDIAN_GAZETTEER.items():
        aliases = data.get("aliases", [])
        for alias in aliases:
            # Word boundary check for short aliases
            pattern = rf"\b{re.escape(alias.lower())}\b"
            if re.search(pattern, combined_raw.lower()) or re.search(pattern, norm_combined):
                logger.info(f"Geocoded '{combined_raw}' -> Alias '{alias}' -> '{place}' ({data['state']})")
                return list(data["coords"]), place.title(), str(data["state"])

    # No confident Indian location match found
    return None


import json
import socket
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_USER_AGENT = "RESQNET-AI-Disaster-Coordination/1.0 (contact: admin@resqnet.local)"
OSM_ATTRIBUTION = "Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright"

_nominatim_lock = threading.Lock()
_last_nominatim_request_time = 0.0

# In-memory query cache: query -> (candidates, timestamp)
_geocoding_cache: Dict[str, Tuple[List[Dict[str, Any]], float]] = {}
CACHE_TTL_SECONDS = 86400.0  # 24 hours


def clear_geocoding_cache() -> None:
    """Clear in-memory geocoding cache (useful for testing)."""
    global _geocoding_cache
    _geocoding_cache.clear()


def validate_coordinates(coords: Any) -> Tuple[bool, Optional[str]]:
    """
    Validate that coords is a 2-element sequence with float latitude in [-90, 90]
    and float longitude in [-180, 180].
    """
    if coords is None:
        return False, "Coordinates cannot be None"
    if not isinstance(coords, (list, tuple)) or len(coords) != 2:
        return False, "Coordinates must be a list or tuple of [latitude, longitude]"
    if coords[0] is None or coords[1] is None:
        return False, "Latitude and longitude cannot be None"
    try:
        lat = float(coords[0])
        lng = float(coords[1])
    except (ValueError, TypeError):
        return False, "Latitude and longitude must be valid floating point numbers"

    if not (-90.0 <= lat <= 90.0):
        return False, f"Latitude {lat} is out of bounds (must be between -90.0 and 90.0)"
    if not (-180.0 <= lng <= 180.0):
        return False, f"Longitude {lng} is out of bounds (must be between -180.0 and 180.0)"

    return True, None


def _rate_limit_nominatim() -> None:
    """Enforce OpenStreetMap Nominatim 1 request per second usage policy."""
    global _last_nominatim_request_time
    with _nominatim_lock:
        now = time.monotonic()
        elapsed = now - _last_nominatim_request_time
        if elapsed < 1.05:  # 1.05s buffer to strictly adhere to <= 1 req/sec
            sleep_needed = 1.05 - elapsed
            time.sleep(sleep_needed)
        _last_nominatim_request_time = time.monotonic()


def search_nominatim(query: str, limit: int = 5) -> Tuple[List[Dict[str, Any]], str]:
    """
    Search OpenStreetMap Nominatim with strict usage policy compliance.
    Returns (candidates, status).
    """
    if not query or not query.strip():
        return [], "EMPTY_QUERY"

    _rate_limit_nominatim()

    headers = {
        "User-Agent": NOMINATIM_USER_AGENT,
        "Accept": "application/json",
    }
    params = {
        "q": query.strip(),
        "format": "json",
        "limit": min(limit, 10),
        "addressdetails": 1,
    }

    try:
        url = f"{NOMINATIM_BASE_URL}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=4.0) as response:
            if response.status != 200:
                logger.warning(f"Nominatim returned HTTP {response.status}")
                return [], f"HTTP_{response.status}"
            raw_data = json.loads(response.read().decode("utf-8"))
            if not isinstance(raw_data, list):
                return [], "MALFORMED_RESPONSE"

            candidates = []
            for item in raw_data:
                try:
                    lat = float(item["lat"])
                    lng = float(item["lon"])
                    is_valid, _ = validate_coordinates([lat, lng])
                    if not is_valid:
                        continue
                    disp = item.get("display_name", "").strip()
                    importance = float(item.get("importance", 0.5))
                    match_type = item.get("type", "administrative")

                    candidates.append({
                        "display_name": disp,
                        "latitude": round(lat, 5),
                        "longitude": round(lng, 5),
                        "provider": "osm_nominatim",
                        "confidence": round(min(1.0, max(0.1, importance)), 2),
                        "match_type": match_type,
                        "state": item.get("address", {}).get("state"),
                        "attribution": OSM_ATTRIBUTION,
                    })
                except (KeyError, ValueError, TypeError):
                    continue
            return candidates, "SUCCESS"
    except urllib.error.HTTPError as e:
        logger.warning(f"Nominatim HTTP Error: {e.code}")
        return [], f"HTTP_ERROR_{e.code}"
    except (urllib.error.URLError, TimeoutError, socket.timeout) as e:
        logger.warning(f"Nominatim Network Timeout/Error: {e}")
        return [], "NETWORK_TIMEOUT"
    except Exception as e:
        logger.warning(f"Nominatim Unexpected Error: {e}")
        return [], "UNEXPECTED_ERROR"


def search_location_candidates(
    query: str,
    limit: int = 5,
    allow_online: bool = True,
) -> Dict[str, Any]:
    """
    Search location candidates across offline Indian gazetteer and OSM Nominatim.
    Complies with OSM Nominatim usage limits and caches repeated queries.
    """
    clean_query = (query or "").strip()
    if not clean_query:
        return {
            "query": "",
            "candidates": [],
            "total_candidates": 0,
            "provider": "none",
            "attribution": OSM_ATTRIBUTION,
            "is_ambiguous": False,
            "cached": False,
            "provider_status": "EMPTY_QUERY",
        }

    norm_key = normalize_place_name(clean_query)
    now = time.monotonic()

    # 1. Check in-memory query cache
    if norm_key in _geocoding_cache:
        cached_candidates, cached_time = _geocoding_cache[norm_key]
        if (now - cached_time) < CACHE_TTL_SECONDS:
            return {
                "query": clean_query,
                "candidates": cached_candidates[:limit],
                "total_candidates": len(cached_candidates),
                "provider": cached_candidates[0]["provider"] if cached_candidates else "cached",
                "attribution": OSM_ATTRIBUTION,
                "is_ambiguous": len(cached_candidates) > 1,
                "cached": True,
                "provider_status": "CACHE_HIT",
            }

    candidates: List[Dict[str, Any]] = []
    seen_coords = set()

    # 2. Offline Indian Gazetteer Search (Deterministic, instant, 0 network)
    for place, data in INDIAN_GAZETTEER.items():
        coords = [float(data["coords"][0]), float(data["coords"][1])]
        coord_key = (round(coords[0], 4), round(coords[1], 4))

        # Check canonical match
        if place == norm_key or norm_key in place or place in norm_key:
            conf = 1.0 if place == norm_key else 0.85
            match_t = "exact" if place == norm_key else "substring"
            disp = f"{place.title()}, {data['state']}, India"
            candidates.append({
                "display_name": disp,
                "latitude": coords[0],
                "longitude": coords[1],
                "provider": "offline_indian_gazetteer",
                "confidence": conf,
                "match_type": match_t,
                "state": str(data["state"]),
                "attribution": "RESQNET Verified Indian Disaster Gazetteer",
            })
            seen_coords.add(coord_key)
            continue

        # Check alias match
        for alias in data.get("aliases", []):
            alias_lower = alias.lower()
            if alias_lower == norm_key or alias_lower in norm_key:
                disp = f"{alias.title()} ({place.title()}), {data['state']}, India"
                candidates.append({
                    "display_name": disp,
                    "latitude": coords[0],
                    "longitude": coords[1],
                    "provider": "offline_indian_gazetteer",
                    "confidence": 0.90 if alias_lower == norm_key else 0.80,
                    "match_type": "alias",
                    "state": str(data["state"]),
                    "attribution": "RESQNET Verified Indian Disaster Gazetteer",
                })
                seen_coords.add(coord_key)
                break

    provider_status = "GAZETTEER_MATCH" if candidates else "NO_GAZETTEER_MATCH"

    # 3. OpenStreetMap Nominatim Fallback (if gazetteer has no exact match or online allowed)
    if allow_online and len(candidates) < limit:
        nominatim_candidates, nom_status = search_nominatim(clean_query, limit=limit)
        provider_status = f"{provider_status}+{nom_status}"
        for nc in nominatim_candidates:
            coord_key = (round(nc["latitude"], 4), round(nc["longitude"], 4))
            if coord_key not in seen_coords:
                candidates.append(nc)
                seen_coords.add(coord_key)

    # Sort descending by confidence
    candidates.sort(key=lambda c: c.get("confidence", 0.0), reverse=True)
    final_candidates = candidates[:limit]

    # Store in memory cache
    if len(_geocoding_cache) >= 500:
        # Clear oldest entries if cache exceeds 500
        oldest_key = min(_geocoding_cache, key=lambda k: _geocoding_cache[k][1])
        _geocoding_cache.pop(oldest_key, None)
    _geocoding_cache[norm_key] = (final_candidates, now)

    primary_provider = final_candidates[0]["provider"] if final_candidates else "none"

    return {
        "query": clean_query,
        "candidates": final_candidates,
        "total_candidates": len(final_candidates),
        "provider": primary_provider,
        "attribution": OSM_ATTRIBUTION,
        "is_ambiguous": len(final_candidates) > 1,
        "cached": False,
        "provider_status": provider_status,
    }


def is_synthetic_sf_coordinate(coords: Optional[List[float]]) -> bool:
    """
    Check if coordinates fall inside the synthetic demo San Francisco simulation bounding box.
    SF bounding box roughly: Lat [37.6, 37.9], Lng [-122.6, -122.3].
    """
    if not coords or not isinstance(coords, (list, tuple)) or len(coords) != 2:
        return False
    lat, lng = coords[0], coords[1]
    if lat is None or lng is None:
        return False
    try:
        lat_f = float(lat)
        lng_f = float(lng)
        return (37.6 <= lat_f <= 37.9) and (-122.6 <= lng_f <= -122.3)
    except (ValueError, TypeError):
        return False


def get_resolution_status_for_source(location_source: Optional[str], coords: Optional[List[float]]) -> str:
    """Return standardized location_resolution_status based on source and coordinate presence."""
    if not coords or coords[0] is None or coords[1] is None:
        if location_source == "unresolved_ambiguous":
            return "unresolved_ambiguous"
        return "unknown"
    if not location_source:
        return "unknown"
    if location_source == "user_supplied":
        return "user_manual"
    if "officer_confirmed" in location_source or "manual_correction" in location_source:
        return "candidate_selected"
    if "geocoded" in location_source:
        return "resolved_verified"
    if "synthetic_demo" in location_source:
        return "synthetic_demo"
    return "resolved_verified"


def resolve_incident_coordinates(
    supplied_coords: Optional[List[float]],
    location_name: Optional[str] = None,
    sector: Optional[str] = None,
    explicit_synthetic_flag: Optional[bool] = None,
    allow_online: bool = False,
) -> Tuple[Optional[List[float]], bool, str]:
    """
    Resolve coordinates cleanly according to priority:
    1. If actual user-supplied coordinates are provided (and not the legacy default random SF placeholder),
       preserve them faithfully!
    2. Try matching against named Indian places gazetteer.
    3. If legacy SF simulation demo coordinates are detected or explicitly requested, label as synthetic demo!
    4. If allow_online is True and text is unambiguous, query Nominatim.
    5. If no location can be matched, leave coordinates as None (unknown).

    Returns:
        (coordinates: Optional[List[float]], is_synthetic: bool, location_source: str)
    """
    # 1. Check if user provided coordinates
    is_valid_coords, _ = validate_coordinates(supplied_coords)

    if is_valid_coords:
        lat = float(supplied_coords[0])
        lng = float(supplied_coords[1])
        clean_coords = [lat, lng]

        # If it is NOT the legacy demo SF bounding box and not explicitly flagged synthetic, preserve user GPS!
        if not is_synthetic_sf_coordinate(clean_coords) and not explicit_synthetic_flag:
            return clean_coords, False, "user_supplied"

    # 2. Check for Indian place match in offline verified gazetteer
    indian_match = match_indian_place(location_name, sector)

    if indian_match:
        coords, place_name, state = indian_match
        return coords, False, f"geocoded_indian_gazetteer ({place_name}, {state})"

    # 3. If valid coords were provided and matched SF demo box:
    if is_valid_coords:
        lat = float(supplied_coords[0])
        lng = float(supplied_coords[1])
        clean_coords = [lat, lng]
        if is_synthetic_sf_coordinate(clean_coords) or explicit_synthetic_flag:
            return clean_coords, True, "synthetic_demo_sf_simulation"
        return clean_coords, False, "user_supplied"

    # 4. Explicit synthetic flag on legacy seed items without coords
    if explicit_synthetic_flag:
        return [37.7749, -122.4194], True, "synthetic_demo_default"

    # 5. Optional online geocoding if explicitly requested and unambiguous
    if allow_online and location_name and location_name.strip():
        search_res = search_location_candidates(location_name.strip(), limit=2, allow_online=True)
        candidates = search_res.get("candidates", [])
        if len(candidates) == 1 and candidates[0].get("confidence", 0) >= 0.7:
            cand = candidates[0]
            return (
                [cand["latitude"], cand["longitude"]],
                False,
                f"geocoded_osm_nominatim ({cand['display_name'][:60]})",
            )
        elif len(candidates) > 1:
            return None, False, "unresolved_ambiguous"

    # 6. Cannot be matched: leave coordinates unknown (None)! Never assign fake coordinates.
    return None, False, "unmatched_unknown"
