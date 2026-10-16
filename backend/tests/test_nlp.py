"""
Tests for HumAID DistilBERT NLP classification endpoints
"""

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
