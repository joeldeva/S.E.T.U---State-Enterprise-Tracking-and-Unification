# K-BIG Backend Setup

The Phase 2 backend is a FastAPI API backed by MongoDB. It seeds synthetic demo data on startup if the collections are empty.

## Guardrails

- Synthetic data only.
- PAN/GSTIN-like values are represented only as demo hashes.
- Source department systems are modeled as read-only inputs.
- No hosted LLM calls are used for identity matching.
- Phase 2 does not implement reviewer write actions or full matching logic.

## Run With Docker Compose

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Backend docs: `http://localhost:8000/docs`
- MongoDB: `mongodb://localhost:27017`

## Run Backend Locally

Install dependencies:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
```

Start MongoDB locally or through Docker:

```bash
docker compose up mongodb
```

Run the API:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Read-Only Endpoints

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

## Seeded Collections

- `source_records`
- `normalized_records`
- `match_candidates`
- `ubid_registry`
- `review_queue`
- `activity_events`
- `audit_logs`
