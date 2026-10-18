"""
Tests for HumAID DistilBERT NLP classification and model selection
"""

from pathlib import Path
import pytest
from backend.app.core.config import settings
from backend.app.services.nlp_service import (
    get_model_path,
    check_model_readiness,
    validate_model_artifacts,
)
from data.nlp.src.inference import (
    get_classifier,
    reset_classifier,
    classify_report,
)


def test_model_selection_prefers_full_model():
    """Verify that get_model_path selects resqnet_distilbert_full when valid."""
    selected = get_model_path()
    assert "resqnet_distilbert_full" in str(selected)
    readiness = check_model_readiness()
    assert readiness["is_ready"] is True
    assert "resqnet_distilbert_full" in readiness["model_dir"]
    assert readiness["weights_present"] is True
    assert readiness["labels_present"] is True
    assert readiness["config_present"] is True
    assert readiness["tokenizer_present"] is True


def test_model_selection_fallback_when_configured_invalid(monkeypatch, tmp_path):
    """Verify that when configured model is missing or invalid, it falls back to resqnet_distilbert."""
    monkeypatch.setattr(settings, "MODEL_DIR", str(tmp_path / "nonexistent_model"))
    selected = get_model_path()
    assert "resqnet_distilbert" in str(selected)
    assert "resqnet_distilbert_full" not in str(selected)
    readiness = check_model_readiness()
    assert readiness["is_ready"] is True
    assert "resqnet_distilbert" in readiness["model_dir"]


def test_readiness_endpoint_reports_active_model(client):
    """GET /api/v1/health/ready and /api/v1/health report the selected model directory."""
    resp_ready = client.get("/api/v1/health/ready")
    assert resp_ready.status_code == 200
    ready_data = resp_ready.json()
    assert ready_data["status"] == "READY"
    assert "resqnet_distilbert_full" in ready_data["model_dir"]

    resp_health = client.get("/api/v1/health")
    assert resp_health.status_code == 200
    health_data = resp_health.json()
    assert health_data["status"] == "HEALTHY"
    assert health_data["model_loaded"] is True
    assert "resqnet_distilbert_full" in health_data["model_dir"]


def test_classifier_singleton_caching():
    """Verify get_classifier reuses cached instance across requests and does not reload."""
    reset_classifier()
    model_path = get_model_path()
    c1 = get_classifier(model_dir=model_path)
    c2 = get_classifier(model_dir=model_path)
    assert c1 is c2


def test_classify_sample_earthquake_message(client):
    """POST /api/v1/classify with earthquake entrapment message is served by new model."""
    sample_text = "Several people are trapped after an earthquake."
    response = client.post("/api/v1/classify", json={"text": sample_text, "return_all_probabilities": True})
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "SUCCESS"
    assert data["input_text"] == sample_text
    assert data["predicted_category"] == "displaced_people_and_evacuations"
    assert round(data["confidence"], 3) == 0.654
    assert len(data["all_probabilities"]) == 10
    assert "displaced_people_and_evacuations" in data["all_probabilities"]
    assert "RESQNET AI Automated NLP Prediction" in data["disclaimer"]


def test_classify_sample_disaster_message(client):
    """POST /api/v1/classify with realistic disaster message."""
    sample_text = "There is flooding near the bridge and people need immediate water rescue."
    response = client.post("/api/v1/classify", json={"text": sample_text, "return_all_probabilities": True})
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "SUCCESS"
    assert data["input_text"] == sample_text
    assert 0.0 <= data["confidence"] <= 1.0
    assert len(data["all_probabilities"]) == 10
    assert "RESQNET AI Automated NLP Prediction" in data["disclaimer"]


def test_classify_empty_message(client):
    """POST /api/v1/classify with empty message should handle gracefully without crashing."""
    response = client.post("/api/v1/classify", json={"text": "   "})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "EMPTY_OR_INVALID_INPUT"
    assert data["confidence"] == 0.0
    assert data["predicted_category"] == "unclassified_empty_message"


def test_classify_report_endpoint(client):
    """POST /api/v1/reports/classify should preserve report structure while attaching HumAID category."""
    payload = {
        "id": "RQN-TEST-REPORT",
        "title": "Hospital emergency power outage",
        "sector": "Sector 4",
        "priorityScore": 85,
        "verificationStatus": "unverified",
        "report_text": "Generator failed, ICU patients in critical condition without electricity.",
    }
    response = client.post("/api/v1/reports/classify", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Original fields preserved
    assert data["id"] == "RQN-TEST-REPORT"
    assert data["title"] == "Hospital emergency power outage"
    assert data["priorityScore"] == 85
    assert data["verificationStatus"] == "unverified"
    assert data["report_text"] == payload["report_text"]

    # NLP predictions attached
    assert "humaid_category" in data
    assert "humaid_confidence" in data
    assert 0.0 <= data["humaid_confidence"] <= 1.0
    assert data["nlp_status"] == "SUCCESS"


def test_missing_model_files_produce_error_status(tmp_path):
    """Invalid or missing model files produce MODEL_UNAVAILABLE instead of false success."""
    empty_dir = tmp_path / "empty_model"
    empty_dir.mkdir()
    result = classify_report("Flooding in downtown area", model_dir=empty_dir)
    assert result["status"] == "MODEL_UNAVAILABLE"
    assert result["predicted_category"] == "unclassified_model_unavailable"
    assert result["confidence"] == 0.0
    assert "error" in result


def test_validate_model_artifacts_requires_all_files(tmp_path):
    """Verify that validate_model_artifacts requires config, labels, weights, and tokenizer."""
    model_dir = tmp_path / "partial_model"
    model_dir.mkdir()
    assert validate_model_artifacts(model_dir)["valid"] is False

    (model_dir / "config.json").write_text("{}")
    assert validate_model_artifacts(model_dir)["valid"] is False

    (model_dir / "label_mapping.json").write_text("{}")
    assert validate_model_artifacts(model_dir)["valid"] is False

    (model_dir / "model.safetensors").write_text("weights")
    assert validate_model_artifacts(model_dir)["valid"] is False

    (model_dir / "tokenizer.json").write_text("{}")
    assert validate_model_artifacts(model_dir)["valid"] is True

