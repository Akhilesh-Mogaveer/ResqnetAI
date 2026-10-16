"""
RESQNET AI — Production Inference Engine

Provides a reusable, lightweight inference class (ResqnetClassifier)
designed for direct integration with web services (e.g. FastAPI backend)
and command-line batch inference.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# Force PyTorch backend for Transformers
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

try:
    from .preprocessing import LabelMapper, clean_text
except (ImportError, ValueError):
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from preprocessing import LabelMapper, clean_text

logger = logging.getLogger("RESQNET.Inference")

# Standard disclaimer for emergency response coordination systems
RESQNET_DISCLAIMER = (
    "RESQNET AI Automated NLP Prediction. Not a verified emergency report. "
    "This classification suggests the likely situational category of the text "
    "and does NOT confirm incident authenticity, verify coordinates, or dispatch units. "
    "All mission-critical emergency actions require human coordinator review."
)


class ResqnetClassifier:
    """
    Production-ready classifier wrapper for RESQNET AI text classification.
    Can be instantiated once and reused across FastAPI request handlers.
    """

    def __init__(
        self,
        model_dir: Union[str, Path] = "data/nlp/models/resqnet_distilbert",
        device: Optional[str] = None,
        max_length: int = 128,
    ):
        model_path = Path(model_dir)
        # Attempt resolution relative to repo root if relative path doesn't exist directly
        if not model_path.exists():
            repo_root = Path(__file__).resolve().parents[3]
            candidate = repo_root / model_dir
            if candidate.exists():
                model_path = candidate

        self.model_dir = model_path
        self.max_length = max_length

        if not self.model_dir.exists():
            raise FileNotFoundError(
                f"Model directory '{self.model_dir}' does not exist. "
                "Ensure you have trained or extracted the model weights before running inference."
            )

        # Determine target device
        if device is None or device == "auto":
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)

        logger.info(f"Loading RESQNET classifier from '{self.model_dir}' onto {self.device}...")

        # 1. Load label mapping
        label_file = self.model_dir / "label_mapping.json"
        if not label_file.exists():
            raise FileNotFoundError(f"Missing label_mapping.json inside {self.model_dir}")
        self.label_mapper = LabelMapper.load(label_file)

        # 2. Check model weight file
        has_weights = (
            (self.model_dir / "model.safetensors").exists()
            or (self.model_dir / "pytorch_model.bin").exists()
        )
        if not has_weights:
            raise FileNotFoundError(
                f"Missing model weights ('model.safetensors' or 'pytorch_model.bin') in {self.model_dir}"
            )

        # 3. Load tokenizer and model weights strictly from local directory (no remote downloads)
        self.tokenizer = AutoTokenizer.from_pretrained(str(self.model_dir), local_files_only=True)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            str(self.model_dir),
            local_files_only=True,
        )
        self.model.to(self.device)
        self.model.eval()

        logger.info(
            f"Classifier successfully loaded. Classes ({len(self.label_mapper)}): "
            f"{self.label_mapper.labels}"
        )

    def predict(
        self,
        text: Optional[str],
        return_all_probabilities: bool = False,
    ) -> Dict[str, Any]:
        """
        Classify a single emergency text message.

        Parameters
        ----------
        text : Optional[str]
            Raw text message.
        return_all_probabilities : bool
            Whether to include complete probability distribution across all classes.

        Returns
        -------
        Dict[str, Any]
            Structured prediction output including predicted category, confidence,
            and safety disclaimer.
        """
        cleaned = clean_text(text)
        if not cleaned:
            return {
                "input_text": text or "",
                "cleaned_text": "",
                "predicted_category": "unclassified_empty_message",
                "confidence": 0.0,
                "all_probabilities": {c: 0.0 for c in self.label_mapper.labels}
                if return_all_probabilities
                else {},
                "disclaimer": RESQNET_DISCLAIMER,
                "status": "EMPTY_OR_INVALID_INPUT",
            }

        encoded = self.tokenizer(
            cleaned,
            padding=False,
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
        )
        inputs = {k: v.to(self.device) for k, v in encoded.items() if k != "token_type_ids"}

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1).squeeze(0).cpu().numpy()

        pred_idx = int(probs.argmax())
        pred_label = self.label_mapper.decode(pred_idx)
        confidence = float(probs[pred_idx])

        result = {
            "input_text": text,
            "cleaned_text": cleaned,
            "predicted_category": pred_label,
            "confidence": round(confidence, 4),
            "disclaimer": RESQNET_DISCLAIMER,
            "status": "SUCCESS",
        }

        if return_all_probabilities:
            result["all_probabilities"] = {
                self.label_mapper.decode(i): round(float(p), 4)
                for i, p in enumerate(probs)
            }

        return result

    def predict_batch(
        self,
        texts: List[str],
        batch_size: int = 32,
        return_all_probabilities: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Classify a list of emergency messages in efficient mini-batches.
        """
        if not texts:
            return []

        results = []
        for i in range(0, len(texts), batch_size):
            batch_slice = texts[i : i + batch_size]
            cleaned_batch = [clean_text(t) for t in batch_slice]

            # Track valid vs empty indices
            valid_indices = [idx for idx, t in enumerate(cleaned_batch) if t]
            valid_texts = [cleaned_batch[idx] for idx in valid_indices]

            batch_results = [None] * len(batch_slice)

            # Mark empty inputs
            for idx, raw_t in enumerate(batch_slice):
                if not cleaned_batch[idx]:
                    batch_results[idx] = {
                        "input_text": raw_t,
                        "cleaned_text": "",
                        "predicted_category": "unclassified_empty_message",
                        "confidence": 0.0,
                        "all_probabilities": {c: 0.0 for c in self.label_mapper.labels}
                        if return_all_probabilities
                        else {},
                        "disclaimer": RESQNET_DISCLAIMER,
                        "status": "EMPTY_OR_INVALID_INPUT",
                    }

            if valid_texts:
                encoded = self.tokenizer(
                    valid_texts,
                    padding=True,
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors="pt",
                )
                inputs = {k: v.to(self.device) for k, v in encoded.items() if k != "token_type_ids"}

                with torch.no_grad():
                    outputs = self.model(**inputs)
                    probs = torch.softmax(outputs.logits, dim=-1).cpu().numpy()

                for j, original_idx in enumerate(valid_indices):
                    prob_vector = probs[j]
                    pred_idx = int(prob_vector.argmax())
                    pred_label = self.label_mapper.decode(pred_idx)
                    conf = float(prob_vector[pred_idx])

                    item = {
                        "input_text": batch_slice[original_idx],
                        "cleaned_text": valid_texts[j],
                        "predicted_category": pred_label,
                        "confidence": round(conf, 4),
                        "disclaimer": RESQNET_DISCLAIMER,
                        "status": "SUCCESS",
                    }
                    if return_all_probabilities:
                        item["all_probabilities"] = {
                            self.label_mapper.decode(c_idx): round(float(p), 4)
                            for c_idx, p in enumerate(prob_vector)
                        }
                    batch_results[original_idx] = item

            results.extend(batch_results)

        return results


