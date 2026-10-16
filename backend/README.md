# RESQNET AI — Backend Application

Production-grade FastAPI service providing persistent incident tracking, coordinator audit trails, and integration with the fine-tuned HumAID DistilBERT crisis text classifier.

## Directory Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application, lifespan, CORS, and router assembly
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py           # Pydantic BaseSettings environment configuration
│   ├── database/
│   │   ├── __init__.py
│   │   ├── session.py          # SQLAlchemy engine, sessionmaker, and get_db dependency
│   │   └── init_db.py          # Table initialization and initial incident dataset seeding
│   ├── models/
│   │   ├── __init__.py
│   │   └── incident.py         # SQLAlchemy models for Incident, AuditLog, and AttentionZone
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── incident.py         # Pydantic request/response schemas for incident workflows
│   │   └── nlp.py              # Pydantic schemas for NLP classification endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── incident_service.py # Incident CRUD, status transitions, and priority overrides
│   │   └── nlp_service.py      # Adapter to data/nlp/src/inference.py (DistilBERT)
│   └── routers/
│       ├── __init__.py
│       ├── health.py           # GET /api/v1/health & /api/v1/health/ready probes
│       ├── nlp.py              # POST /api/v1/classify & /api/v1/reports/classify
│       ├── incidents.py        # Incident CRUD, verification, response status, and overrides
│       ├── audit_log.py        # GET /api/v1/audit-log
│       └── zones.py            # GET /api/v1/zones
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # Pytest fixtures, test database, and TestClient
│   ├── test_health.py          # Probes and readiness validation
│   ├── test_nlp.py             # Classification with trained HumAID DistilBERT weights
│   └── test_incidents.py       # Persistence, CRUD, status updates, and audit logging
├── requirements.txt            # Python dependencies
├── .env.example                # Sample environment variables
└── README.md
```

## Running the Backend

In Windows PowerShell:

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API documentation will be available at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## API Endpoints

### Health & Diagnostics
- `GET /api/v1/health` — Service liveness and operational summary.
- `GET /api/v1/health/ready` — Readiness probe (returns 503 if local model or database fails).

### HumAID NLP Classification
- `POST /api/v1/classify` — Classifies raw crisis message into one of 10 HumAID categories.
- `POST /api/v1/reports/classify` — Enriches an entire incident report with NLP predictions while preserving all metadata.

### Incident Management
- `GET /api/v1/incidents` — List incidents (supports `severity`, `verificationStatus`, `responseStatus`, `sector`, `category`, and `search` filters).
- `POST /api/v1/incidents` — Create a new incident (optionally runs HumAID classifier on report text).
- `GET /api/v1/incidents/{incident_id}` — Get single incident by ID.
- `PATCH /api/v1/incidents/{incident_id}/verification` — Update verification status with coordinator audit logging.
- `PATCH /api/v1/incidents/{incident_id}/response-status` — Update response status and team assignment.
- `POST /api/v1/incidents/{incident_id}/override` — Apply human priority score override with required justification.
- `GET /api/v1/incidents/{incident_id}/audit-log` — Retrieve audit trail for specific incident.

### Telemetry & Zones
- `GET /api/v1/audit-log` — Full coordinator action audit log.
- `GET /api/v1/zones` — Underreported and signal-void attention zones.

## Running Tests

From `backend/`:

```powershell
python -m pytest tests/ -v
```
