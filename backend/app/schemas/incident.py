"""
Pydantic schemas for Incident Management, Verification, Overrides, and Audit Logs
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IncidentBase(BaseModel):
    title: str = Field(description="Incident headline.")
    type: str = Field(default="Emergency Incident", description="Incident classification type.")
    sector: str = Field(default="Sector Unspecified", description="City sector / operational area.")
    locationName: str = Field(default="Location Unspecified", description="Human-readable location.")
    coordinates: Optional[List[float]] = Field(default=None, description="[Latitude, Longitude] or null if unknown.")
    is_synthetic_location: bool = Field(default=False, description="True if coordinates are simulated demo coordinates.")
    location_source: Optional[str] = Field(default=None, description="user_supplied | geocoded | synthetic_demo | unmatched_unknown")
    severity: str = Field(default="moderate", description="critical | high | moderate | low")
    priorityScore: int = Field(default=50, ge=0, le=100, description="Priority score 0-100.")
    reportReliability: int = Field(default=70, ge=0, le=100)
    locationConfidence: int = Field(default=70, ge=0, le=100)
    peopleAffected: str = Field(default="Unknown count")
    affectedCountNumeric: int = Field(default=0)
    sourceSummary: str = Field(default="")
    signalSynthesis: str = Field(default="")
    whyPrioritised: str = Field(default="")
    riskFactors: List[str] = Field(default_factory=list)
    report_text: Optional[str] = Field(default=None, description="Report narrative or dispatch message.")
    rawReportText: Optional[str] = Field(default=None, description="Citizen/sensor report text (alias for report_text).")
    raw_report_text: Optional[str] = Field(default=None, description="Alias for report_text.")
    humaid_category: Optional[str] = Field(default=None, description="HumAID NLP classification category.")


class IncidentCreate(IncidentBase):
    id: Optional[str] = Field(default=None, description="Optional custom ID (e.g. RQN-0430); generated if omitted.")
    run_nlp_classification: bool = Field(default=True, description="Whether to run HumAID text classifier upon creation.")
    is_priority_overridden: Optional[bool] = Field(default=None, description="Set True if priorityScore was deliberately overridden by a coordinator.")
    is_severity_overridden: Optional[bool] = Field(default=None, description="Set True if severity was deliberately overridden by a coordinator.")


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    sector: Optional[str] = None
    locationName: Optional[str] = None
    coordinates: Optional[List[float]] = None
    severity: Optional[str] = None
    priorityScore: Optional[int] = Field(default=None, ge=0, le=100)
    reportReliability: Optional[int] = Field(default=None, ge=0, le=100)
    locationConfidence: Optional[int] = Field(default=None, ge=0, le=100)
    peopleAffected: Optional[str] = None
    affectedCountNumeric: Optional[int] = None
    sourceSummary: Optional[str] = None
    signalSynthesis: Optional[str] = None
    whyPrioritised: Optional[str] = None
    riskFactors: Optional[List[str]] = None
    notes: Optional[List[Dict[str, Any]]] = None


class VerificationStatusUpdate(BaseModel):
    verificationStatus: str = Field(description="unverified | under_review | verified | disputed")
    operator: str = Field(default="Coordinator", description="Identity of the operator performing change.")
    reason: str = Field(description="Operational rationale for verification state change.")


class ResponseStatusUpdate(BaseModel):
    responseStatus: str = Field(description="unassigned | triage | dispatched | on_scene | resolved | merged_duplicate")
    assignedTeam: Optional[str] = Field(default=None, description="Response squad or unit assigned.")
    operator: str = Field(default="Coordinator", description="Identity of the dispatch operator.")
    reason: str = Field(description="Operational rationale for dispatch update.")


class PriorityOverrideRequest(BaseModel):
    newPriority: int = Field(ge=0, le=100, description="New priority score set by coordinator.")
    operator: str = Field(default="Coordinator", description="Name/title of authorizing coordinator.")
    reason: str = Field(description="Mandatory reason justifying manual priority override.")


class DuplicateMergeRequest(BaseModel):
    duplicateIncidentId: str = Field(description="ID of the duplicate incident to merge into the primary incident.")
    primaryIncidentId: Optional[str] = Field(default=None, description="Explicit ID of the confirmed primary incident.")
    operator: str = Field(default="Coordinator Jordan Davis", description="Coordinator performing merge.")
    reason: str = Field(description="Operational justification for merging reports.")
    updateCorroboration: bool = Field(default=True, description="Whether to boost primary incident reliability due to corroboration.")


class DuplicateDismissRequest(BaseModel):
    duplicateIncidentId: str = Field(description="ID of the suggested incident to dismiss as not a duplicate.")
    operator: str = Field(default="Coordinator Jordan Davis", description="Coordinator dismissing suggestion.")
    reason: str = Field(default="Confirmed by coordinator as separate distinct incident.", description="Reason why reports are distinct.")


class DuplicateSuggestion(BaseModel):
    id: str = Field(description="Stable unique ID for this duplicate suggestion, e.g. dup-RQN-0444-RQN-0445.")
    primary_incident_id: str = Field(description="ID of the primary incident being evaluated.")
    candidate_incident_id: str = Field(description="ID of the candidate duplicate incident.")
    review_status: str = Field(default="pending", description="Review status of this suggestion (pending, merged, dismissed).")
    candidate_id: str
    candidate_title: str
    candidate_sector: str
    candidate_time_ago: str
    candidate_severity: str
    candidate_category: Optional[str] = None
    overall_score: int
    confidence_level: str  # HIGH | MEDIUM | LOW
    text_similarity: float
    distance_km: float
    time_diff_minutes: float
    category_match: bool
    shared_keywords: List[str]
    reasons: List[str]
    candidate_incident: Dict[str, Any]


class IncidentResponse(IncidentBase):
    id: str
    timeAgo: str
    timestamp: str
    verificationStatus: str
    responseStatus: str
    assignedTeam: Optional[str] = None
    notes: List[Dict[str, Any]] = Field(default_factory=list)
    original_report_text: Optional[str] = None
    rawReportText: Optional[str] = None
    humaid_category: Optional[str] = None
    humaidCategory: Optional[str] = None
    humaid_confidence: Optional[float] = None
    humaidConfidence: Optional[float] = None
    all_probabilities: Optional[Dict[str, float]] = None
    nlp_status: Optional[str] = None
    nlp_disclaimer: Optional[str] = None
    is_duplicate: bool = False
    duplicate_of_id: Optional[str] = None
    duplicate_count: int = 0
    is_synthetic_location: bool = False
    location_source: Optional[str] = None
    is_priority_overridden: bool = False
    is_severity_overridden: bool = False
    dismissed_duplicates: List[str] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class DuplicateMergeResponse(IncidentResponse):
    primary_incident_id: str
    merged_incident_id: str
    review_status: str = "merged"
    message: str
    merged_incident: Optional[Dict[str, Any]] = None
    audit_log_id: Optional[str] = None


class DuplicateDismissResponse(IncidentResponse):
    primary_incident_id: str
    candidate_incident_id: str
    dismissed_suggestion_id: str
    review_status: str = "dismissed"
    message: str
    audit_log_id: Optional[str] = None



class AuditLogResponse(BaseModel):
    id: str
    timestamp: str
    incidentId: str
    operator: str
    actionType: str
    oldValue: str
    newValue: str
    reason: str


class AttentionZoneResponse(BaseModel):
    id: str
    name: str
    signalDeviation: str
    signalCount: str
    confidence: str
    riskCategory: str
    populationAtRisk: str
    estimatedBarriers: str
    lastReportTime: str
    coordinates: List[float]
    scoutStatus: str
    notes: str