# Module-level cached instance for backend services / FastAPI routers
_GLOBAL_CLASSIFIER: Optional[ResqnetClassifier] = None


def get_classifier(
    model_dir: Optional[Union[str, Path]] = None,
    device: Optional[str] = None,
    force_reload: bool = False,
) -> ResqnetClassifier:
    """
    Retrieve or initialize the singleton ResqnetClassifier instance.
    Loads once from the local directory and reuses across web/service requests.

    Parameters
    ----------
    model_dir : Optional[Union[str, Path]]
        Path to local model directory (defaults to 'data/nlp/models/resqnet_distilbert').
    device : Optional[str]
        Target device ('cpu', 'cuda', or 'auto').
    force_reload : bool
        If True, re-instantiates the classifier.

    Returns
    -------
    ResqnetClassifier
        Loaded classifier instance.
    """
    global _GLOBAL_CLASSIFIER

    if model_dir is not None:
        target_path = Path(model_dir)
        # If caller specifies a custom model_dir that differs from cached, instantiate fresh
        if _GLOBAL_CLASSIFIER is None or force_reload or _GLOBAL_CLASSIFIER.model_dir != target_path:
            return ResqnetClassifier(model_dir=target_path, device=device)
        return _GLOBAL_CLASSIFIER

    # Default model directory
    default_dir = Path("data/nlp/models/resqnet_distilbert")
    if _GLOBAL_CLASSIFIER is None or force_reload:
        _GLOBAL_CLASSIFIER = ResqnetClassifier(model_dir=default_dir, device=device)

    return _GLOBAL_CLASSIFIER


