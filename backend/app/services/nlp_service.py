"""
RESQNET AI — NLP Integration Service

Connects backend services and API routers to the fine-tuned HumAID DistilBERT model.
Uses data/nlp/src/inference.py without duplicating model code or weights.
"""

import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from backend.app.core.config import settings

logger = logging.getLogger("RESQNET.NLPService")

# Ensure project root is in sys.path so data.nlp.src can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from data.nlp.src.inference import (
        RESQNET_DISCLAIMER,
        ResqnetClassifier,
        classify_incident_report,
        classify_report,
        get_classifier,
    )
except ImportError as e:
    logger.error(f"Failed to import inference module from data/nlp/src: {e}")
    RESQNET_DISCLAIMER = "RESQNET AI Automated NLP Prediction."
    get_classifier = None
    classify_report = None
    classify_incident_report = None


def get_model_path() -> Path:
    """Return verified path to local model weights."""
    path = Path(settings.MODEL_DIR)
    if not path.exists():
        fallback = PROJECT_ROOT / "data" / "nlp" / "models" / "resqnet_distilbert"
        if fallback.exists():
            return fallback
    return path


def check_model_readiness() -> Dict[str, Any]:
    """
    Verify model artifacts exist locally and are ready for inference.
    Does NOT claim ready if required files are missing.
    """
    model_path = get_model_path()
    weights_exist = (model_path / "model.safetensors").exists() or (model_path / "pytorch_model.bin").exists()
    labels_exist = (model_path / "label_mapping.json").exists()
    config_exist = (model_path / "config.json").exists()

    is_ready = model_path.exists() and weights_exist and labels_exist and config_exist

    return {
        "is_ready": is_ready,
        "model_dir": str(model_path),
        "weights_present": weights_exist,
        "labels_present": labels_exist,
        "config_present": config_exist,
    }


def classify_text_message(text: Optional[str], return_all_probabilities: bool = True) -> Dict[str, Any]:
    """
    Classify a single emergency text message using the local DistilBERT classifier.
    """
    if classify_report is None:
        return {
            "input_text": text or "",
            "cleaned_text": "",
            "predicted_category": "unclassified_module_error",
            "confidence": 0.0,
            "all_probabilities": {},
            "disclaimer": RESQNET_DISCLAIMER,
            "status": "MODULE_IMPORT_ERROR",
        }

    model_path = get_model_path()
    return classify_report(
        text=text,
        model_dir=model_path,
        return_all_probabilities=return_all_probabilities,
    )


def enrich_incident_with_nlp(report: Dict[str, Any], text_field: Optional[str] = None) -> Dict[str, Any]:
    """
    Classify report narrative and attach HumAID categorization.
    Preserves all existing report fields.
    """
    if classify_incident_report is None:
        enriched = dict(report)
        enriched["nlp_status"] = "MODULE_IMPORT_ERROR"
        return enriched

    model_path = get_model_path()
    return classify_incident_report(
        report=report,
        text_field=text_field,
        model_dir=model_path,
        return_all_probabilities=True,
    )
