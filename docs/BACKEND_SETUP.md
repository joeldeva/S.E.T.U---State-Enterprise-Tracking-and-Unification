# SETU / K-BIG Backend And API Setup

The backend is a FastAPI application that powers synthetic data ingestion, entity resolution, reviewer workflow, UBID registry, activity intelligence, BI queries, PIN-code summaries, and audit logs.

In the single Vercel deployment, FastAPI is exposed through:

```text
api/index.py
```

Routes are served on the same domain as the frontend:

```text
/health
/api/...
```

## Runtime Requirements

Recommended local runtime:

- Python 3.11 or newer
- MongoDB Atlas/local MongoDB for durable storage
- Optional Docker for the local MongoDB helper

Python dependencies:

```text
fastapi==0.115.6
uvicorn[standard]==0.32.1
motor==3.6.0
pymongo==4.9.2
mongomock-motor==0.0.36
```

These are duplicated in both:

```text
backend/requirements.txt
requirements.txt
```

The root `requirements.txt` is used by Vercel. The backend copy is for local backend development.

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
curl http://127.0.0.1:8000/health
```

Expected shape:

```json
{
  "status": "ok",
  "database": "kbig_demo",
  "mode": "synthetic-read-only",
  "database_mode": "mock"
}
```

`database_mode` may be `mongodb` when `MONGODB_URI` is configured.

## Environment Variables

Production or durable local database:

```text
MONGODB_URI=<MongoDB Atlas or local MongoDB URI>
MONGODB_DB=kbig_demo
APP_ENV=production
```

If `MONGODB_URI` is unavailable, the backend can use the mock/in-memory mode for demo purposes. That mode is useful for UI verification but is not durable.

## Optional Local MongoDB

From repo root:

```powershell
docker compose up -d
```

Then set:

```powershell
$env:MONGODB_URI="mongodb://localhost:27017"
$env:MONGODB_DB="kbig_demo"
```

## Main Endpoints

Health:

```text
GET /health
```

Dashboard and read-only collections:

```text
GET /api/dashboard
GET /api/source-records
GET /api/business-submissions
GET /api/normalized-records
GET /api/match-candidates
GET /api/ubids
GET /api/ubids/{ubid}
GET /api/review-queue
GET /api/activity-events
GET /api/audit-logs
```

Mock CSV database:

```text
GET /api/mock-database/summary
GET /api/mock-database/records?limit=500
GET /api/mock-database/activity-events?limit=500
```

Business ingestion:

```text
POST /api/ingestion/identifier-verification
POST /api/ingestion/business-submission
GET  /api/ingestion/business-submissions
GET  /api/ingestion/business-submissions/{submission_id}
```

Matching:

```text
POST /api/matching/run
GET  /api/matching/thresholds
```

Reviewer workflow:

```text
POST /api/review-queue/{case_id}/decision
GET  /api/review-feedback/summary
```

UBID governance:

```text
POST /api/ubids/{ubid}/links/{record_id}/deactivate
```

Activity intelligence:

```text
POST /api/activity/run
GET  /api/activity/unmatched-events
```

BI queries and map:

```text
GET /api/queries/prebuilt
GET /api/queries/active-factories-no-inspection
GET /api/queries/{query_id}
GET /api/map/pincode-summary
```

## Seeded Collections

When MongoDB is available and collections are empty, the backend seeds synthetic demo data for:

- `source_records`
- `normalized_records`
- `match_candidates`
- `ubid_registry`
- `review_queue`
- `activity_events`
- `audit_logs`
- `business_submissions`

## Privacy And Governance Rules

- The backend should never return raw PAN/GSTIN in public demo responses.
- Prototype API responses expose masked or hashed identifiers.
- Source department systems are modeled as read-only.
- Matching is local and explainable.
- No hosted LLM calls are used for identity matching.
- Match candidates include confidence, decision zone, evidence, and explanation.
- Reviewer decisions write audit logs.
- Link deactivation preserves source records and writes audit history.
- Unmatched activity events are returned for review instead of being dropped.

## Basic Backend Checks

Compile check:

```powershell
python -m compileall backend\app
```

Health check:

```powershell
curl http://127.0.0.1:8000/health
```

Mock database check:

```powershell
curl http://127.0.0.1:8000/api/mock-database/summary
```

Business submission endpoint smoke test should be run through the frontend Data Ingestion screen so validation, masking, UBID result rendering, and audit behavior are checked together.
