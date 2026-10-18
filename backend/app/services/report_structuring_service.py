"""
RESQNET AI — Report Structuring Service

Parses messy, unstructured incident narratives and extracts structured fields:
- Preserves original raw report text alongside all extracted fields.
- Distinguishes explicitly reported facts from model-inferred fields.
- Extracts hazard category via fine-tuned HumAID DistilBERT inference.
- Extracts people affected / casualties using validated contextual regexes.
- Extracts location clues and cross-references against Indian gazetteer.
- Extracts time references and urgency indicators.
- Treats uncertain or missing values as None/unknown instead of inventing them.
- Maintains strict separation between NLP confidence and verification status.
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from backend.app.schemas.report_structuring import ReportStructuringResponse
from backend.app.services.geocoding_service import INDIAN_GAZETTEER, match_indian_place
from backend.app.services.nlp_service import classify_text_message
from backend.app.services.scoring_service import is_term_negated_or_hypothetical, parse_affected_count

logger = logging.getLogger("RESQNET.ReportStructuring")

# Temporal clue regex patterns
TIME_PATTERNS = [
    r"\b(just now)\b",
    r"\b(\d+\s*(?:min|mins|minute|minutes)\s*ago)\b",
    r"\b(\d+\s*(?:hour|hours|hr|hrs)\s*ago)\b",
    r"\b(\d+\s*(?:day|days)\s*ago)\b",
    r"\b(earlier today)\b",
    r"\b(this morning)\b",
    r"\b(last night)\b",
    r"\b(yesterday)\b",
    r"\b(since morning)\b",
    r"\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b",
]

# Urgency and critical danger keywords (non-negated)
CRITICAL_DANGER_TOKENS = [
    "trapped",
    "buried",
    "unconscious",
    "suffocating",
    "suffocation",
    "swept away",
    "drowning",
    "collapsed building",
    "building collapse",
    "structural collapse",
    "rapidly rising water",
    "water rising fast",
    "toxic gas",
    "gas leak",
    "severe bleeding",
    "cardiac",
    "mass casualty",
]

HIGH_DANGER_TOKENS = [
    "active fire",
    "submerged",
    "flash flood",
    "landslide",
    "mudslide",
    "explosion",
    "power lines down",
    "live wire",
    "debris blocking",
    "urgent help",
    "immediate assistance",
    "rescue needed",
    "evacuation",
]

# Landmark / Sector noun tokens
LANDMARK_SUFFIXES = [
    "bridge", "underpass", "expressway", "flyover", "junction", "cross",
    "road", "street", "nagar", "colony", "market", "hospital", "complex",
    "pier", "harbor", "relief camp", "ghat", "valley", "sector", "station",
    "metro", "highway", "substation", "school", "hall"
]


def clean_report_text(text: str) -> str:
    """Normalize excessive whitespace, line breaks, and punctuation noise."""
    if not text:
        return ""
    cleaned = re.sub(r"[\r\n]+", " ", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def extract_location_clues(text: str) -> List[str]:
    """
    Extract location clues and landmarks mentioned in raw text.
    Checks against verified Indian places and linguistic landmark patterns.
    """
    clues: List[str] = []
    text_lower = text.lower()

    # 1. Check against verified Indian gazetteer places and aliases
    for place, data in INDIAN_GAZETTEER.items():
        if place in text_lower:
            clues.append(place.title())
        for alias in data.get("aliases", []):
            if re.search(rf"\b{re.escape(alias.lower())}\b", text_lower):
                clues.append(alias.title())

    # 2. Extract prepositional location phrases: "near X", "at X", "in X"
    prep_matches = re.findall(
        r"\b(?:near|at|around|opposite|behind|towards|along)\s+([A-Z][a-zA-Z0-9\s\-]{2,30}?)(?=[,\.\n]|\b(?:with|and|where|there|due|water|fire|traffic)\b|$)",
        text,
    )
    for match in prep_matches:
        cleaned_match = match.strip()
        if len(cleaned_match) >= 3 and cleaned_match.title() not in clues:
            clues.append(cleaned_match.title())

    # 3. Extract capitalized landmark tokens (e.g. "Bayview Underpass", "Pier 14")
    for suffix in LANDMARK_SUFFIXES:
        pattern = rf"\b([A-Za-z0-9\s\-]{{2,25}}\s+{suffix})\b"
        for m in re.finditer(pattern, text, re.IGNORECASE):
            token = m.group(1).strip().title()
            if token not in clues:
                clues.append(token)

    return list(dict.fromkeys(clues))


def extract_time_references(text: str) -> List[str]:
    """Extract temporal expressions indicating when the incident occurred or was reported."""
    refs: List[str] = []
    for pat in TIME_PATTERNS:
        matches = re.findall(pat, text, re.IGNORECASE)
        for m in matches:
            if m.strip():
                refs.append(m.strip())
    return list(dict.fromkeys(refs))


def extract_urgent_indicators(text: str) -> List[str]:
    """Extract immediate life-threatening and operational danger indicators that are not negated."""
    text_lower = text.lower()
    found: List[str] = []

    for token in CRITICAL_DANGER_TOKENS:
        if token in text_lower and not is_term_negated_or_hypothetical(text, token):
            found.append(token)

    for token in HIGH_DANGER_TOKENS:
        if token in text_lower and not is_term_negated_or_hypothetical(text, token):
            found.append(token)

    return list(dict.fromkeys(found))


def extract_casualty_facts(text: str) -> Tuple[Optional[int], Optional[str], bool]:
    """
    Extract casualty/people-affected count and description.
    Returns: (numeric_count, text_description, is_explicitly_stated)
    """
    # 1. Check for explicit zero casualties/injuries
    negation_patterns = [
        r"\b(no casualties|zero casualties|no injuries|nobody injured|nobody hurt|no one hurt|no one trapped|nobody trapped|all safe|everyone safe)\b"
    ]
    for pat in negation_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return 0, m.group(1).capitalize(), True

    # 2. Check for explicit counts with human tokens
    human_count_match = re.search(
        r"\b(\d+\s*(?:to|-)\s*\d+|\d+)\s*(people|workers|civilians|children|injured|trapped|casualties|passengers|families|residents|victims)\b",
        text,
        re.IGNORECASE,
    )
    if human_count_match:
        full_phrase = human_count_match.group(0).strip()
        parsed_num = parse_affected_count(people_affected=full_phrase, text=text)
        return (parsed_num if parsed_num > 0 else None), full_phrase, True

    # 3. Fallback to scoring service parser
    parsed_num = parse_affected_count(people_affected=None, text=text)
    if parsed_num > 0:
        return parsed_num, f"{parsed_num} individuals affected", False

    # 4. Unknown / Missing
    return None, None, False


def generate_suggested_title(
    cleaned_text: str,
    hazard_category: Optional[str] = None,
    location: Optional[str] = None,
    urgency_level: str = "moderate",
) -> str:
    """Generate a concise, operational incident headline from extracted components."""
    # First sentence up to 75 characters
    first_sentence = cleaned_text.split(".")[0].strip()
    if first_sentence and len(first_sentence) <= 75:
        return first_sentence

    category_label = (hazard_category or "Emergency").replace("_", " ").title()
    loc_label = f" near {location}" if location else ""
    return f"{category_label} incident{loc_label}"[:80]


def extract_structured_incident_report(raw_text: str) -> ReportStructuringResponse:
    """
    Analyze raw messy incident text and structure it into standardized fields.
    Preserves original text, marks model-inferred vs reported facts, and leaves
    uncertain values as None/unknown.
    """
    raw_clean = (raw_text or "").strip()
    if not raw_clean:
        return ReportStructuringResponse(
            original_text="",
            cleaned_text="",
            nlp_status="EMPTY_TEXT",
            uncertain_or_missing_fields=[
                "hazard_category",
                "casualty_or_people_affected",
                "location_or_coordinates",
                "time_reference",
                "description",
            ],
        )

    cleaned = clean_report_text(raw_clean)

    # 1. HumAID DistilBERT Inference for Hazard Category
    nlp_res = classify_text_message(cleaned)
    predicted_cat = nlp_res.get("predicted_category")
    cat_confidence = nlp_res.get("confidence")
    all_probs = nlp_res.get("all_probabilities", {})

    # 2. Extract Casualties / People Affected
    num_affected, desc_affected, is_explicit_casualty = extract_casualty_facts(cleaned)

    # 3. Extract Location Clues
    location_clues = extract_location_clues(cleaned)
    suggested_loc: Optional[str] = None
    if location_clues:
        # Check if any matches the Indian gazetteer
        for clue in location_clues:
            match = match_indian_place(clue)
            if match:
                suggested_loc = clue
                break
        if not suggested_loc:
            suggested_loc = location_clues[0]

    # 4. Extract Time References
    time_refs = extract_time_references(cleaned)
    suggested_time = time_refs[0].title() if time_refs else "Just now"

    # 5. Extract Urgency Indicators
    urgent_indicators = extract_urgent_indicators(cleaned)
    if any(t in urgent_indicators for t in CRITICAL_DANGER_TOKENS):
        urgency_level = "critical"
    elif any(t in urgent_indicators for t in HIGH_DANGER_TOKENS):
        urgency_level = "high"
    elif urgent_indicators:
        urgency_level = "moderate"
    else:
        urgency_level = "low"

    # 6. Generate Suggested Title
    suggested_title = generate_suggested_title(
        cleaned_text=cleaned,
        hazard_category=predicted_cat,
        location=suggested_loc,
        urgency_level=urgency_level,
    )

    # 7. Partition Reported Facts vs Model Inferred Fields
    reported_facts: Dict[str, Any] = {
        "original_text": raw_clean,
    }
    if is_explicit_casualty and desc_affected:
        reported_facts["casualty_statement"] = desc_affected
    if location_clues:
        reported_facts["location_mentions"] = location_clues
    if time_refs:
        reported_facts["time_mentions"] = time_refs

    inferred_fields: Dict[str, Any] = {
        "hazard_category": predicted_cat,
        "hazard_category_confidence": cat_confidence,
        "urgency_level": urgency_level,
        "suggested_title": suggested_title,
    }
    if num_affected is not None:
        inferred_fields["casualty_numeric_count"] = num_affected
    if suggested_loc:
        inferred_fields["suggested_location_name"] = suggested_loc

    # 8. Identify Uncertain or Missing Fields (Never invent values)
    missing_fields: List[str] = []
    if num_affected is None:
        missing_fields.append("casualty_or_people_affected")
    if not location_clues:
        missing_fields.append("location_or_coordinates")
    if not time_refs:
        missing_fields.append("time_reference")
    missing_fields.append("exact_gps_coordinates")
    missing_fields.append("reporting_party_identity")

    return ReportStructuringResponse(
        original_text=raw_clean,
        cleaned_text=cleaned,
        hazard_category=predicted_cat,
        hazard_category_confidence=cat_confidence,
        hazard_category_inferred=True,
        all_probabilities=all_probs,
        suggested_title=suggested_title,
        casualty_estimate_text=desc_affected,
        casualty_numeric_count=num_affected,
        casualty_inferred=True,
        location_clues=location_clues,
        suggested_location_name=suggested_loc,
        location_inferred=True,
        time_references=time_refs,
        suggested_time_ago=suggested_time,
        urgent_indicators=urgent_indicators,
        urgency_level=urgency_level,
        reported_facts=reported_facts,
        inferred_fields=inferred_fields,
        uncertain_or_missing_fields=missing_fields,
        nlp_status=nlp_res.get("status", "SUCCESS"),
        nlp_disclaimer=(
            "RESQNET AI Automated NLP Extraction. Model inference must not be treated as report verification or ground truth."
        ),
    )
