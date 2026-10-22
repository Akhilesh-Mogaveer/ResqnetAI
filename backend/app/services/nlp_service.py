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
_model_state: Dict[str, Any] = {}

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


def validate_model_artifacts(path: Path) -> Dict[str, Any]:
    """
    Validate that all required artifacts for HumAID DistilBERT inference are present.
    Inference code strictly requires:
      - config.json (model architecture definition)
      - label_mapping.json (label2id and id2label mappings)
      - model.safetensors or pytorch_model.bin (trained weights)
      - tokenizer.json or vocab.txt or tokenizer_config.json (tokenizer definition)
    """
    if not path.exists() or not path.is_dir():
        return {
            "valid": False,
            "config_present": False,
            "labels_present": False,
            "weights_present": False,
            "tokenizer_present": False,
        }

    config_ok = (path / "config.json").is_file()
    labels_ok = (path / "label_mapping.json").is_file()
    weights_ok = (path / "model.safetensors").is_file() or (path / "pytorch_model.bin").is_file()
    tokenizer_ok = (
        (path / "tokenizer.json").is_file()
        or (path / "vocab.txt").is_file()
        or (path / "tokenizer_config.json").is_file()
    )

    is_valid = config_ok and labels_ok and weights_ok and tokenizer_ok

    return {
        "valid": is_valid,
        "config_present": config_ok,
        "labels_present": labels_ok,
        "weights_present": weights_ok,
        "tokenizer_present": tokenizer_ok,
    }


def get_model_path() -> Path:
    """
    Return the active model path.
    Prefers the configured model when its required inference artifacts exist.
    Falls back to the baseline model if configured is incomplete or invalid.
    """
    configured = Path(settings.MODEL_DIR).expanduser().resolve()
    conf_status = validate_model_artifacts(configured)
    if conf_status["valid"]:
        return configured

    fallback = (PROJECT_ROOT / "data" / "nlp" / "models" / "resqnet_distilbert").resolve()
    if fallback.resolve() != configured.resolve():
        fallback_status = validate_model_artifacts(fallback)
        if fallback_status["valid"]:
            missing = [k.replace("_present", "") for k, v in conf_status.items() if k != "valid" and not v]
            logger.warning(
                "Configured model at '%s' is incomplete or missing artifacts (%s); "
                "using fallback model at '%s'",
                configured,
                ", ".join(missing) if missing else "directory not found",
                fallback,
            )
            return fallback

    logger.warning("Configured model path '%s' does not contain valid model artifacts.", configured)
    return configured


def check_model_readiness() -> Dict[str, Any]:
    """
    Verify model artifacts exist locally and are ready for inference.
    Does NOT claim ready if required files are missing.
    Reports the directory actually selected for classification.
    """
    model_path = get_model_path()
    status = validate_model_artifacts(model_path)
    path_key = str(model_path)
    state = _model_state.get(path_key, {})

    if state.get("path") != path_key or not state.get("attempted"):
        initialize_model(model_path)
        state = _model_state.get(path_key, {})

    return {
        "is_ready": status["valid"] and state.get("loaded", False),
        "model_dir": str(model_path),
        "weights_present": status["weights_present"],
        "labels_present": status["labels_present"],
        "config_present": status["config_present"],
        "tokenizer_present": status["tokenizer_present"],
        "model_error": state.get("error"),
    }


def initialize_model(model_path: Optional[Path] = None) -> Dict[str, Any]:
    """Load the selected model once and retain an explicit diagnostic state."""
    selected_path = model_path or get_model_path()
    path_key = str(selected_path)
    existing = _model_state.get(path_key)
    if existing and existing.get("attempted"):
        return existing

    state: Dict[str, Any] = {"path": path_key, "attempted": True, "loaded": False}
    artifact_status = validate_model_artifacts(selected_path)
    if not artifact_status["valid"]:
        state["error"] = (
            "Required model artifacts are missing or incomplete: "
            + ", ".join(key for key, present in artifact_status.items() if key != "valid" and not present)
        )
        logger.error("HumAID model unavailable at '%s': %s", selected_path, state["error"])
        _model_state[path_key] = state
        return state

    try:
        if get_classifier is None:
            raise ImportError("NLP inference module could not be imported.")
        get_classifier(model_dir=selected_path)
        state["loaded"] = True
        logger.info("HumAID model loaded and ready for inference from '%s'", selected_path)
    except Exception as err:
        state["error"] = str(err)
        logger.exception("HumAID model failed to load from '%s'", selected_path)
    _model_state[path_key] = state
    return state


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
