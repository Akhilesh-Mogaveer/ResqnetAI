"""
RESQNET AI — SMS Message Parsing Engine

Parses incoming SMS messages in both pipe-delimited format:
    FLOOD | Near Udupi railway underpass | 3 people trapped | Need rescue
and free-text format:
    Flash flood near Udupi railway underpass, 3 people trapped, need rescue
"""

import re
from typing import Any, Dict, List, Optional, Tuple

from backend.app.services.report_structuring_service import (
    extract_structured_incident_report,
    clean_report_text,
    extract_casualty_facts,
    extract_location_clues,
    extract_urgent_indicators,
)


HAZARD_TYPE_MAP = {
    "flood": "Flood",
    "flash flood": "Flash Flood",
    "waterlogging": "Flood",
    "collapse": "Structural Collapse",
    "structural collapse": "Structural Collapse",
    "building collapse": "Structural Collapse",
    "landslide": "Landslide",
    "mudslide": "Landslide",
    "fire": "Fire Hazard",
    "wildfire": "Fire Hazard",
    "gas leak": "Hazardous Material",
    "toxic gas": "Hazardous Material",
    "cyclone": "Cyclone Hazard",
    "storm": "Severe Weather",
    "medical": "Medical Emergency",
    "trapped": "Search & Rescue",
    "drowning": "Water Rescue",
}


def parse_pipe_delimited_sms(body: str) -> Optional[Dict[str, Any]]:
    """
    Parse SMS formatted as:
    HAZARD | LOCATION | AFFECTED_PEOPLE | URGENT_NEEDS
    Example: FLOOD | Near Udupi railway underpass | 3 people trapped | Need rescue
    """
    if "|" not in body:
        return None

    segments = [s.strip() for s in body.split("|") if s.strip()]
    if len(segments) < 2:
        return None

    # Segment 0: Hazard description
    hazard_raw = segments[0]
    hazard_lower = hazard_raw.lower()
    hazard_type = "Emergency Incident"
    for k, v in HAZARD_TYPE_MAP.items():
        if k in hazard_lower:
            hazard_type = v
            break
    if hazard_type == "Emergency Incident" and hazard_raw:
        hazard_type = hazard_raw.title()

    # Segment 1: Reported location
    location_raw = segments[1]

    # Segment 2 (optional): Affected people / casualties
    affected_raw = segments[2] if len(segments) > 2 else "Unknown count"
    affected_count = 0
    if affected_raw and affected_raw != "Unknown count":
        num_match = re.search(r"\b(\d+)\b", affected_raw)
        if num_match:
            try:
                affected_count = int(num_match.group(1))
            except ValueError:
                affected_count = 0

    # Segment 3 (optional): Urgent needs
    needs_raw = segments[3] if len(segments) > 3 else None

    # Risk factors & Urgent Indicators
    risk_factors: List[str] = []
    if needs_raw:
        risk_factors.append(f"Reported need: {needs_raw}")
    if "trapped" in body.lower() and not any("trapped" in rf.lower() for rf in risk_factors):
        risk_factors.append("Civilians trapped at reported scene")
    if "rescue" in body.lower() and not any("rescue" in rf.lower() for rf in risk_factors):
        risk_factors.append("Active rescue requested")

    # Determine severity heuristically for intake baseline
    is_critical = (
        affected_count >= 5
        or "trapped" in body.lower()
        or "collapse" in body.lower()
        or "buried" in body.lower()
        or "swept away" in body.lower()
        or "drowning" in body.lower()
    )
    is_high = (
        affected_count >= 1
        or "rescue" in body.lower()
        or "flood" in body.lower()
        or "fire" in body.lower()
    )
    severity = "critical" if is_critical else ("high" if is_high else "moderate")

    # Generate a descriptive title
    title = f"{hazard_type} - {location_raw}"
    if len(title) > 75:
        title = title[:72] + "..."

    return {
        "title": title,
        "type": hazard_type,
        "locationName": location_raw,
        "peopleAffected": affected_raw,
        "affectedCountNumeric": affected_count,
        "urgent_needs": needs_raw,
        "riskFactors": risk_factors,
        "severity": severity,
        "format": "pipe_delimited",
    }


def parse_sms_report(body: str) -> Dict[str, Any]:
    """
    Parse an incoming SMS message text.
    First tests for structured pipe format. If not present or partial, falls back
    to NLP and heuristic free-text structuring.
    """
    cleaned = clean_report_text(body)

    # 1. Try pipe-delimited format
    pipe_result = parse_pipe_delimited_sms(cleaned)
    if pipe_result:
        return pipe_result

    # 2. Free-text report structuring
    struct_res = extract_structured_incident_report(cleaned)

    # Extract casualties
    affected_count, affected_desc, _ = extract_casualty_facts(cleaned)
    final_people = affected_desc or "Unknown count"
    final_num = affected_count or 0

    # Extract location clue
    loc_clues = extract_location_clues(cleaned)
    final_loc = loc_clues[0] if loc_clues else "Location Unspecified"

    # Urgent indicators
    urgent_tokens = extract_urgent_indicators(cleaned)
    risk_factors = [f"Urgency indicator: {token}" for token in urgent_tokens]

    # Hazard type
    cat_raw = struct_res.hazard_category or "general_emergency"
    hazard_type = cat_raw.replace("_", " ").title()

    # Severity
    is_critical = final_num >= 5 or any(t in ("trapped", "buried", "collapse", "swept away") for t in urgent_tokens)
    is_high = final_num >= 1 or len(urgent_tokens) > 0
    severity = "critical" if is_critical else ("high" if is_high else "moderate")

    title = struct_res.suggested_title or f"{hazard_type} Incident"
    if len(title) > 75:
        title = title[:72] + "..."

    return {
        "title": title,
        "type": hazard_type,
        "locationName": final_loc,
        "peopleAffected": final_people,
        "affectedCountNumeric": final_num,
        "urgent_needs": ", ".join(urgent_tokens) if urgent_tokens else None,
        "riskFactors": risk_factors,
        "severity": severity,
        "format": "free_text",
    }
