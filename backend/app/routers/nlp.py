"""
NLP inference routers for disaster message classification
"""

from typing import Any, Dict
from fastapi import APIRouter
from backend.app.schemas.nlp import (
    ClassificationResponse,
    TextClassificationRequest,
)
from backend.app.services.nlp_service import (
    classify_text_message,
    enrich_incident_with_nlp,
)

router = APIRouter(prefix="", tags=["NLP Classification"])


@router.post("/classify", response_model=ClassificationResponse)
def classify_text_endpoint(payload: TextClassificationRequest):
    """
    Classify raw crisis text or emergency dispatch message into a HumAID humanitarian category.

    Safety:
    Returns the predicted category and confidence scores. This classification is a triage suggestion,
    NOT automated incident verification, coordinate extraction, or an autonomous dispatch decision.
    """
    result = classify_text_message(
        text=payload.text,
        return_all_probabilities=payload.return_all_probabilities,
    )
    return ClassificationResponse(
        input_text=result.get("input_text", ""),
        cleaned_text=result.get("cleaned_text", ""),
        predicted_category=result.get("predicted_category", "unclassified"),
        confidence=result.get("confidence", 0.0),
        all_probabilities=result.get("all_probabilities", {}),
        disclaimer=result.get("disclaimer", ""),
        status=result.get("status", "SUCCESS"),
        error=result.get("error"),
    )


@router.post("/reports/classify")
def classify_report_endpoint(report: Dict[str, Any]):
    """
    Classify a submitted incident report dictionary.
    Preserves all original fields and attaches HumAID categorization output.
    """
    return enrich_incident_with_nlp(report)
