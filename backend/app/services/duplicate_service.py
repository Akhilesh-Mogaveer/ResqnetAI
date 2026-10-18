"""
RESQNET AI — Explainable Duplicate Incident Suggestion Service

Provides multi-factor, explainable duplicate candidate detection based on:
1. Spatial Proximity (Haversine distance in km)
2. Text Similarity (Lexical Jaccard & character n-gram overlap with shared emergency terms)
3. Temporal Proximity (Time delta in minutes/hours)
4. Category / Disaster Type Agreement (HumAID predictions & classification)

Includes human-in-the-loop coordinator merge and dismissal workflows with
immutable audit trail recording.
"""

import math
import re
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session

from backend.app.models.incident import Incident, AuditLog
from backend.app.schemas.incident import DuplicateSuggestion

logger = logging.getLogger("RESQNET.DuplicateService")

# Common English and generic filler stopwords to focus on emergency vocabulary
STOPWORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "can", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me",
    "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only",
    "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so",
    "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there",
    "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with",
    "you", "your", "yours", "yourself", "yourselves"
}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth's mean radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 3)


def _stem(w: str) -> str:
    """Lightweight English suffix stemmer for emergency incident terminology."""
    for suf in ["ing", "ed", "es", "s", "ation", "ment", "ly"]:
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            return w[: -len(suf)]
    return w


def _tokenize(text: str) -> List[str]:
    """Tokenize and normalize text into clean lower-cased alphanumeric words."""
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    tokens = [w for w in cleaned.split() if len(w) > 2 and w not in STOPWORDS]
    return tokens


def _char_ngrams(text: str, n: int = 3) -> Set[str]:
    """Generate character n-grams from text."""
    normalized = re.sub(r"\s+", " ", text.lower().strip())
    if len(normalized) < n:
        return {normalized} if normalized else set()
    return {normalized[i : i + n] for i in range(len(normalized) - n + 1)}


def compute_text_similarity(text1: str, text2: str) -> Tuple[float, List[str]]:
    """
    Compute explainable text similarity between two incident narratives.
    Uses stemmed word Dice coefficient and character 3-gram Dice coefficient.
    Returns (similarity_score_0_to_1, list_of_shared_emergency_keywords).
    """
    if not text1.strip() or not text2.strip():
        return (0.0, [])

    tokens1 = _tokenize(text1)
    tokens2 = _tokenize(text2)

    if not tokens1 or not tokens2:
        return (0.0, [])

    stems1 = {_stem(w) for w in tokens1}
    stems2 = {_stem(w) for w in tokens2}

    inter_stems = stems1 & stems2
    total_stems = len(stems1) + len(stems2)
    word_dice = (2.0 * len(inter_stems)) / total_stems if total_stems else 0.0

    # Character 3-gram Dice
    ng1 = _char_ngrams(text1, n=3)
    ng2 = _char_ngrams(text2, n=3)
    total_ng = len(ng1) + len(ng2)
    char_dice = (2.0 * len(ng1 & ng2)) / total_ng if total_ng else 0.0

    # Blended similarity score
    blended = 0.50 * word_dice + 0.50 * char_dice

    # Extract original shared vocabulary words
    shared_keywords = [w for w in set(tokens1) if _stem(w) in inter_stems]
    shared_keywords.sort(key=lambda x: len(x), reverse=True)

    return round(blended, 3), shared_keywords[:8]


def compute_time_difference_minutes(timestamp1: str, timestamp2: str) -> float:
    """Calculate the absolute difference in minutes between two ISO 8601 timestamps."""
    try:
        t1 = datetime.fromisoformat(timestamp1.replace("Z", "+00:00"))
        t2 = datetime.fromisoformat(timestamp2.replace("Z", "+00:00"))
        diff_sec = abs((t1 - t2).total_seconds())
        return round(diff_sec / 60.0, 1)
    except Exception:
        # Fallback to moderate delta if timestamp parsing encounters non-standard formats
        return 60.0


