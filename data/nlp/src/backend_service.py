"""
RESQNET AI — Backend Service and API Integration Module

Connects the trained HumAID DistilBERT text classification model to the
RESQNET AI backend architecture. Exposes reusable service handlers and an
optional FastAPI router / application for serving HTTP classification requests.

Guarantees:
- Model and tokenizer load strictly from the local directory (no remote downloads).
- Original report text and existing application features are preserved.
- Returns predicted HumAID category, model confidence, and safety disclaimers.
- Handles empty/invalid messages and missing model files gracefully without crashing.
- Maintains strict distinction between NLP categorization and mission actions:
  does NOT verify incidents, extract coordinates, detect duplicates, or
  independently determine emergency priority.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field

try:
    from .inference import (
        RESQNET_DISCLAIMER,
        ResqnetClassifier,
        classify_incident_report,
        classify_report,
        get_classifier,
    )
except (ImportError, ValueError):
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from inference import (
        RESQNET_DISCLAIMER,
        ResqnetClassifier,
        classify_incident_report,
        classify_report,
        get_classifier,
    )

logger = logging.getLogger("RESQNET.BackendService")


# ---------------------------------------------------------------------------
# Pydantic Schemas for Type Safety and OpenAPI Documentation
# ---------------------------------------------------------------------------

class TextClassificationRequest(BaseModel):
    """Payload for classifying an isolated raw text message or caller transcript."""
    text: Optional[str] = Field(
        default=None,
        description="Raw disaster-related message, social media post, or caller transcript.",
        examples=["There is flooding near the bridge and people need rescue."],
    )
    return_all_probabilities: bool = Field(
        default=True,
        description="Whether to include probabilities across all 10 HumAID categories.",
    )


class ClassificationResponse(BaseModel):
    """Standardized response from the HumAID DistilBERT classifier."""
    input_text: str = Field(description="Preserved raw input text.")
    cleaned_text: str = Field(description="Normalized text used for inference.")
    predicted_category: str = Field(description="Predicted HumAID situation category.")
    confidence: float = Field(description="Probability score for predicted class [0.0 - 1.0].")
    all_probabilities: Dict[str, float] = Field(
        default_factory=dict,
        description="Probability distribution across all HumAID categories.",
    )
    disclaimer: str = Field(
        default=RESQNET_DISCLAIMER,
        description="Safety boundary notice emphasizing coordinator-in-the-loop requirement.",
    )
    status: str = Field(
        description="Execution status ('SUCCESS', 'EMPTY_OR_INVALID_INPUT', 'MODEL_UNAVAILABLE')."
    )
    error: Optional[str] = Field(default=None, description="Error detail if unavailable.")


class IncidentReportPayload(BaseModel):
    """
    Submitted incident report from citizen reporting, sensor networks, or coordinators.
    Preserves all domain metadata while allowing optional message/report_text fields.
    """
    id: Optional[str] = Field(default=None, description="Unique incident identifier.")
    title: Optional[str] = Field(default=None, description="Incident title or headline.")
    type: Optional[str] = Field(default=None, description="Preliminary incident type.")
    sector: Optional[str] = Field(default=None, description="Geographic sector or zone.")
    locationName: Optional[str] = Field(default=None, description="Human-readable location.")
    coordinates: Optional[List[float]] = Field(default=None, description="[Latitude, Longitude].")
    severity: Optional[str] = Field(default=None, description="Severity tag (e.g. critical, high).")
    priorityScore: Optional[int] = Field(default=None, description="Existing priority score.")
    verificationStatus: Optional[str] = Field(default=None, description="Human verification state.")
    responseStatus: Optional[str] = Field(default=None, description="Dispatch response state.")
    report_text: Optional[str] = Field(default=None, description="Primary report or message body.")
    text: Optional[str] = Field(default=None, description="Alternative text field.")
    signalSynthesis: Optional[str] = Field(default=None, description="Sensor or audio synthesis.")


# ---------------------------------------------------------------------------
# Reusable Service Layer Functions
# ---------------------------------------------------------------------------

def classify_text_service(
    request: Union[TextClassificationRequest, Dict[str, Any], str],
    model_dir: Optional[Union[str, Path]] = None,
) -> Dict[str, Any]:
    """
    Reusable backend service function to classify a crisis message.

    Parameters
    ----------
    request : Union[TextClassificationRequest, Dict[str, Any], str]
        Message input as a Pydantic model, dictionary, or raw string.
    model_dir : Optional[Union[str, Path]]
        Path to local model directory (defaults to 'data/nlp/models/resqnet_distilbert').

    Returns
    -------
    Dict[str, Any]
        Dictionary matching ClassificationResponse schema.
    """
    if isinstance(request, str):
        text = request
        return_probs = True
    elif isinstance(request, dict):
        text = request.get("text")
        return_probs = request.get("return_all_probabilities", True)
    elif isinstance(request, TextClassificationRequest):
        text = request.text
        return_probs = request.return_all_probabilities
    else:
        text = str(request)
        return_probs = True

    return classify_report(
        text=text,
        model_dir=model_dir,
        return_all_probabilities=return_probs,
    )


def process_incident_report_service(
    report: Union[IncidentReportPayload, Dict[str, Any]],
    text_field: Optional[str] = None,
    model_dir: Optional[Union[str, Path]] = None,
) -> Dict[str, Any]:
    """
    Reusable backend service function to enrich a submitted incident report.
    Preserves all original fields and attaches NLP predictions without overwriting
    existing status, verificationStatus, or coordinates.

    Parameters
    ----------
    report : Union[IncidentReportPayload, Dict[str, Any]]
        Incoming report dictionary or Pydantic model.
    text_field : Optional[str]
        Explicit field name to extract text from.
    model_dir : Optional[Union[str, Path]]
        Path to local model directory.

    Returns
    -------
    Dict[str, Any]
        Enriched report dictionary.
    """
    if isinstance(report, IncidentReportPayload):
        report_dict = report.model_dump(exclude_none=True)
    elif isinstance(report, dict):
        report_dict = dict(report)
    else:
        report_dict = {"text": str(report)}

    return classify_incident_report(
        report=report_dict,
        text_field=text_field,
        model_dir=model_dir,
        return_all_probabilities=True,
    )


def health_check_service(model_dir: Optional[Union[str, Path]] = None) -> Dict[str, Any]:
    """
    Check availability of the local HumAID DistilBERT model.
    """
    target_dir = Path(model_dir or "data/nlp/models/resqnet_distilbert")
    if not target_dir.exists():
        repo_root = Path(__file__).resolve().parents[3]
        candidate = repo_root / target_dir
        if candidate.exists():
            target_dir = candidate

    weights_exist = (
        (target_dir / "model.safetensors").exists()
        or (target_dir / "pytorch_model.bin").exists()
    )
    labels_exist = (target_dir / "label_mapping.json").exists()
    config_exist = (target_dir / "config.json").exists()

    is_healthy = weights_exist and labels_exist and config_exist

    return {
        "status": "HEALTHY" if is_healthy else "DEGRADED",
        "model_dir": str(target_dir),
        "weights_present": weights_exist,
        "labels_present": labels_exist,
        "config_present": config_exist,
        "disclaimer": RESQNET_DISCLAIMER,
    }


# ---------------------------------------------------------------------------
# FastAPI Router and Application Factory
# ---------------------------------------------------------------------------

def create_api_app():
    """
    Factory creating a FastAPI app with RESQNET NLP endpoints.
    Can be run standalone with `uvicorn` or mounted into a larger backend service.
    """
    try:
        from fastapi import FastAPI, HTTPException
        from fastapi.middleware.cors import CORSMiddleware
    except ImportError as e:
        raise ImportError(
            "FastAPI is required to run the HTTP server. Install with `pip install fastapi uvicorn`."
        ) from e

    app = FastAPI(
        title="RESQNET AI — Emergency NLP Classification Service",
        description=(
            "REST API providing HumAID DistilBERT text classification for emergency "
            "coordination and situational awareness.\n\n"
            f"**Safety Disclaimer:** {RESQNET_DISCLAIMER}"
        ),
        version="1.0.0",
    )

    # Enable CORS for local Vite development frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/v1/health")
    async def health_check():
        return health_check_service()

    @app.post("/api/v1/classify", response_model=ClassificationResponse)
    async def classify_text(payload: TextClassificationRequest):
        return classify_text_service(payload)

    @app.post("/api/v1/reports/classify")
    async def classify_report_endpoint(payload: Dict[str, Any]):
        return process_incident_report_service(payload)

    return app
