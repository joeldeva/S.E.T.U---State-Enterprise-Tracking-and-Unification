# S.E.T.U - State Enterprise Tracking and Unification

S.E.T.U is a product demo for a read-only business intelligence layer above Karnataka department systems. It creates a stable Unified Business Identifier (UBID), explains every record-linkage decision, routes uncertain matches to human review, and classifies businesses as Active, Dormant, Closed, or Insufficient Data using activity evidence.

The application is designed as a working government SaaS dashboard, not a slide deck. The React frontend, FastAPI backend, identity-resolution services, activity intelligence, BI queries, graph view, map view, and audit log are deployed together as one Vercel project.

## Product Capabilities

- One UBID across department records
- Explainable entity-resolution confidence scoring
- Human reviewer queue for ambiguous matches
- Active/Dormant/Closed classification with evidence timeline
- Government-style BI queries
- UBID identity graph
- PIN-code level business intelligence map
- Audit trail for automated and reviewer decisions
- Synthetic-data-only operating mode

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Graph view: React Flow
- Map view: MapLibre GL JS
- Backend: FastAPI
- Database: MongoDB Atlas or local MongoDB
- MongoDB driver: Motor
- Matching: local explainable scoring, deterministic anchors, and fuzzy evidence
- Deployment: single Vercel project from the repository root

## Repository Layout

```text
api/
  index.py                # Vercel FastAPI entrypoint
backend/
  app/                    # FastAPI app, routers, services, synthetic seed data
frontend/
  src/                    # React application
  raw-html-prototype/     # Preserved original HTML prototype
docs/
  BACKEND_SETUP.md
  PROTOTYPE_NOTES.md
vercel.json              # Single-project Vercel routing
package.json             # Root build script for Vercel
requirements.txt         # Python dependencies for Vercel
```

## Deployment

S.E.T.U is configured for one Vercel project:

- `/` serves the React frontend from `frontend/dist`
- `/api/...` serves the FastAPI backend through `api/index.py`
- `/health` serves the backend health check

Recommended Vercel settings:

```text
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: frontend/dist
Install Command: default or None
```

Environment variables for a persistent product demo:

```text
MONGODB_URI=<MongoDB Atlas connection string>
MONGODB_DB=setu_demo
APP_ENV=production
```

Do not set `VITE_API_BASE_URL` for the single-project deployment. The frontend calls the backend on the same domain.

After deployment, verify:

```text
https://your-project.vercel.app
https://your-project.vercel.app/health
https://your-project.vercel.app/api/dashboard
```

## Local Development

Run the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Run the backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend health check:

```powershell
curl http://localhost:8000/health
```

Run the single-project production build locally:

```powershell
npm run build
```

## MongoDB Mode

If `MONGODB_URI` is configured, the backend uses MongoDB and seeds synthetic data into the configured database when collections are empty.

If MongoDB is unavailable, the backend can fall back to an in-memory mock database for demonstration. That mode is useful for UI checks but is not durable.

## Governance Guardrails

- Synthetic or scrambled data only
- Source department systems are treated as read-only
- No raw PAN or GSTIN is exposed in the UI
- No hosted LLM calls are used for identity matching
- Automated decisions include evidence and explanations
- Ambiguous matches are routed to human review
- Reviewer decisions are written to audit logs
- Merge decisions are designed to be reversible
- Conservative matching is preferred because a wrong merge is more harmful than a missed merge

## Core Demo Flow

1. Executive Dashboard
2. Department Ingestion
3. Normalization Engine
4. Entity Resolution
5. Review Queue
6. UBID Registry
7. Activity Intelligence
8. BI Query Engine
9. Identity Graph
10. PIN-code Map
11. Audit Logs

Primary intelligence query:

```text
Active factories in PIN code 560058 with no inspection in the last 18 months.
```

## Sample Credentials

No login or mock credentials are currently implemented.