def score_duplicate_pair(primary: Incident, candidate: Incident) -> Optional[DuplicateSuggestion]:
    """
    Evaluate whether a candidate incident is a likely duplicate of primary.
    Returns DuplicateSuggestion with explainability reasons if score meets threshold.
    """
    if primary.id == candidate.id:
        return None

    # Skip if either incident was already merged as a duplicate
    if primary.is_duplicate or candidate.is_duplicate:
        return None
    if primary.duplicate_of_id or candidate.duplicate_of_id:
        return None
    if primary.responseStatus == "merged_duplicate" or candidate.responseStatus == "merged_duplicate":
        return None

    # Skip if already marked as duplicate of each other
    if candidate.duplicate_of_id == primary.id or primary.duplicate_of_id == candidate.id:
        return None

    # Skip if candidate was already dismissed on either side
    p_dismissed = primary.dismissed_duplicates or []
    c_dismissed = candidate.dismissed_duplicates or []
    if candidate.id in p_dismissed or primary.id in c_dismissed:
        return None

    # 1. Spatial Proximity
    has_p_coords = primary.coordinates is not None and len(primary.coordinates) == 2
    has_c_coords = candidate.coordinates is not None and len(candidate.coordinates) == 2

    if has_p_coords and has_c_coords:
        p_coords = primary.coordinates
        c_coords = candidate.coordinates
        distance_km = haversine_distance_km(p_coords[0], p_coords[1], c_coords[0], c_coords[1])

        # Distance score: 1.0 (<0.25km) down to 0.0 (>10km)
        if distance_km <= 0.25:
            spatial_score = 1.0
        elif distance_km <= 1.0:
            spatial_score = 0.85 - ((distance_km - 0.25) / 0.75) * 0.20
        elif distance_km <= 3.0:
            spatial_score = 0.65 - ((distance_km - 1.0) / 2.0) * 0.35
        elif distance_km <= 10.0:
            spatial_score = 0.30 - ((distance_km - 3.0) / 7.0) * 0.25
        else:
            spatial_score = 0.05
    else:
        # One or both have unknown coordinates; compare sectors/locations textually without assuming SF coords
        distance_km = -1.0
        if primary.sector and candidate.sector and primary.sector.lower() == candidate.sector.lower():
            spatial_score = 0.70  # Same sector match
        elif primary.locationName and candidate.locationName and (
            primary.locationName.lower() in candidate.locationName.lower() or
            candidate.locationName.lower() in primary.locationName.lower()
        ):
            spatial_score = 0.80  # Location name overlap
        else:
            spatial_score = 0.30  # Unknown coordinates

    # 2. Text Similarity
    p_text = f"{primary.title}. {primary.original_report_text or primary.report_text or ''} {primary.locationName} {primary.sector}"
    c_text = f"{candidate.title}. {candidate.original_report_text or candidate.report_text or ''} {candidate.locationName} {candidate.sector}"
    text_sim, shared_keywords = compute_text_similarity(p_text, c_text)

    # 3. Temporal Proximity
    time_diff_min = compute_time_difference_minutes(primary.timestamp, candidate.timestamp)
    if time_diff_min <= 30.0:
        time_score = 1.0
    elif time_diff_min <= 120.0:
        time_score = 0.85
    elif time_diff_min <= 360.0:
        time_score = 0.65
    elif time_diff_min <= 1440.0:  # 24 hours
        time_score = 0.40
    else:
        time_score = 0.15

    # 4. Category Agreement
    category_match = False
    if primary.humaid_category and candidate.humaid_category:
        category_match = (primary.humaid_category == candidate.humaid_category)
    if not category_match and primary.type and candidate.type:
        category_match = (primary.type.lower() == candidate.type.lower())

    category_score = 1.0 if category_match else 0.25

    # Weighted Overall Score (0-100)
    raw_composite = (spatial_score * 0.35) + (text_sim * 0.35) + (time_score * 0.18) + (category_score * 0.12)
    overall_score = int(round(raw_composite * 100))

    # Threshold for surfacing suggestion:
    # Must have overall_score >= 45, OR (distance < 0.8km AND text_sim > 0.30)
    is_candidate = (overall_score >= 45) or (distance_km <= 0.8 and text_sim >= 0.30)
    if not is_candidate:
        return None

    # Determine confidence level
    if overall_score >= 75:
        confidence_level = "HIGH"
    elif overall_score >= 55:
        confidence_level = "MEDIUM"
    else:
        confidence_level = "LOW"

    # Generate Explainable Reasons
    reasons: List[str] = []

    # Spatial reason
    if distance_km < 0:
        if primary.sector and candidate.sector and primary.sector.lower() == candidate.sector.lower():
            reasons.append(f"Sector alignment: both reports cite {candidate.sector} (GPS coordinates unmapped).")
        else:
            reasons.append("Geographic distance unknown: reports lack mapped GPS coordinates.")
    elif distance_km < 0.3:
        reasons.append(f"Immediate proximity: reports are only {int(distance_km * 1000)} meters apart.")
    elif distance_km < 1.0:
        reasons.append(f"Close proximity: located within {distance_km:.2f} km in the same operational sector ({candidate.sector}).")
    elif distance_km < 3.0:
        reasons.append(f"Nearby sector: locations are {distance_km:.2f} km apart.")
    else:
        reasons.append(f"Regional distance: {distance_km:.2f} km apart.")

    # Temporal reason
    if time_diff_min < 15:
        reasons.append("Nearly concurrent: reported within 15 minutes of each other.")
    elif time_diff_min < 60:
        reasons.append(f"Reported {int(time_diff_min)} minutes apart during the same operational shift.")
    elif time_diff_min < 240:
        reasons.append(f"Reported within {round(time_diff_min / 60.0, 1)} hours of each other.")
    else:
        reasons.append(f"Time separation: {round(time_diff_min / 60.0, 1)} hours apart.")

    # Text reason
    if shared_keywords:
        reasons.append(
            f"Lexical overlap ({int(text_sim * 100)}%): shared emergency keywords: {', '.join([repr(k) for k in shared_keywords[:5]])}."
        )
    elif text_sim > 0.3:
        reasons.append(f"Narrative phrasing similarity: {int(text_sim * 100)}% text alignment.")

    # Category reason
    if category_match:
        cat_name = candidate.humaid_category or candidate.type
        reasons.append(f"Matching HumAID situational category: '{cat_name}'.")

    # Stable unique ID identifying this exact pair and direction
    suggestion_id = f"dup-{primary.id}-{candidate.id}"

    return DuplicateSuggestion(
        id=suggestion_id,
        primary_incident_id=primary.id,
        candidate_incident_id=candidate.id,
        review_status="pending",
        candidate_id=candidate.id,
        candidate_title=candidate.title,
        candidate_sector=candidate.sector,
        candidate_time_ago=candidate.timeAgo,
        candidate_severity=candidate.severity,
        candidate_category=candidate.humaid_category or candidate.type,
        overall_score=overall_score,
        confidence_level=confidence_level,
        text_similarity=text_sim,
        distance_km=distance_km,
        time_diff_minutes=time_diff_min,
        category_match=category_match,
        shared_keywords=shared_keywords,
        reasons=reasons,
        candidate_incident=candidate.to_dict(),
    )


