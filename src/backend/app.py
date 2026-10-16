"""
RESQNET AI — Application Backend Server

Serves the REST API for RESQNET AI incident management and connects incoming
incident reports to the local HumAID DistilBERT text classification pipeline.
"""

import sys
from pathlib import Path

# Ensure project root and nlp modules are importable
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from data.nlp.src.backend_service import (
    create_api_app,
    classify_text_service,
    process_incident_report_service,
    health_check_service,
)

app = create_api_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.backend.app:app", host="0.0.0.0", port=8000, reload=True)
