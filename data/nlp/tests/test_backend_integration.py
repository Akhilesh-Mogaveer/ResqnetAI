"""
Unit and Integration Tests for RESQNET AI Backend Classifier Integration

Verifies:
1. Model loading strictly from local directory (data/nlp/models/resqnet_distilbert/).
2. Reusable inference function with realistic sample disaster messages.
3. Returning predicted HumAID category and confidence scores.
4. Complete preservation of original report text and existing application fields.
5. Graceful handling of invalid, whitespace, and empty messages.
6. Graceful handling of missing model files.
7. FastAPI HTTP endpoints for backend service integration.
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from data.nlp.src.inference import (
    RESQNET_DISCLAIMER,
    ResqnetClassifier,
    classify_incident_report,
    classify_report,
    get_classifier,
)
from data.nlp.src.backend_service import (
    classify_text_service,
    create_api_app,
    health_check_service,
    process_incident_report_service,
)


@pytest.fixture(scope="module")
def local_model_dir():
    """Path to the locally trained DistilBERT weights."""
    model_path = Path("data/nlp/models/resqnet_distilbert")
    if not model_path.exists():
        repo_root = Path(__file__).resolve().parents[3]
        model_path = repo_root / model_path
    if not (model_path / "model.safetensors").exists():
        pytest.skip("Model weights not found at local directory.")
    return model_path


# ---------------------------------------------------------------------------
# 1. Local Loading Verification
# ---------------------------------------------------------------------------

def test_local_model_and_tokenizer_loading(local_model_dir):
    """
    Verify model and tokenizer load strictly from local directory without downloading.
    """
    classifier = get_classifier(model_dir=local_model_dir)
    assert isinstance(classifier, ResqnetClassifier)
    assert classifier.model is not None
    assert classifier.tokenizer is not None
    assert len(classifier.label_mapper) == 10
    # Confirm label names match canonical HumAID categories
    assert "rescue_volunteering_or_donation_effort" in classifier.label_mapper.labels
    assert "infrastructure_and_utility_damage" in classifier.label_mapper.labels
    assert "requests_or_urgent_needs" in classifier.label_mapper.labels


# ---------------------------------------------------------------------------
# 2. Reusable Inference Function with Sample Disaster Messages
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "disaster_message,expected_status",
    [
        (
            "There is severe flooding near the bridge and people need immediate water rescue.",
            "SUCCESS",
        ),
        (
            "Multiple apartment complexes collapsed after the quake, victims trapped under rubble.",
            "SUCCESS",
        ),
        (
            "We urgently need clean drinking water, baby food, and blankets at the central evacuation center.",
            "SUCCESS",
        ),
        (
            "Volunteers are arriving at the community center to distribute food rations and dry clothes.",
            "SUCCESS",
        ),
    ],
)
def test_classify_sample_disaster_message(local_model_dir, disaster_message, expected_status):
    """
    Test classifying realistic disaster-related messages.
    Verifies category prediction, confidence bounds, probability distribution, and disclaimers.
    """
    result = classify_report(disaster_message, model_dir=local_model_dir, return_all_probabilities=True)

    # Status and preservation
    assert result["status"] == expected_status
    assert result["input_text"] == disaster_message
    assert len(result["cleaned_text"]) > 0

    # Predicted category must be one of the 10 HumAID classes
    classifier = get_classifier(model_dir=local_model_dir)
    assert result["predicted_category"] in classifier.label_mapper.labels

    # Confidence score must be a valid probability
    assert isinstance(result["confidence"], float)
    assert 0.0 <= result["confidence"] <= 1.0

    # Probabilities across all 10 classes
    assert "all_probabilities" in result
    assert len(result["all_probabilities"]) == 10
    prob_sum = sum(result["all_probabilities"].values())
    assert abs(prob_sum - 1.0) < 0.05  # Normalized softmax distribution

    # Safety disclaimer must be present
    assert RESQNET_DISCLAIMER in result["disclaimer"]


# ---------------------------------------------------------------------------
# 3. Incident Report Enrichment & Data Preservation
# ---------------------------------------------------------------------------

def test_classify_incident_report_preserves_application_data(local_model_dir):
    """
    Verify submitted incident reports preserve original report text and existing
    metadata while appending predicted HumAID category and confidence scores.
    """
    sample_incident = {
        "id": "RQN-0427",
        "title": "Structural collapse reported",
        "type": "Structural Collapse",
        "sector": "East Harbor District",
        "locationName": "Pier 14 Logistics Complex",
        "coordinates": [37.7845, -122.3965],
        "severity": "critical",
        "priorityScore": 94,
        "verificationStatus": "unverified",
        "responseStatus": "triage",
        "assignedTeam": None,
        "report_text": "Building partially collapsed after the tremor. 12 workers trapped under concrete beams on the 2nd floor, need search and rescue equipment immediately!",
        "customCoordinatorTag": "TF1-URGENT",
    }

    enriched = classify_incident_report(
        sample_incident,
        text_field="report_text",
        model_dir=local_model_dir,
    )

    # 1. Verify original fields are strictly preserved
    assert enriched["id"] == "RQN-0427"
    assert enriched["title"] == "Structural collapse reported"
    assert enriched["type"] == "Structural Collapse"
    assert enriched["sector"] == "East Harbor District"
    assert enriched["locationName"] == "Pier 14 Logistics Complex"
    assert enriched["coordinates"] == [37.7845, -122.3965]
    assert enriched["severity"] == "critical"
    assert enriched["priorityScore"] == 94
    assert enriched["verificationStatus"] == "unverified"
    assert enriched["responseStatus"] == "triage"
    assert enriched["assignedTeam"] is None
    assert enriched["customCoordinatorTag"] == "TF1-URGENT"

    # 2. Verify original report text is explicitly preserved
    assert enriched["report_text"] == sample_incident["report_text"]
    assert enriched["original_report_text"] == sample_incident["report_text"]

    # 3. Verify HumAID category and confidence are appended
    assert "humaid_category" in enriched
    classifier = get_classifier(model_dir=local_model_dir)
    assert enriched["humaid_category"] in classifier.label_mapper.labels
    assert 0.0 <= enriched["humaid_confidence"] <= 1.0

    # 4. Verify safety disclaimer and operational boundaries
    assert enriched["nlp_status"] == "SUCCESS"
    assert RESQNET_DISCLAIMER in enriched["nlp_disclaimer"]


# ---------------------------------------------------------------------------
# 4. Graceful Handling of Empty, Whitespace, and Invalid Messages
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "invalid_input",
    [
        None,
        "",
        "     ",
        "\n\t\r",
    ],
)
def test_graceful_handling_of_empty_and_invalid_messages(local_model_dir, invalid_input):
    """
    Ensure invalid or empty messages return a structured fallback without raising exceptions.
    """
    result = classify_report(invalid_input, model_dir=local_model_dir)

    assert result["status"] == "EMPTY_OR_INVALID_INPUT"
    assert result["predicted_category"] == "unclassified_empty_message"
    assert result["confidence"] == 0.0
    assert result["cleaned_text"] == ""
    assert RESQNET_DISCLAIMER in result["disclaimer"]


def test_classify_incident_report_with_empty_text(local_model_dir):
    """
    Verify report with missing/empty text field is handled gracefully.
    """
    empty_incident = {
        "id": "RQN-EMPTY",
        "title": "Silent sensor pulse",
        "report_text": "",
    }
    enriched = classify_incident_report(empty_incident, model_dir=local_model_dir)

    assert enriched["id"] == "RQN-EMPTY"
    assert enriched["humaid_category"] == "unclassified_empty_message"
    assert enriched["humaid_confidence"] == 0.0
    assert enriched["nlp_status"] == "EMPTY_OR_INVALID_INPUT"


# ---------------------------------------------------------------------------
# 5. Graceful Handling of Missing Model Files
# ---------------------------------------------------------------------------

def test_graceful_handling_of_missing_model_files(tmp_path):
    """
    Ensure that when model files or directory are missing, classify_report does
    not crash the calling application, but returns status='MODEL_UNAVAILABLE'.
    """
    non_existent_dir = tmp_path / "non_existent_resqnet_model_xyz"

    sample_msg = "Bridge collapsed on Highway 101."
    result = classify_report(sample_msg, model_dir=non_existent_dir)

    assert result["status"] == "MODEL_UNAVAILABLE"
    assert result["predicted_category"] == "unclassified_model_unavailable"
    assert result["confidence"] == 0.0
    assert result["input_text"] == sample_msg
    assert RESQNET_DISCLAIMER in result["disclaimer"]
    assert "error" in result


# ---------------------------------------------------------------------------
# 6. Backend API Endpoints (FastAPI TestClient)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def api_client(local_model_dir):
    """Initialize FastAPI TestClient with the local model."""
    app = create_api_app()
    # Warm up classifier
    get_classifier(model_dir=local_model_dir)
    return TestClient(app)


def test_api_health_endpoint(api_client):
    """Verify GET /api/v1/health endpoint."""
    response = api_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["weights_present"] is True
    assert data["labels_present"] is True


def test_api_classify_endpoint(api_client):
    """Verify POST /api/v1/classify with a sample disaster message."""
    payload = {
        "text": "Flash flooding has submerged 6 cars under the Bayview underpass, people need rescue boats.",
        "return_all_probabilities": True,
    }
    response = api_client.post("/api/v1/classify", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "SUCCESS"
    assert data["input_text"] == payload["text"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert len(data["all_probabilities"]) == 10
    assert RESQNET_DISCLAIMER in data["disclaimer"]


def test_api_reports_classify_endpoint(api_client):
    """Verify POST /api/v1/reports/classify preserves report structure and attaches classification."""
    incident_payload = {
        "id": "RQN-TEST-01",
        "title": "Hospital backup generator failure",
        "sector": "Metro West",
        "priorityScore": 88,
        "verificationStatus": "verified",
        "report_text": "Emergency ICU backup power failing, critical medical equipment losing electricity.",
    }
    response = api_client.post("/api/v1/reports/classify", json=incident_payload)
    assert response.status_code == 200
    data = response.json()

    # Preserved original fields
    assert data["id"] == "RQN-TEST-01"
    assert data["priorityScore"] == 88
    assert data["verificationStatus"] == "verified"
    assert data["report_text"] == incident_payload["report_text"]

    # Enriched classification
    assert "humaid_category" in data
    assert "humaid_confidence" in data
    assert 0.0 <= data["humaid_confidence"] <= 1.0
    assert data["nlp_status"] == "SUCCESS"