def find_duplicate_suggestions(db: Session, incident_id: str) -> List[DuplicateSuggestion]:
    """Retrieve all ranked explainable duplicate candidates for a specific incident."""
    primary = db.query(Incident).filter(Incident.id == incident_id).first()
    if not primary:
        return []

    # If the incident itself is already a merged duplicate, it has no active duplicate suggestions
    if primary.is_duplicate or primary.duplicate_of_id or primary.responseStatus == "merged_duplicate":
        return []

    # Query all other active incidents that are not already merged duplicates
    candidates = (
        db.query(Incident)
        .filter(Incident.id != incident_id)
        .filter(Incident.is_duplicate == False)
        .filter(Incident.responseStatus != "merged_duplicate")
        .all()
    )
    suggestions: List[DuplicateSuggestion] = []

    for cand in candidates:
        suggestion = score_duplicate_pair(primary, cand)
        if suggestion:
            suggestions.append(suggestion)

    # Sort descending by overall score
    suggestions.sort(key=lambda s: s.overall_score, reverse=True)
    return suggestions


def merge_duplicate_incident(
    db: Session,
    primary_id: str,
    duplicate_id: str,
    operator: str = "Coordinator Jordan Davis",
    reason: str = "Corroborating report merged after human review.",
    update_corroboration: bool = True,
) -> Tuple[Optional[Incident], Optional[Incident], Optional[AuditLog]]:
    """
    Merge a duplicate report into a primary incident with human review.
    Updates corroboration notes, increments duplicate_count, preserves original texts,
    and creates audit records for both incidents.
    """
    if primary_id == duplicate_id:
        return None, None, None

    primary = db.query(Incident).filter(Incident.id == primary_id).first()
    duplicate = db.query(Incident).filter(Incident.id == duplicate_id).first()

    if not primary or not duplicate:
        return None, None, None

    # Verify neither is already merged as duplicate of another
    if duplicate.is_duplicate and duplicate.duplicate_of_id and duplicate.duplicate_of_id != primary.id:
        logger.warning(f"Candidate {duplicate.id} is already merged into {duplicate.duplicate_of_id}")
        return None, None, None

    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Update duplicate incident status while preserving original report text and provenance
    duplicate.is_duplicate = True
    duplicate.duplicate_of_id = primary.id
    duplicate.responseStatus = "merged_duplicate"
    # Verification status is kept separate: preserve duplicate.verificationStatus

    dup_notes = list(duplicate.notes)
    dup_notes.append({
        "id": f"n-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]}",
        "author": operator,
        "time": "Just now",
        "text": f"Merged as duplicate into primary incident {primary.id}. Reason: {reason}",
    })
    duplicate.notes = dup_notes

    # 2. Update primary incident
    primary.duplicate_count = (primary.duplicate_count or 0) + 1
    if update_corroboration:
        # Safely increment reliability due to multi-source corroboration
        primary.reportReliability = min(98, (primary.reportReliability or 70) + 5)

    primary_notes = list(primary.notes)
    corroboration_text = (
        f"Corroborating Report Merged ({duplicate.id}): '{duplicate.title}' from sector {duplicate.sector}. "
        f"Original message: '{duplicate.original_report_text or duplicate.report_text or 'N/A'}'. "
        f"Authorized by {operator}. Rationale: {reason}"
    )
    primary_notes.append({
        "id": f"n-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]}",
        "author": f"{operator} (Merge Authorization)",
        "time": "Just now",
        "text": corroboration_text,
    })
    primary.notes = primary_notes

    # 3. Create immutable audit log records for accountability on both records
    audit_merge_primary = AuditLog(
        id=f"aud-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]}",
        timestamp=now_iso,
        incidentId=primary.id,
        operator=operator,
        actionType="DUPLICATE_REPORT_MERGED",
        oldValue=f"Independent Report ({duplicate.id})",
        newValue=f"Primary: {primary.id} | Merged Duplicate: {duplicate.id}",
        reason=f"{reason} (Selected Primary: {primary.id}, Merged: {duplicate.id})",
    )
    db.add(audit_merge_primary)

    audit_merge_duplicate = AuditLog(
        id=f"aud-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]}b",
        timestamp=now_iso,
        incidentId=duplicate.id,
        operator=operator,
        actionType="DUPLICATE_REPORT_MERGED",
        oldValue=f"Independent Report ({duplicate.id})",
        newValue=f"Merged into Primary ({primary.id})",
        reason=f"{reason} (Selected Primary: {primary.id}, Merged: {duplicate.id})",
    )
    db.add(audit_merge_duplicate)

    db.commit()
    db.refresh(primary)
    db.refresh(duplicate)

    logger.info(f"Merged duplicate {duplicate.id} into primary {primary.id} by {operator}")
    return primary, duplicate, audit_merge_primary


