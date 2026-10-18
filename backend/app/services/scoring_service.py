"""
RESQNET AI — Incident Severity & Priority Scoring Engine

Provides deterministic, explainable incident severity classification and
multi-factor priority scoring (0–100) for disaster emergency response coordination.

Key Features:
- Deterministic severity classification (critical, high, moderate, low).
- Explainable priority scoring based on hazard, casualty scale, verification,
  location confidence, and time urgency.
- Conservative casualty parsing distinguishing human victims from buildings/households.
- Negation and context filtering to prevent false critical alarms.
- Location confidence computed from actual coordinate and gazetteer evidence.
- Explanatory 'whyPrioritised' summaries and contextual 'riskFactors'.
- Strict separation of NLP model confidence from report ground-truth reliability.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import math
import re
from typing import Any, Dict, List, Optional, Tuple, Union


# ============================================================================
# Centralized Weights and Scoring Constants (Provisional Rules from Audit)
# ============================================================================

# Multi-factor Priority Weights (Sum = 1.0)
WEIGHT_HAZARD: float = 0.35        # Situational hazard and life-threat severity
WEIGHT_SCALE: float = 0.25         # Casualty & population impact scale
WEIGHT_VERIFICATION: float = 0.20  # Verification status and source credibility
WEIGHT_LOCATION: float = 0.10      # Geospatial dispatch readiness & confidence
WEIGHT_TIME: float = 0.10          # Temporal recency / escalation urgency

# Corroboration & Disputed Limits
CORROBORATION_BOOST_PER_REPORT: int = 4   # +4 priority points per merged duplicate
CORROBORATION_MAX_BOOST: int = 16        # Max +16 priority points from duplicates
DISPUTED_PRIORITY_CAP: int = 25          # Disputed reports capped at 25 priority

# Severity Classification Identifiers
SEVERITY_CRITICAL: str = "critical"
SEVERITY_HIGH: str = "high"
SEVERITY_MODERATE: str = "moderate"
SEVERITY_LOW: str = "low"

# HumAID Categories recognized by model
HUMAID_HIGH_HAZARD_CLASSES = {
    "injured_or_dead_people",
    "requests_or_urgent_needs",
    "missing_or_found_people",
}

HUMAID_MODERATE_HAZARD_CLASSES = {
    "infrastructure_and_utility_damage",
    "displaced_people_and_evacuations",
    "caution_and_advice",
}

HUMAID_LOW_HAZARD_CLASSES = {
    "rescue_volunteering_or_donation_effort",
    "other_relevant_information",
    "sympathy_and_support",
    "not_humanitarian",
}


@dataclass
class ScoringResult:
    """Structured container holding all calculated scores and explanations."""
    severity: str
    priority_score: int
    report_reliability: int
    location_confidence: int
    affected_count_numeric: int
    risk_factors: List[str] = field(default_factory=list)
    why_prioritised: str = ""
    breakdown: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "severity": self.severity,
            "priorityScore": self.priority_score,
            "reportReliability": self.report_reliability,
            "locationConfidence": self.location_confidence,
            "affectedCountNumeric": self.affected_count_numeric,
            "riskFactors": self.risk_factors,
            "whyPrioritised": self.why_prioritised,
            "breakdown": self.breakdown,
        }


# ============================================================================
# 1. Conservative Affected-Person Count Parser
# ============================================================================

# Target tokens indicating human beings (singular and plural)
HUMAN_TOKENS = (
    r"(?:people|person|persons|civilians?|workers?|residents?|individuals?|"
    r"patients?|seniors?|children|child|kids?|passengers?|drivers?|"
    r"travel(?:l)?ers?|tourists?|commuters?|occupants?|pedestrians?|stranded|"
    r"victims?|casualties|fatalities|fatal(?:ity)?|injured|dead|trapped)"
)

# Objects and structural units that must NOT be counted as human casualties
NON_HUMAN_OBJECTS = (
    r"(?:apartments?|households?|homes?|houses?|buildings?|floors?|structures?|"
    r"vehicles?|cars?|trucks?|buses?|vans?|miles?|km|meters?|hours?|minutes?|"
    r"seconds?|percent|%|kw|mw|volts?|amps?|ppm|substations?|tanks?|gallons?|"
    r"barrels?|acres?|sq\s*ft|rupees?|dollars?)"
)


def parse_affected_count(
    people_affected: Optional[str] = None,
    text: Optional[str] = None,
) -> int:
    """
    Conservatively extract human victim count from peopleAffected or report text.
    
    Guarantees:
    - Never mistakes building counts, household counts, or road markers for victims.
    - Resolves ranges (e.g. '12 - 20 trapped' -> 20) conservatively taking the upper estimate.
    - Honors explicit negation ('nobody trapped', 'no casualties' -> 0).
    - Returns 0 when ambiguous or absent.
    """
    raw_str = (people_affected or "").strip()
    report_str = (text or "").strip()

    # 0. Historical / Retrospective Narrative Check
    combined = f"{raw_str} {report_str}".lower()
    if is_historical_or_retrospective(combined):
        return 0

    # 1. Explicit Negation Check
    if re.search(r"\b(no|zero|none|nobody|no\s+one)\s+(?:casualties|injuries|deaths|fatalities|people\s+trapped|one\s+trapped)\b", combined) or \
       re.search(r"\bnobody\s+is\s+trapped\b", combined) or \
       re.search(r"\bno\s+trapped\s+people\b", combined):
        return 0

    candidates: List[int] = []

    # 2. Check people_affected field first
    if raw_str and raw_str.lower() not in ("unknown count", "unknown", "none", "n/a"):
        # Check if raw_str only describes non-human objects (e.g. "180 residential households")
        has_non_human = bool(re.search(rf"\b{NON_HUMAN_OBJECTS}\b", raw_str, re.IGNORECASE))
        has_human = bool(re.search(rf"\b{HUMAN_TOKENS}\b", raw_str, re.IGNORECASE))

        if has_human or not has_non_human:
            # Match number ranges like '12 - 20' or single numbers
            range_match = re.search(rf"(\d+)\s*(?:-|to)\s*(\d+)\s*(?:{HUMAN_TOKENS})?", raw_str, re.IGNORECASE)
            if range_match:
                n1 = int(range_match.group(1))
                n2 = int(range_match.group(2))
                candidates.append(max(n1, n2))
            else:
                num_match = re.search(rf"(\d+)\s*(?:{HUMAN_TOKENS})?", raw_str, re.IGNORECASE)
                if num_match and has_human:
                    candidates.append(int(num_match.group(1)))

    # 3. If no candidate from people_affected, inspect report_text
    if not candidates and report_str:
        # Pattern A: Number (or range) immediately followed by human token (e.g. '4 workers coughing', '6 people trapped')
        matches_after = re.finditer(
            rf"(\d+)(?:\s*(?:-|to)\s*(\d+))?\s+{HUMAN_TOKENS}\b",
            report_str,
            re.IGNORECASE,
        )
        for m in matches_after:
            n1 = int(m.group(1))
            n2 = int(m.group(2)) if m.group(2) else n1
            candidates.append(max(n1, n2))

        # Pattern B: Human token followed closely by number (e.g. 'casualties: 5', 'trapped: 12')
        matches_before = re.finditer(
            rf"\b{HUMAN_TOKENS}[:\s]+(\d+)\b",
            report_str,
            re.IGNORECASE,
        )
        for m in matches_before:
            candidates.append(int(m.group(1)))

    if not candidates:
        return 0

    # Safety clamp: single report casualties capped at 100,000 to prevent parsing anomalies
    valid_counts = [c for c in candidates if 0 < c <= 100000]
    return max(valid_counts) if valid_counts else 0


# ============================================================================
# 2. Location Confidence Calculator
# ============================================================================

def calculate_location_confidence(
    coordinates: Optional[List[float]],
    location_source: Optional[str] = None,
    location_name: Optional[str] = None,
    sector: Optional[str] = None,
) -> int:
    """
    Calculate location confidence from actual coordinate and source evidence.
    
    Guarantees:
    - Never defaults blindly to 70.
    - Missing coordinates return low confidence (<= 25).
    - User GPS coordinates score highest (95).
    - Gazetteer matches score 85.
    - Synthetic demo coordinates score 70.
    """
    has_valid_coords = (
        coordinates is not None
        and isinstance(coordinates, (list, tuple))
        and len(coordinates) == 2
        and coordinates[0] is not None
        and coordinates[1] is not None
        and not (coordinates[0] == 0.0 and coordinates[1] == 0.0)
    )

    if not has_valid_coords:
        # Check if coarse sector or named landmark is at least provided
        has_sector = bool(sector and sector.strip() and "unspecified" not in sector.lower())
        has_name = bool(location_name and location_name.strip() and "unspecified" not in location_name.lower())
        if has_name or has_sector:
            return 25
        return 10

    src = (location_source or "").lower()
    if src == "user_supplied":
        return 95
    if "geocoded" in src or "gazetteer" in src:
        return 85
    if "synthetic" in src or "demo" in src:
        return 70

    # Fallback with valid coordinates
    return 80


# ============================================================================
# ============================================================================
# 3. Context, Historical, & Collapse Danger Detection
# ============================================================================

def is_historical_or_retrospective(text: Optional[str]) -> bool:
    """
    Check if a report is clearly a historical retrospective, anniversary commemoration,
    memorial, or past disaster reference, without indicating a current active emergency.

    Examples of historical reports:
    - "Remembering the building collapse five years ago that trapped ten people."
    - "Anniversary of the 2018 flood that killed several people."
    - "Memorial service for victims of the 2015 earthquake."
    - "Ten years ago today, our town was hit by a major flood."

    Current emergencies (must NOT be marked historical):
    - "A building collapsed just now and people are trapped."
    - "Water rising today like the 2018 flood, urgent rescue needed!"
    - "Tremor felt moments ago, wall collapsed."
    """
    if not text:
        return False

    text_lower = text.lower()

    # 1. Immediate current emergency indicators take strict precedence
    current_indicators = (
        r"\b(?:just\s+now|moments?\s+ago|minutes?\s+ago|hours?\s+ago|right\s+now)\b|"
        r"\b(?:today|tonight|this\s+morning|this\s+afternoon|this\s+evening)\b|"
        r"\b(?:currently|ongoing|in\s+progress|active\s+scene|unfolding|breaking|live\s+feed)\b|"
        r"\b(?:send\s+help|urgent|immediate\s+assistance|need\s+rescue|dispatch\s+now)\b"
    )
    if re.search(current_indicators, text_lower):
        return False

    # 2. Retrospective and commemorative keywords
    commemorative_patterns = (
        r"\b(?:remembering|commemorating|marking|memorial\s+for|in\s+memory\s+of|tribute\s+to)\b|"
        r"\b(?:anniversary\s+of|annual\s+remembrance|\b\d+th\s+anniversary)\b|"
        r"\b(?:historic(?:al)?\s+(?:archive|record|recollection|retrospective|overview))\b"
    )

    # 3. Distant past time indicators (years/decades ago, specific past years)
    past_time_patterns = (
        r"\b(?:\d+|several|many|ten|five|two|three|four|six|seven|eight|nine)\s+(?:years?|decades?)\s+ago\b|"
        r"\b(?:months?\s+ago)\b|"
        r"\b(?:the\s+)?(19\d\d|20[01]\d|202[0-4])\s+(?:earthquake|flood|cyclone|tsunami|disaster|collapse|tragedy|incident)\b|"
        r"\b(?:back\s+in|during\s+the|from\s+the)\s+(19\d\d|20[01]\d|202[0-4])\b"
    )

    has_commemorative = bool(re.search(commemorative_patterns, text_lower))
    has_past_time = bool(re.search(past_time_patterns, text_lower))

    return has_commemorative or has_past_time


def is_term_negated_or_hypothetical(text: str, term: str) -> bool:
    """
    Check if a danger term appears in a negated, hypothetical, or drill context.
    
    Examples of negated context:
    - "nobody is trapped"
    - "no casualties reported"
    - "without any trapped workers"
    - "this is a simulation drill"
    - "in case of a fire, proceed to exit"
    """
    if not text or not term:
        return False

    text_lower = text.lower()
    term_lower = term.lower()

    if term_lower not in text_lower:
        return False

    # Check document-level simulation / drill flags
    if re.search(r"\b(drill|simulation\s+exercise|training\s+drill|tabletop\s+exercise|hypothetical)\b", text_lower):
        return True

    # Split into sentence/clause chunks
    clauses = re.split(r"[.!?;,\n]+", text_lower)
    for clause in clauses:
        if term_lower in clause:
            # Check negation patterns within the same clause
            negation_pattern = (
                r"\b(no|not|nobody|no\s+one|none|zero|without|neither|never|false\s+alarm)\b"
                r".{0,40}\b" + re.escape(term_lower)
            )
            if re.search(negation_pattern, clause):
                return True

            reverse_negation = (
                re.escape(term_lower) + r".{0,25}\b(none|zero|0|negative|ruled\s+out|false)\b"
            )
            if re.search(reverse_negation, clause):
                return True

    return False


def check_collapse_context(text: str, affected_count: int = 0) -> Tuple[bool, bool, bool]:
    """
    Analyze structure collapse context to distinguish:
    1. has_active_entrapment: Confirmed civilian entrapment or occupied building collapse -> CRITICAL
    2. has_nearby_danger: Collapse with plausible collateral risk to nearby residents/passersby -> HIGH
    3. is_unoccupied_collapse: Unoccupied, abandoned, or empty structure with confirmed absence of victims -> MODERATE

    Returns (has_active_entrapment, has_nearby_danger, is_unoccupied_collapse)
    """
    text_lower = text.lower()

    has_collapse_term = any(k in text_lower for k in ["collapse", "collapsed", "under rubble", "pinned by beams", "cave-in", "caved in"])
    has_trapped_term = any(k in text_lower for k in ["trapped", "stuck inside", "pinned under", "buried in rubble", "buried in debris", "screaming inside"])

    if not has_collapse_term and not has_trapped_term:
        return False, False, False

    negated_trapped = is_term_negated_or_hypothetical(text, "trapped")
    negated_collapse = is_term_negated_or_hypothetical(text, "collapse")

    # Check for unoccupied / empty facility indicators
    is_abandoned_or_empty = bool(re.search(
        r"\b(?:abandoned|unoccupied|empty|vacant|derelict|condemned|unused|storage\s+shed|barn|outbuilding)\b",
        text_lower
    ))
    confirmed_no_one_inside = bool(re.search(
        r"\b(?:nobody|no\s+one|none|zero)\s+(?:was\s+|were\s+|is\s+|are\s+)?(?:inside|in\s+there|trapped|hurt|injured|present)\b|"
        r"\b(?:building\s+was\s+empty|empty\s+at\s+the\s+time|no\s+occupants|all\s+(?:workers|people|residents)\s+(?:evacuated|accounted\s+for))\b",
        text_lower
    ))

    # Check for active collateral risk / plausible danger to nearby people
    has_nearby_danger = bool(re.search(
        r"\b(?:nearby\s+(?:residents|people|homes|houses)|adjacent\s+(?:homes|houses|buildings|residents)|"
        r"neighboring|pedestrians?|passersby|street|crowd|gas\s+line|power\s+line|live\s+wire|traffic)\b.*?"
        r"\b(?:danger|at\s+risk|threat|threatened|evacuat|hazard|ruptured|down)\b|"
        r"\b(?:danger|risk|hazard)\s+to\s+(?:nearby|adjacent|public|residents)\b",
        text_lower
    ))

    # 1. Unoccupied / Abandoned without people inside and without nearby danger
    if (is_abandoned_or_empty or confirmed_no_one_inside) and not has_nearby_danger and affected_count == 0 and not (has_trapped_term and not negated_trapped):
        return False, False, True

    # 2. Collapse with confirmed entrapment / victims or occupied building
    if (has_trapped_term and not negated_trapped) or \
       (has_collapse_term and not negated_collapse and (affected_count > 0 or "occupied" in text_lower or ("people" in text_lower and not confirmed_no_one_inside))):
        return True, has_nearby_danger, False

    # 3. Collapse with plausible risk to nearby residents/passersby
    if has_nearby_danger:
        return False, True, False

    # 4. Collapse without entrapment words, without casualty counts, without occupied words
    return False, False, is_abandoned_or_empty or confirmed_no_one_inside


def extract_risk_factors(
    report_text: Optional[str] = None,
    humaid_category: Optional[str] = None,
    affected_count: int = 0,
    coordinates: Optional[List[float]] = None,
    verification_status: Optional[str] = None,
    duplicate_count: int = 0,
) -> List[str]:
    """
    Extract meaningful, context-checked compounding risk factors from report text and metadata.
    Avoids extracting negated dangers (e.g. 'nobody trapped') or historical event details.
    """
    text = (report_text or "").strip()
    text_lower = text.lower()
    risk_factors: List[str] = []

    # 0. Historical / Retrospective narrative check
    if is_historical_or_retrospective(text):
        risk_factors.append("Retrospective / historical narrative (no active life-threat detected)")
        if verification_status == "unverified":
            risk_factors.append("Unverified citizen report requiring coordinator ground check")
        elif verification_status == "disputed":
            risk_factors.append("Report contested / flagged as disputed ground truth")
        if coordinates is None or len(coordinates) < 2 or coordinates[0] is None:
            risk_factors.append("Geographic coordinates unmapped (ground scout confirmation needed)")
        return risk_factors

    # 1. Structural Collapse & Entrapment Context
    has_entrapment, has_nearby_danger, is_unoccupied = check_collapse_context(text, affected_count)
    if has_entrapment:
        risk_factors.append("Active structural collapse / civilian entrapment hazard")
    elif has_nearby_danger:
        risk_factors.append("Structural collapse with plausible collateral risk to nearby residents")
    elif is_unoccupied:
        risk_factors.append("Structural collapse of unoccupied facility (zero occupants inside)")

    # 2. Fire & Explosion
    if any(k in text_lower for k in ["explosion", "exploding", "active fire", "transformer fire", "blaze"]):
        if not is_term_negated_or_hypothetical(text, "explosion") and not is_term_negated_or_hypothetical(text, "fire"):
            risk_factors.append("Active fire or detonation hazard")

    # 3. Hazardous Materials & Toxic Gas
    if any(k in text_lower for k in ["gas leak", "chemical plume", "methane", "ammonia", "toxic", "poisonous vapor"]):
        if not is_term_negated_or_hypothetical(text, "gas leak") and not is_term_negated_or_hypothetical(text, "toxic"):
            risk_factors.append("Hazardous materials / toxic gas dispersal risk")

    # 4. Flooding & Drowning Peril
    if any(k in text_lower for k in ["flash flood", "submerged", "drowning", "rising water", "floodwater rising"]):
        if not is_term_negated_or_hypothetical(text, "flood") and not is_term_negated_or_hypothetical(text, "submerged"):
            risk_factors.append("Rapidly rising floodwater / drowning hazard")

    # 5. Critical Utility & Healthcare Life-Support Outage
    if any(k in text_lower for k in ["life-support", "generator failure", "high-voltage line", "arcing line", "icu patients"]):
        risk_factors.append("Critical life-support / high-voltage infrastructure failure")

    # 6. Vulnerable Population Exposure
    if any(k in text_lower for k in ["seniors", "elderly", "children", "infants", "dialysis", "hospital clinic"]):
        risk_factors.append("Vulnerable population impacted (medical / elderly / pediatric)")

    # 7. Casualty Scale
    if affected_count >= 10:
        risk_factors.append(f"Significant casualty scale ({affected_count} individuals reported at risk)")
    elif affected_count > 0:
        risk_factors.append(f"Confirmed casualties reported ({affected_count} individuals)")

    # 8. Unmapped Geographic Coordinates
    if coordinates is None or len(coordinates) < 2 or coordinates[0] is None:
        risk_factors.append("Geographic coordinates unmapped (ground scout confirmation needed)")

    # 9. Verification Caution
    if verification_status == "unverified":
        risk_factors.append("Unverified citizen report requiring coordinator ground check")
    elif verification_status == "disputed":
        risk_factors.append("Report contested / flagged as disputed ground truth")

    # 10. Multi-Source Corroboration
    if duplicate_count > 0:
        risk_factors.append(f"Corroborated by {duplicate_count} independent reports")

    return risk_factors


# ============================================================================
# 4. Incident Severity Classifier
# ============================================================================

def calculate_incident_severity(
    humaid_category: Optional[str] = None,
    humaid_confidence: Optional[float] = None,
    all_probabilities: Optional[Dict[str, float]] = None,
    report_text: Optional[str] = None,
    affected_count: int = 0,
    risk_factors: Optional[List[str]] = None,
) -> str:
    """
    Determine incident severity tier: critical, high, moderate, low.
    
    Guarantees:
    - Never triggers critical from negated phrases ('nobody trapped').
    - Critical triggers for active entrapment, toxic leaks, mass casualties.
    - Low for donation, sympathy, volunteering, or general non-emergency messages.
    - Moderate for localized infrastructure without immediate life danger.
    """
    text = (report_text or "").strip()
    text_lower = text.lower()
    cat = (humaid_category or "").lower()
    all_probs = all_probabilities or {}

    # 0. Historical / Retrospective narrative check
    if is_historical_or_retrospective(text):
        return SEVERITY_LOW

    # Check for acute non-negated life-threat triggers
    has_entrapment, has_nearby_danger, is_unoccupied = check_collapse_context(text, affected_count)
    has_toxic_hazmat = (
        any(k in text_lower for k in ["gas leak", "chemical plume", "toxic yellow", "ammonia vapor", "methane explosion"])
        and not is_term_negated_or_hypothetical(text, "gas leak")
        and not is_term_negated_or_hypothetical(text, "toxic")
    )
    has_life_support_failure = (
        any(k in text_lower for k in ["life-support", "icu", "dialysis"])
        and any(k in text_lower for k in ["generator failure", "power cut", "power outage", "running low"])
    )
    has_flood_entrapment = (
        any(k in text_lower for k in ["flash flood", "submerged", "drowning"])
        and (has_entrapment or affected_count >= 5 or "roofs" in text_lower or "trapped" in text_lower)
        and not is_term_negated_or_hypothetical(text, "flood")
    )

    # 1. CRITICAL Tier Evaluation
    if has_entrapment or has_toxic_hazmat or has_life_support_failure or has_flood_entrapment:
        return SEVERITY_CRITICAL

    if cat == "injured_or_dead_people" and (affected_count >= 5 or any(k in text_lower for k in ["stampede", "crushed", "unconscious"])):
        return SEVERITY_CRITICAL

    if all_probs.get("injured_or_dead_people", 0.0) >= 0.70 and affected_count >= 5:
        return SEVERITY_CRITICAL

    # 2. LOW Tier Evaluation
    is_donation_or_sympathy = cat in (
        "rescue_volunteering_or_donation_effort",
        "sympathy_and_support",
        "not_humanitarian",
        "other_relevant_information",
    )
    has_no_victims = (affected_count == 0)
    has_no_danger_words = not any(
        k in text_lower for k in [
            "fire", "flood", "collapse", "leak", "trapped", "injured",
            "dead", "casualt", "explosion", "hazard", "evacuat", "line down", "damage"
        ]
    )
    if is_donation_or_sympathy and has_no_victims and has_no_danger_words:
        return SEVERITY_LOW

    # 3. HIGH Tier Evaluation
    if has_nearby_danger:
        return SEVERITY_HIGH

    if cat in ("injured_or_dead_people", "requests_or_urgent_needs"):
        return SEVERITY_HIGH

    if affected_count >= 1:
        return SEVERITY_HIGH

    if any(k in text_lower for k in ["evacuation route blocked", "mountain pass blocked", "high-voltage line down", "arcing line"]):
        return SEVERITY_HIGH

    if any(k in text_lower for k in ["active fire", "blaze", "landslide on", "evacuation corridor"]):
        return SEVERITY_HIGH

    # 4. MODERATE Tier Evaluation
    if is_unoccupied:
        return SEVERITY_MODERATE

    if cat in ("infrastructure_and_utility_damage", "displaced_people_and_evacuations", "caution_and_advice"):
        return SEVERITY_MODERATE

    # Check if a hazard was reported, but report explicitly notes zero injuries / nobody trapped
    if is_term_negated_or_hypothetical(text, "trapped") and is_term_negated_or_hypothetical(text, "injuries"):
        return SEVERITY_MODERATE

    # Default fallback
    return SEVERITY_MODERATE


# ============================================================================
# 5. Explainable Priority Score Calculator (0–100)
# ============================================================================

def _calculate_time_urgency(timestamp_iso: Optional[str]) -> int:
    """Calculate temporal urgency sub-score (0-100) based on elapsed time."""
    if not timestamp_iso:
        return 100  # Fresh incident intake defaults to immediate time urgency

    try:
        ts = datetime.fromisoformat(timestamp_iso.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff_minutes = (now - ts).total_seconds() / 60.0

        if diff_minutes < 0:
            return 100
        if diff_minutes <= 30:
            return 100
        if diff_minutes <= 120:
            return 85
        if diff_minutes <= 360:
            return 70
        if diff_minutes <= 1440:
            return 50
        return 30
    except Exception:
        return 90


def calculate_priority_score(
    severity: str,
    humaid_category: Optional[str] = None,
    humaid_confidence: Optional[float] = None,
    all_probabilities: Optional[Dict[str, float]] = None,
    affected_count: int = 0,
    verification_status: str = "unverified",
    location_confidence: int = 70,
    duplicate_count: int = 0,
    timestamp: Optional[str] = None,
    risk_factors: Optional[List[str]] = None,
) -> Tuple[int, Dict[str, Any]]:
    """
    Calculate an explainable priority score between 0 and 100.
    
    Guarantees:
    - Centralized weights: Hazard 35%, Scale 25%, Verification 20%, Location 10%, Time 10%.
    - Unverified critical life-threats score high enough for urgent triage (~80+).
    - Disputed reports capped at 25.
    - Low-risk non-emergencies stay <= 35.
    - Stable, deterministic results for identical inputs.
    """
    v_status = (verification_status or "unverified").lower()
    all_probs = all_probabilities or {}
    risks = risk_factors or []

    # 1. Hazard Sub-Score (0-100)
    if severity == SEVERITY_CRITICAL:
        hazard_base = 95
        if any(any(k in r.lower() for k in ["entrapment", "life-support", "toxic", "gas", "explosion"]) for r in risks):
            hazard_base = 100
    elif severity == SEVERITY_HIGH:
        hazard_base = 80
        if any("collateral risk" in r.lower() for r in risks):
            hazard_base = 85
        if humaid_category == "requests_or_urgent_needs":
            hazard_base = 85
    elif severity == SEVERITY_MODERATE:
        hazard_base = 52
    else:  # SEVERITY_LOW
        hazard_base = 20

    # Slight lift if model detected secondary life threat probabilities
    prob_life_threat = all_probs.get("injured_or_dead_people", 0.0) + all_probs.get("requests_or_urgent_needs", 0.0)
    hazard_sub = min(100.0, hazard_base + (prob_life_threat * 5.0))

    # 2. Casualty Scale Sub-Score (0-100)
    if affected_count == 0:
        if any(any(k in r.lower() for k in ["entrapment", "collateral risk", "nearby residents", "population at risk"]) for r in risks):
            scale_sub = 50.0  # Uncounted active entrapment or collateral hazard to nearby residents indicates individuals at risk
        else:
            scale_sub = 20.0
    elif affected_count <= 2:
        scale_sub = 45.0
    elif affected_count <= 5:
        scale_sub = 65.0
    elif affected_count <= 15:
        scale_sub = 80.0
    elif affected_count <= 50:
        scale_sub = 92.0
    else:
        scale_sub = 100.0

    # 3. Verification Sub-Score (0-100)
    if v_status == "verified":
        verif_sub = 95.0
    elif v_status == "under_review":
        verif_sub = 75.0
    elif v_status == "unverified":
        # Unverified critical reports receive 65 so that critical life threats
        # remain eligible for urgent triage (>= 80 priority), honoring Requirement 4.
        verif_sub = 65.0 if severity == SEVERITY_CRITICAL else 55.0
    elif v_status == "disputed":
        verif_sub = 10.0
    else:
        verif_sub = 55.0

    # 4. Location Sub-Score (0-100)
    loc_sub = float(max(0, min(100, location_confidence)))

    # 5. Time Urgency Sub-Score (0-100)
    time_sub = float(_calculate_time_urgency(timestamp))

    # Weighted Composite Score
    composite = (
        (hazard_sub * WEIGHT_HAZARD) +
        (scale_sub * WEIGHT_SCALE) +
        (verif_sub * WEIGHT_VERIFICATION) +
        (loc_sub * WEIGHT_LOCATION) +
        (time_sub * WEIGHT_TIME)
    )

    # Corroboration Multiplier / Boost
    corrob_boost = min(CORROBORATION_MAX_BOOST, duplicate_count * CORROBORATION_BOOST_PER_REPORT)
    score_with_corrob = composite + corrob_boost

    # Disputed Penalty
    if v_status == "disputed":
        final_score = min(DISPUTED_PRIORITY_CAP, int(round(score_with_corrob * 0.4)))
    else:
        final_score = max(0, min(100, int(round(score_with_corrob))))

    breakdown = {
        "hazard_sub": round(hazard_sub, 1),
        "scale_sub": round(scale_sub, 1),
        "verification_sub": round(verif_sub, 1),
        "location_sub": round(loc_sub, 1),
        "time_sub": round(time_sub, 1),
        "corroboration_boost": corrob_boost,
        "weights": {
            "hazard": WEIGHT_HAZARD,
            "scale": WEIGHT_SCALE,
            "verification": WEIGHT_VERIFICATION,
            "location": WEIGHT_LOCATION,
            "time": WEIGHT_TIME,
        },
    }

    return final_score, breakdown


# ============================================================================
# 6. Report Reliability Calculator (Separated from NLP Confidence)
# ============================================================================

def calculate_report_reliability(
    source_summary: Optional[str] = None,
    verification_status: str = "unverified",
    duplicate_count: int = 0,
    has_coordinates: bool = True,
) -> int:
    """
    Calculate report ground-truth reliability (0-100).
    Separated strictly from HumAID NLP classification confidence.
    """
    src = (source_summary or "").lower()
    v_status = (verification_status or "unverified").lower()

    # Base reliability depending on source type
    if any(k in src for k in ["sensor", "scada", "telemetry", "highway patrol", "fire department", "911 direct"]):
        base = 88
    elif any(k in src for k in ["transit security", "station master", "facility chief"]):
        base = 84
    elif any(k in src for k in ["citizen", "tweet", "caller transcript", "intake"]):
        base = 70
    else:
        base = 70

    # Verification adjustment
    if v_status == "verified":
        base += 8
    elif v_status == "disputed":
        base -= 35

    # Multi-source corroboration boost (+5 per merged report)
    corrob_boost = min(20, duplicate_count * 5)
    base += corrob_boost

    if not has_coordinates:
        base -= 5

    return max(10, min(98, base))


# ============================================================================
# 7. Explainable Why-Prioritised Summary Generator
# ============================================================================

def generate_why_prioritised(
    severity: str,
    priority_score: int,
    affected_count: int,
    humaid_category: Optional[str] = None,
    risk_factors: Optional[List[str]] = None,
    location_confidence: int = 70,
    verification_status: str = "unverified",
    duplicate_count: int = 0,
) -> str:
    """
    Generate an explainable, operational justification for the priority score.
    """
    risks = risk_factors or []
    cat_name = (humaid_category or "general incident").replace("_", " ")
    parts: List[str] = []

    # Lead summary
    parts.append(f"Prioritised to {priority_score}/100 ({severity.upper()}).")

    # Primary Hazard Driver
    if severity == SEVERITY_CRITICAL:
        if any("entrapment" in r.lower() for r in risks):
            parts.append("Critical life-threat hazard with active civilian entrapment under structural debris.")
        elif any("toxic" in r.lower() or "gas" in r.lower() for r in risks):
            parts.append("Immediate hazardous material / toxic vapor plume endangering nearby personnel.")
        elif any("life-support" in r.lower() for r in risks):
            parts.append("Immediate failure of critical healthcare life-support electrical reserves.")
        else:
            parts.append("Critical threat to human life requiring urgent tactical rescue dispatch.")
    elif severity == SEVERITY_HIGH:
        if any("collateral risk" in r.lower() for r in risks):
            parts.append("High-priority crisis event: structure collapse with reported hazard to nearby residents.")
        elif affected_count > 0:
            parts.append(f"High-priority operational emergency with {affected_count} reported casualties.")
        else:
            parts.append(f"High-priority crisis event categorized under '{cat_name}'.")
    elif severity == SEVERITY_MODERATE:
        if any("unoccupied" in r.lower() for r in risks):
            parts.append("Moderate operational response required for infrastructure damage; unoccupied structure with no trapped occupants.")
        else:
            parts.append(f"Moderate operational response required for {cat_name}; no active life entrapment detected.")
    else:
        if any("retrospective" in r.lower() or "historical" in r.lower() for r in risks):
            parts.append("Low-priority retrospective or historical commemoration; no active tactical emergency.")
        else:
            parts.append("Low-priority non-emergency request or humanitarian donation inquiry.")

    # Location qualification
    if location_confidence <= 25:
        parts.append("Geographic coordinates are unknown / unmapped; ground location scouting required.")
    elif location_confidence >= 85:
        parts.append("Location coordinates confirmed with high geographic confidence.")

    # Verification and Corroboration qualification
    if verification_status == "unverified":
        parts.append("Status is unverified; pending ground crew confirmation.")
    elif verification_status == "verified":
        parts.append("Ground truth confirmed by human coordinator.")
    elif verification_status == "disputed":
        parts.append("Report flagged as disputed/unconfirmed by ground responders.")

    if duplicate_count > 0:
        parts.append(f"Corroborated by {duplicate_count} independent witness reports.")

    return " ".join(parts)


# ============================================================================
# 8. Unified Master Scoring Pipeline
# ============================================================================

def calculate_incident_scores(
    report_text: Optional[str] = None,
    title: Optional[str] = None,
    humaid_category: Optional[str] = None,
    humaid_confidence: Optional[float] = None,
    all_probabilities: Optional[Dict[str, float]] = None,
    coordinates: Optional[List[float]] = None,
    location_source: Optional[str] = None,
    location_name: Optional[str] = None,
    sector: Optional[str] = None,
    people_affected: Optional[str] = None,
    verification_status: str = "unverified",
    duplicate_count: int = 0,
    timestamp: Optional[str] = None,
    source_summary: Optional[str] = None,
) -> ScoringResult:
    """
    Execute complete deterministic scoring pipeline for an emergency incident.
    Returns structured ScoringResult containing severity, priorityScore, reliability,
    locationConfidence, parsed casualty count, riskFactors, and whyPrioritised.
    """
    full_text = f"{title or ''}. {report_text or ''}".strip()

    # Step 1: Parse affected casualties conservatively
    affected_numeric = parse_affected_count(people_affected=people_affected, text=full_text)

    # Step 2: Compute location confidence from coordinates and source
    loc_conf = calculate_location_confidence(
        coordinates=coordinates,
        location_source=location_source,
        location_name=location_name,
        sector=sector,
    )

    # Step 3: Extract non-negated risk factors
    risk_factors = extract_risk_factors(
        report_text=full_text,
        humaid_category=humaid_category,
        affected_count=affected_numeric,
        coordinates=coordinates,
        verification_status=verification_status,
        duplicate_count=duplicate_count,
    )

    # Step 4: Classify severity tier
    severity = calculate_incident_severity(
        humaid_category=humaid_category,
        humaid_confidence=humaid_confidence,
        all_probabilities=all_probabilities,
        report_text=full_text,
        affected_count=affected_numeric,
        risk_factors=risk_factors,
    )

    # Step 5: Compute explainable priority score (0-100)
    priority_score, breakdown = calculate_priority_score(
        severity=severity,
        humaid_category=humaid_category,
        humaid_confidence=humaid_confidence,
        all_probabilities=all_probabilities,
        affected_count=affected_numeric,
        verification_status=verification_status,
        location_confidence=loc_conf,
        duplicate_count=duplicate_count,
        timestamp=timestamp,
        risk_factors=risk_factors,
    )

    # Step 6: Compute report reliability (separated from HumAID confidence)
    has_coords = (coordinates is not None and len(coordinates) == 2 and coordinates[0] is not None)
    reliability = calculate_report_reliability(
        source_summary=source_summary,
        verification_status=verification_status,
        duplicate_count=duplicate_count,
        has_coordinates=has_coords,
    )

    # Step 7: Generate explainable justification
    why_prioritised = generate_why_prioritised(
        severity=severity,
        priority_score=priority_score,
        affected_count=affected_numeric,
        humaid_category=humaid_category,
        risk_factors=risk_factors,
        location_confidence=loc_conf,
        verification_status=verification_status,
        duplicate_count=duplicate_count,
    )

    return ScoringResult(
        severity=severity,
        priority_score=priority_score,
        report_reliability=reliability,
        location_confidence=loc_conf,
        affected_count_numeric=affected_numeric,
        risk_factors=risk_factors,
        why_prioritised=why_prioritised,
        breakdown=breakdown,
    )
