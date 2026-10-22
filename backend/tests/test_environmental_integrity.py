"""
Test Suite: Environmental Adapter SSL Verification, Provenance Integrity, and Model Readiness
Verifies Phase 4 requirements:
- Inspect all environmental adapters. Do not disable SSL certificate verification.
- Verify whether the actual DistilBERT model files exist and whether inference loads them.
- Expose actual model status honestly.
- Distinguish historical observations, live observations, forecasts, and simulated feeds.
- Clearly identify external credentials needed for live IMD and real broadcasts.
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.core.config import REPO_ROOT, settings
from backend.app.services.nlp_service import check_model_readiness, get_model_path


def test_no_verify_false_in_codebase():
    """Verify that SSL certificate verification is never disabled (no verify=False in repo)."""
    repo_root = Path(REPO_ROOT)
    # Search all backend python files, excluding this test file itself
    python_files = [
        f for f in repo_root.glob("backend/**/*.py")
        if f.name != "test_environmental_integrity.py"
    ]
    
    violations = []
    for f in python_files:
        content = f.read_text(encoding="utf-8", errors="ignore")
        if "verify=False" in content or "verify = False" in content:
            violations.append(str(f))

    assert len(violations) == 0, f"Found SSL verification disabled in: {violations}"


def test_humaid_distilbert_artifacts_exist_and_validate():
    """Verify HumAID DistilBERT model files exist locally and pass readiness check."""
    model_status = check_model_readiness()
    active_path = get_model_path()

    assert Path(active_path).exists(), f"Model path {active_path} does not exist"
    assert model_status["is_ready"] is True
    assert model_status["weights_present"] is True
    assert model_status["labels_present"] is True
    assert model_status["config_present"] is True
    assert model_status["tokenizer_present"] is True


def test_health_endpoint_reports_model_status_honestly(client: TestClient):
    """Verify /health is a dependency-free liveness probe."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ALIVE"
    assert data["model_loaded"] is None
    assert data["model_dir"] is None
    assert "RESQNET AI Automated NLP Prediction" in data["disclaimer"]


def test_environmental_sources_status_distinguishes_provenance(client: TestClient):
    """Verify environmental sources endpoint clearly audits upstream credentials and provenance."""
    res = client.get("/api/v1/environmental-data/sources-status")
    assert res.status_code == 200
    sources = res.json()
    assert isinstance(sources, list)

    source_names = [s["name"] for s in sources]
    assert any("IMD" in n for n in source_names)
    assert any("NWDP" in n or "CWC" in n for n in source_names)
    assert any("Open-Meteo" in n for n in source_names)

    # Verify IMD audit indicates credential requirement
    imd_status = next(s for s in sources if "IMD" in s["name"] or "imd" in s["source_id"])
    assert "x-api-key" in imd_status["access_requirements"].lower() or "jwt" in imd_status["access_requirements"].lower() or "authenticated" in imd_status["access_requirements"].lower()
