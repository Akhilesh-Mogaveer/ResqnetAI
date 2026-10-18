"""
RESQNET AI — Schemas for Report Structuring and Field Extraction
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ReportStructuringRequest(BaseModel):
    text: str = Field(description="Raw incoming distress message, call transcript, or sensor report.")


class StructuredFact(BaseModel):
    value: Any
    is_inferred: bool = False
    source: str = "reported_fact"  # "reported_fact" | "model_inferred" | "regex_rule" | "gazetteer_match"
    confidence: Optional[float] = None
    explanation: Optional[str] = None


class ReportStructuringResponse(BaseModel):
    original_text: str = Field(description="Preserved untouched raw input text.")
    cleaned_text: str = Field(description="Cleaned, normalized narrative.")
    
    # Hazard categorization (Model-Inferred)
    hazard_category: Optional[str] = Field(default=None, description="HumAID predicted disaster category.")
    hazard_category_confidence: Optional[float] = Field(default=None, description="NLP classification confidence (0-1).")
    hazard_category_inferred: bool = Field(default=True, description="Explicitly True: predicted by DistilBERT model.")
    all_probabilities: Dict[str, float] = Field(default_factory=dict, description="Distribution across all 11 HumAID categories.")
    
    # Suggested headline / title
    suggested_title: Optional[str] = Field(default=None, description="Distilled incident headline.")
    
    # Casualties / People affected
    casualty_estimate_text: Optional[str] = Field(default=None, description="Extracted people-affected description or null if missing.")
    casualty_numeric_count: Optional[int] = Field(default=None, description="Extracted numeric count or null if unknown.")
    casualty_inferred: bool = Field(default=True, description="Extracted via heuristic regex from unstructured text.")
    
    # Location clues
    location_clues: List[str] = Field(default_factory=list, description="Extracted landmarks, sectors, or place name mentions.")
    suggested_location_name: Optional[str] = Field(default=None, description="Top identified location candidate or landmark.")
    location_inferred: bool = Field(default=True)
    
    # Temporal clues
    time_references: List[str] = Field(default_factory=list, description="Extracted time references from text.")
    suggested_time_ago: Optional[str] = Field(default="Just now", description="Normalized relative timestamp.")
    
    # Urgency & Danger indicators
    urgent_indicators: List[str] = Field(default_factory=list, description="Detected life-threatening keywords (trapped, rising water, collapse, etc.).")
    urgency_level: str = Field(default="moderate", description="critical | high | moderate | low")
    
    # Separation of reported facts vs model-inferred fields
    reported_facts: Dict[str, Any] = Field(default_factory=dict, description="Fields explicitly stated in the source text.")
    inferred_fields: Dict[str, Any] = Field(default_factory=dict, description="Fields derived via NLP classification and heuristics.")
    uncertain_or_missing_fields: List[str] = Field(default_factory=list, description="Fields that could not be determined with confidence.")
    
    # Governance & Safety
    nlp_status: str = Field(default="SUCCESS", description="SUCCESS | SKIPPED | MODULE_IMPORT_ERROR")
    nlp_disclaimer: str = Field(
        default="RESQNET AI Automated NLP Extraction. Model inference must not be treated as report verification or ground truth."
    )