def dismiss_duplicate_suggestion(
    db: Session,
    primary_id: str,
    duplicate_id: str,
    operator: str = "Coordinator Jordan Davis",
    reason: str = "Confirmed by coordinator as separate distinct incident.",
) -> Tuple[Optional[Incident], Optional[Incident], Optional[AuditLog]]:
    """
    Dismiss a candidate duplicate suggestion with coordinator audit justification.
    Persists dismissal reciprocally on both incidents and writes audit log.
    Leaves both incident records intact and separate.
    """
    if primary_id == duplicate_id:
        return None, None, None

    primary = db.query(Incident).filter(Incident.id == primary_id).first()
    duplicate = db.query(Incident).filter(Incident.id == duplicate_id).first()

    if not primary or not duplicate:
        return None, None, None

    now_iso = datetime.now(timezone.utc).isoformat()

    # Add to dismissed lists on both sides
    p_dismissed = list(primary.dismissed_duplicates)
    if duplicate_id not in p_dismissed:
        p_dismissed.append(duplicate_id)
        primary.dismissed_duplicates = p_dismissed

    d_dismissed = list(duplicate.dismissed_duplicates)
    if primary_id not in d_dismissed:
        d_dismissed.append(primary_id)
        duplicate.dismissed_duplicates = d_dismissed

    # Audit log on primary incident
    audit_dismiss_primary = AuditLog(
        id=f"aud-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]}",
        timestamp=now_iso,
        incidentId=primary.id,
        operator=operator,
        actionType="DUPLICATE_SUGGESTION_DISMISSED",
        oldValue=f"Suggested duplicate candidate: {duplicate.id}",
        newValue="Dismissed as Distinct Incident",
        reason=f"{reason} (Dismissed candidate: {duplicate.id})",
    )
    db.add(audit_dismiss_primary)

    # Audit log on candidate incident
    audit_dismiss_duplicate = AuditLog(
        id=f"aud-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]}b",
        timestamp=now_iso,
        incidentId=duplicate.id,
        operator=operator,
        actionType="DUPLICATE_SUGGESTION_DISMISSED",
        oldValue=f"Suggested duplicate candidate: {primary.id}",
        newValue="Dismissed as Distinct Incident",
        reason=f"{reason} (Dismissed candidate for: {primary.id})",
    )
    db.add(audit_dismiss_duplicate)

    db.commit()
    db.refresh(primary)
    db.refresh(duplicate)

    logger.info(f"Dismissed duplicate suggestion {duplicate.id} for incident {primary.id} by {operator}")
    return primary, duplicate, audit_dismiss_primary

