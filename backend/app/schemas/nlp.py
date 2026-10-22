"""
Pydantic schemas for NLP classification endpoints
"""

from typing import Dict, Optional
from pydantic import BaseModel, Field

DEFAULT_DISCLAIMER = (
    "RESQNET AI Automated NLP Prediction. Not a verified emergency report. "
    "This classification suggests the likely situational category of the text "
    "and does NOT confirm incident authenticity, verify coordinates, or dispatch units. "
    "All mission-critical emergency actions require human coordinator review."
)


class TextClassificationRequest(BaseModel):
    text: Optional[str] = Field(
        default=None,
        description="Disaster report message, caller transcript, or sensor text.",
        examples=["There is severe flooding near the bridge and people need immediate water rescue."],
    )
    return_all_probabilities: bool = Field(
        default=True,
        description="Whether to return probability breakdown across all 10 HumAID categories.",
    )


class ClassificationResponse(BaseModel):
    input_text: str
    cleaned_text: str
    predicted_category: str
    confidence: float
    all_probabilities: Dict[str, float] = Field(default_factory=dict)
    disclaimer: str = Field(default=DEFAULT_DISCLAIMER)
    status: str
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    model_dir: Optional[str] = None
    model_loaded: Optional[bool] = None
    model_error: Optional[str] = None
    database_connected: Optional[bool] = None
    disclaimer: str = Field(default=DEFAULT_DISCLAIMER)
