"""
Tests for health check and readiness probe endpoints
"""

def test_health_check(client):
    """GET /api/v1/health should return operational status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["HEALTHY", "DEGRADED"]
    assert "version" in data
    assert data["database_connected"] is True
    assert "disclaimer" in data


def test_readiness_probe(client):
    """GET /api/v1/health/ready should confirm local model and database readiness."""
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "READY"
    assert data["database"] == "CONNECTED"
    assert data["model"] == "LOADED_LOCAL"


def test_root_status(client):
    """GET / should return basic project metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["docs_url"] == "/docs"
    assert data["api_v1_prefix"] == "/api/v1"