def classify_report(
    text: Optional[str],
    model_dir: Optional[Union[str, Path]] = None,
    return_all_probabilities: bool = True,
) -> Dict[str, Any]:
    """
    Reusable backend inference function to classify a single emergency message or report.
    Gracefully handles empty/invalid text, missing model files, or corrupt weights without crashing.

    Parameters
    ----------
    text : Optional[str]
        Raw incident or emergency report text.
    model_dir : Optional[Union[str, Path]]
        Optional override for local model directory.
    return_all_probabilities : bool
        Whether to return the full probability distribution over all HumAID classes.

    Returns
    -------
    Dict[str, Any]
        Dictionary with input_text, cleaned_text, predicted_category, confidence,
        all_probabilities, disclaimer, and status.
    """
    # 1. Gracefully handle empty or invalid text
    if text is None or not isinstance(text, str) or not text.strip():
        return {
            "input_text": "" if text is None else str(text),
            "cleaned_text": "",
            "predicted_category": "unclassified_empty_message",
            "confidence": 0.0,
            "all_probabilities": {},
            "disclaimer": RESQNET_DISCLAIMER,
            "status": "EMPTY_OR_INVALID_INPUT",
        }

    # 2. Attempt model loading with graceful fallback for missing files
    try:
        classifier = get_classifier(model_dir=model_dir)
    except (FileNotFoundError, OSError, Exception) as err:
        logger.error(f"RESQNET classifier unavailable: {err}")
        return {
            "input_text": text,
            "cleaned_text": clean_text(text),
            "predicted_category": "unclassified_model_unavailable",
            "confidence": 0.0,
            "all_probabilities": {},
            "disclaimer": RESQNET_DISCLAIMER,
            "status": "MODEL_UNAVAILABLE",
            "error": str(err),
        }

    # 3. Perform prediction
    return classifier.predict(text, return_all_probabilities=return_all_probabilities)


def classify_incident_report(
    report: Dict[str, Any],
    text_field: Optional[str] = None,
    model_dir: Optional[Union[str, Path]] = None,
    return_all_probabilities: bool = True,
) -> Dict[str, Any]:
    """
    Connect a submitted incident report to the HumAID classifier.
    Preserves all existing application fields, coordinates, priorities, and original report text,
    and appends predicted HumAID category and confidence scores.

    Parameters
    ----------
    report : Dict[str, Any]
        Submitted incident report dictionary containing metadata and text.
    text_field : Optional[str]
        Explicit field name containing report text. If None, inspects common candidate fields.
    model_dir : Optional[Union[str, Path]]
        Local model directory path.
    return_all_probabilities : bool
        Whether to return complete probability distribution.

    Returns
    -------
    Dict[str, Any]
        Original report preserved with attached 'humaid_category', 'humaid_confidence',
        'all_probabilities', 'nlp_status', and 'nlp_disclaimer'.
    """
    if not isinstance(report, dict):
        return {
            "status": "INVALID_REPORT_STRUCTURE",
            "error": f"Expected dict report, received {type(report).__name__}",
            "disclaimer": RESQNET_DISCLAIMER,
        }

    # Clone report to preserve existing fields without mutation
    enriched_report = dict(report)

    # Locate report text from specified field or standard candidates
    if text_field:
        raw_val = enriched_report.get(text_field, "")
        report_text = raw_val if isinstance(raw_val, str) else ("" if raw_val is None else str(raw_val))
    else:
        # Check primary text field candidates first
        primary_text_keys = ["report_text", "text", "tweet_text", "message", "description"]
        found_key = False
        report_text = ""
        for key in primary_text_keys:
            if key in enriched_report:
                val = enriched_report[key]
                report_text = val if isinstance(val, str) else ("" if val is None else str(val))
                found_key = True
                break

        # If none of the primary text keys exist in the report at all, check secondary fallbacks
        if not found_key:
            for key in ["signalSynthesis", "title"]:
                if key in enriched_report and enriched_report[key]:
                    val = enriched_report[key]
                    if isinstance(val, str) and val.strip():
                        report_text = val
                        break

    # If no candidate text found, treat as empty message
    if report_text is None:
        report_text = ""

    # Ensure original text is explicitly preserved under 'original_report_text' if not already present
    if "original_report_text" not in enriched_report:
        enriched_report["original_report_text"] = report_text

    # Run inference
    pred = classify_report(
        report_text,
        model_dir=model_dir,
        return_all_probabilities=return_all_probabilities,
    )

    enriched_report["humaid_category"] = pred["predicted_category"]
    enriched_report["humaid_confidence"] = pred["confidence"]
    enriched_report["all_probabilities"] = pred.get("all_probabilities", {})
    enriched_report["nlp_status"] = pred["status"]
    enriched_report["nlp_disclaimer"] = pred["disclaimer"]

    return enriched_report

