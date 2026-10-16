# RESQNET AI — Frontend Application

Modern emergency-response coordination dashboard built with React 19, Vite, Tailwind CSS, Lucide icons, and Leaflet geospatial mapping.

## Overview

The RESQNET AI frontend provides mission coordinators with real-time situational awareness:
- **Operations Overview:** Key metrics, active response teams, triage counts.
- **Incident Management:** Incident list, detail panel, verification and response status workflows.
- **Priority Queue:** Sorted queue of critical emergencies.
- **Geospatial Map:** Interactive Leaflet map with incident markers, severity colors, and attention zones.
- **Attention Needed Zones:** Highlights underreported or low-sensor sectors.
- **Coordinator Overrides:** Human-in-the-loop priority adjustments with mandatory audit logging.
- **Disaster Text Classification:** Submits incoming emergency reports to the backend HumAID DistilBERT model.

## Quick Start

```powershell
cd frontend
npm install
npm run dev
```

The application runs at `http://localhost:5173`.

## Configuration

Set the backend API URL in `.env`:

```ini
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Available Scripts

- `npm run dev` — Start Vite development server with HMR.
- `npm run build` — Build production bundle to `frontend/dist/`.
- `npm run preview` — Locally preview the production build.
- `npm run lint` — Run Oxlint static analysis.
