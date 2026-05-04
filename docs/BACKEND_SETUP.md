# S.E.T.U Backend and API Setup

The backend is a FastAPI application that serves synthetic S.E.T.U data, entity-resolution workflows, reviewer decisions, activity intelligence, BI queries, map summaries, and audit logs.

In the single Vercel deployment, FastAPI is exposed through:

```text
api/index.py
```

Routes are served on the same domain as the frontend:

```text
/health
/api/...
```

## Production Environment Variables

Set these in the Vercel project:

```text
MONGODB_URI=<MongoDB Atlas connection string>
MONGODB_DB=setu_demo
APP_ENV=production
```

`MONGODB_URI` is required for durable database storage. Without it, the backend may run in mock mode for demonstration only.

## Local Backend Run

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```powershell
curl http://localhost:8000/health
```

## Main Endpoints

- `GET /health`
- `GET /api/dashboard`
- `GET /api/source-records`
- `GET /api/normalized-records`
- `GET /api/match-candidates`
- `GET /api/ubids`
- `GET /api/ubids/{ubid}`
- `GET /api/review-queue`
- `GET /api/activity-events`
- `GET /api/audit-logs`
- `POST /api/matching/run`
- `POST /api/review-queue/{case_id}/decision`
- `POST /api/activity/run`
- `GET /api/queries/prebuilt`
- `GET /api/queries/active-factories-no-inspection`
- `GET /api/map/pincode-summary`

## Seeded Collections

- `source_records`
- `normalized_records`
- `match_candidates`
- `ubid_registry`
- `review_queue`
- `activity_events`
- `audit_logs`

## Guardrails

- Synthetic data only
- PAN/GSTIN-like values are represented as hashes or masked values
- Source department systems are modeled as read-only inputs
- No hosted LLM calls are used for identity matching
- Match candidates include confidence, decision zone, evidence, and explanation
- Reviewer decisions create audit logs
