# RESQNET AI — Emergency Response Coordination & Situational Triage

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_+_Vite_8-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![PyTorch](https://img.shields.io/badge/ML-PyTorch_2.6_+_DistilBERT-EE4C2C.svg?logo=pytorch&logoColor=white)](https://pytorch.org)
[![Database](https://img.shields.io/badge/Database-SQLite_+_SQLAlchemy-003B57.svg?logo=sqlite&logoColor=white)](https://sqlite.org)

**RESQNET AI** is an emergency-response operations dashboard and NLP situational triage system designed for disaster coordinators. It combines real-time incident mapping, priority queuing, underreported zone monitoring, and offline NLP message classification powered by a prototype fine-tuned **HumAID DistilBERT** model (evaluated on local sample split; full HumAID benchmark target: ~88%).

---

## 🏗️ Clean Project Architecture

```text
nex_3/
├── frontend/                     # React 19 + Vite 8 Operations Dashboard
│   ├── public/                   # Static assets (favicons, icons)
│   ├── src/
│   │   ├── components/           # IncidentMap, PriorityQueue, TopNav, Modals, etc.
│   │   ├── pages/                # High-level page views
│   │   ├── services/             # api.js (Axios/fetch client for FastAPI)
│   │   ├── data/                 # mockData.js (seed schema & offline fallback)
│   │   ├── App.jsx               # Dashboard coordinator interface
│   │   ├── main.jsx              # React root entrypoint
│   │   └── index.css             # TailwindCSS design system tokens
│   ├── index.html                # Single-page application template
│   ├── package.json              # Node.js dependencies & scripts
│   ├── package-lock.json
│   ├── vite.config.js            # Vite configuration with proxy settings
│   ├── tailwind.config.js        # Tailwind theme tokens & palette
│   ├── postcss.config.js
│   ├── .env.example              # VITE_API_BASE_URL example
│   ├── .gitignore
│   └── README.md
│
├── backend/                      # FastAPI Python REST Application
│   ├── app/
│   │   ├── core/                 # config.py (Pydantic settings & REPO_ROOT resolution)
│   │   ├── database/             # session.py (SQLAlchemy engine), init_db.py (seeding)
│   │   ├── models/               # incident.py (Incident, AuditLog, AttentionZone)
│   │   ├── schemas/              # incident.py, nlp.py (Pydantic validation schemas)
│   │   ├── services/             # incident_service.py (CRUD), nlp_service.py (DistilBERT)
│   │   ├── routers/              # health.py, nlp.py, incidents.py, zones.py, audit_log.py
│   │   └── main.py               # FastAPI entrypoint, CORS & Lifespan handler
│   ├── tests/                    # 16 unit & integration tests
│   │   ├── conftest.py           # SQLite in-memory fixture with StaticPool
│   │   ├── test_health.py        # /api/v1/health & /api/v1/health/ready tests
│   │   ├── test_nlp.py           # Classification & validation tests
│   │   └── test_incidents.py     # CRUD, persistence, & audit trail tests
│   ├── requirements.txt          # Backend Python dependencies
│   ├── .env.example              # Configurable host, port, DB URL, model path
│   └── README.md
│
├── data/                         # Data, ML Pipeline & Trained Models
│   ├── humaid/                   # Preserved original HumAID raw dataset
│   └── nlp/                      # NLP Training & Inference Module
│       ├── configs/              # training_config.yaml
│       ├── datasets/             # raw/, processed/, splits/
│       ├── logs/                 # Training and validation logs
│       ├── models/
│       │   └── resqnet_distilbert/ # Trained DistilBERT weights, tokenizer & label map
│       ├── notebooks/            # RESQNET_HumAID_NLP_Training.ipynb
│       ├── outputs/              # Evaluation metrics, confusion matrix, ROC plots
│       ├── src/                  # preprocessing.py, data_loader.py, inference.py
│       ├── tests/                # 29 NLP unit tests
│       ├── requirements.txt      # PyTorch, Transformers, Scikit-learn
│       └── README.md
│
├── .gitignore                    # Root gitignore rules
└── README.md                     # Project master documentation
```

---

## ⚡ Quickstart Guide (Windows PowerShell)

### Terminal 1 — Backend (FastAPI)

```powershell
# Navigate to backend directory
cd d:\user\Documents\nex_3\backend

# (Optional) Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r requirements.txt

# Start FastAPI development server with hot-reload
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

> **API Documentation**: Once running, view interactive OpenAPI Swagger docs at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### Terminal 2 — Frontend (React / Vite)

```powershell
# Open a second PowerShell terminal and navigate to frontend directory
cd d:\user\Documents\nex_3\frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```

> **Dashboard**: Access the coordinator dashboard at [http://localhost:5173](http://localhost:5173).

---

## 📡 Backend API Endpoints

All endpoints are versioned under `/api/v1`:

| Method  | Endpoint                                   | Description                                                                    |
| ------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| `GET`   | `/api/v1/health`                           | Liveness check (status, uptime, version)                                       |
| `GET`   | `/api/v1/health/ready`                     | Readiness check (verifies SQLite DB and HumAID model offline readiness)        |
| `POST`  | `/api/v1/classify`                         | Classify freeform text with DistilBERT into HumAID category + confidence       |
| `POST`  | `/api/v1/reports/classify`                 | Classify structured report preserving incident fields & original text          |
| `GET`   | `/api/v1/incidents`                        | List incidents with optional filters (`status`, `severity`, `category`)        |
| `POST`  | `/api/v1/incidents`                        | Create a new incident (optionally auto-classifies raw report text)             |
| `GET`   | `/api/v1/incidents/{id}`                   | Retrieve incident details, HumAID predictions, and coordinator notes           |
| `PATCH` | `/api/v1/incidents/{id}/verification`      | Update verification status (`unverified`, `field_confirmed`, `debunked`)       |
| `PATCH` | `/api/v1/incidents/{id}/response`          | Update response lifecycle (`unassigned`, `dispatched`, `on_scene`, `resolved`) |
| `PATCH` | `/api/v1/incidents/{id}/team`              | Assign response unit (creates audit trail)                                     |
| `POST`  | `/api/v1/incidents/{id}/override`          | Coordinator priority override with mandatory logged justification              |
| `POST`  | `/api/v1/incidents/{id}/notes`             | Append coordinator timestamped operational note                                |
| `GET`   | `/api/v1/incidents/{id}/duplicates`        | Query ranked explainable duplicate candidates for an incident                  |
| `POST`  | `/api/v1/incidents/{id}/merge-duplicate`   | Human-authorized merge of duplicate incident with provenance audit trail       |
| `POST`  | `/api/v1/incidents/{id}/dismiss-duplicate` | Coordinator dismissal of false duplicate suggestion                            |
| `GET`   | `/api/v1/zones`                            | List underreported attention zones                                             |
| `PATCH` | `/api/v1/zones/{id}/dispatch`              | Dispatch reconnaissance scout/drone to underreported sector                    |
| `GET`   | `/api/v1/audit-log`                        | Retrieve chronological audit & accountability trail                            |

---

## 🔍 Explainable Duplicate-Report Detection & Human-in-the-Loop Merge

Duplicate emergency reports often inundate emergency dispatch centers during disasters, splitting resources and distorting real-time situational awareness. RESQNET AI implements an explainable multi-signal duplicate suggestion engine:

1. **Multi-Factor Signal Fusion**:
   - **Spatial Proximity (35%)**: Great-circle Haversine distance with tiered scoring (<250m immediate, <1km sector).
   - **Lexical Overlap (35%)**: Word-level Dice coefficient with suffix stemming combined with character 3-gram Dice coefficient to match inflectional variations (`collapsed` vs `collapse`) and extract shared crisis terminology.
   - **Temporal Proximity (18%)**: Timestamp delta analysis (<30m concurrent shift).
   - **HumAID Category Match (12%)**: Automatic agreement verification between DistilBERT predicted disaster categories.

2. **Full Explainability**:
   - Every candidate duplicate surfaces an explicit overall match score (0-100), confidence level (`HIGH`, `MEDIUM`, `LOW`), exact physical distance (km/m), text similarity %, and plain-language bullet points explaining _why_ the reports are suspected duplicates.

3. **Human Review Before Merging**:
   - Merging is **never automatic**.
   - Coordinators review candidate reports side-by-side inside the `DuplicateReviewModal`.
   - Authorized merges mark candidate records as `merged_duplicate` with `duplicate_of_id`, increment primary incident corroboration counts, boost `reportReliability` metrics safely, and write an immutable audit log entry.
   - Coordinators can dismiss false suggestions, preventing re-surfacing and logging dismissal rationales.

---

## 🧠 HumAID DistilBERT NLP Classifier

- **Model Architecture**: Prototype sequence classifier based on `distilbert-base-uncased` fine-tuned for 10 humanitarian categories. The current local checkpoint is an experimental prototype trained on a sample batch (held-out sample evaluation: 36% accuracy, 22% weighted F1 due to small batch class imbalance; full multi-thousand HumAID benchmark target is ~88% macro F1).
- **Weights Location**: `data/nlp/models/resqnet_distilbert/` (includes `model.safetensors`, `config.json`, `tokenizer.json`, and `label_map.json`).

### Production model provisioning

The trained `model.safetensors` files are intentionally ignored by Git because
they are larger than GitHub's 100 MB file limit. A clean Render checkout
therefore does not contain the local model unless the build provisions it.
Store the complete `resqnet_distilbert_full` directory as a private or trusted
HTTPS zip/tar archive and set `MODEL_ARTIFACT_URL` in the Render build
environment. The deployment build command must run:

```powershell
python scripts/prepare_nlp_model.py
```

The archive must contain `config.json`, `label_mapping.json`, `tokenizer.json`,
and `model.safetensors`. The backend now loads the model during startup and
reports `model_loaded: false` plus the load error when artifacts are missing or
incompatible; it never presents a zero-confidence unavailable result as a
successful prediction.
- **Offline Inference**: `backend/app/services/nlp_service.py` connects directly to `data/nlp/src/inference.py`. It loads weights once into memory on startup and runs purely offline without external downloads.

### 🛡️ Critical Safety & Data Integrity Principles

1. **Predictive Triage vs. Ground Truth**: HumAID classification is an automated triage aid. A high model confidence score does **not** verify an incident as authentic or replace human ground confirmation.
2. **Strict Verification Separation**: Verification status (`verificationStatus`) is kept strictly separate from the model category prediction (`humaidCategory`).
3. **No Autonomous Dispatch**: Resource dispatch and severity scoring remain under human-in-the-loop coordinator control.
4. **Coordinator Accountability**: Priority overrides, duplicate merges, and verification changes automatically generate immutable entries in the audit log with operator ID, before/after values, and logged justification.

---

## 🧪 Automated Test Suite

Both backend, NLP, and frontend test suites execute cleanly and independently (**306 total automated tests** across the full stack):

```powershell
# 1. Run all backend REST API, persistence, duplicate & security tests (168 tests)
python -m pytest backend/tests/ -v

# 2. Run NLP preprocessing, tokenizer, metric, and inference tests (29 tests)
python -m pytest data/nlp/tests/ -v

# 3. Run frontend Vitest component & user-flow suite (109 tests across 15 test files)
cd frontend
npm test

# 4. Build frontend production bundle
npm run build

# 5. Run end-to-end live incident, duplicate & triage workflow probe
cd ..
python scripts/verify_live_workflow.py

# 6. Verify offline HumAID DistilBERT model load and inference
python scripts/test_model.py
```

---

## ⚙️ Environment Configuration

Refer to the project's `.env.example` templates for all configurable settings without real secrets.

### Backend (`backend/.env` or root `.env`)

```bash
ENV=development
DEBUG=True
HOST=127.0.0.1
PORT=8000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000
DATABASE_URL=sqlite:///./resqnet.db
MODEL_DIR=./data/nlp/models/resqnet_distilbert_full
SECRET_KEY=replace-with-a-secure-random-secret-key-in-production

# Optional external API credentials (leave empty for 100% offline local operation)
HF_TOKEN=
MAPS_API_KEY=
IMD_API_KEY=
IMD_AUTH_TOKEN=
ENABLE_DEMO_SIMULATED_FEEDS=true
```

### Frontend (`frontend/.env`)

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```
