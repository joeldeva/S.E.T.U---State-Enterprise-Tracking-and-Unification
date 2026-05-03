# K-BIG - Karnataka Business Intelligence Grid

K-BIG is a national hackathon prototype for a read-only business intelligence layer above Karnataka department systems. It assigns a stable Unified Business Identifier (UBID), explains business record linkage decisions, routes ambiguous matches to officers, and classifies each business as Active, Dormant, Closed, or Insufficient Data using synthetic activity events.

The prototype is designed as a judge-ready control room: it shows how government teams can connect business identity, evidence, reviewer governance, activity status, BI queries, an identity graph, and PIN-code level intelligence without modifying source department systems.

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Charts and UI: custom dashboard components with Recharts-style visual patterns
- Graph view: React Flow
- Map view: MapLibre GL JS
- Backend: FastAPI
- Database: MongoDB
- MongoDB driver: Motor
- Matching: local explainable scoring, deterministic anchors, and fuzzy evidence
- Deployment: Docker Compose for local demo services

## Hackathon Constraints

- Synthetic or scrambled data only
- Source systems are read-only and are not modified
- No raw PAN or GSTIN is exposed in the UI
- No hosted LLM calls are used for identity matching
- Automated decisions must be explainable
- Ambiguous matches go to human review
- Merge decisions must be auditable and reversible in concept
- A wrong merge is treated as more dangerous than a missed merge

## Run the Frontend

```powershell
cd frontend
npm install
npm run dev
```

The Vite app usually starts at `http://localhost:5173`.

For a production build check:

```powershell
cd frontend
npm run build
```

## Run Backend and MongoDB

Option 1: Docker Compose

```powershell
docker compose up --build
```

Expected services:

- MongoDB on `localhost:27017`
- FastAPI backend on `http://localhost:8000`
- Frontend on `http://localhost:5173`

Option 2: Backend directly

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API health check:

```powershell
curl http://localhost:8000/health
```

Additional backend notes are in `docs/BACKEND_SETUP.md`.

## Demo Flow

Use the Executive Dashboard and press **Start Guided Demo**. The guided flow walks judges through:

1. Department data ingestion
2. Normalization
3. Entity resolution
4. Reviewer queue
5. UBID registry
6. Activity intelligence
7. BI query engine
8. Identity graph
9. PIN-code map
10. Audit logs

The primary government-style query is:

```text
Active factories in PIN code 560058 with no inspection in the last 18 months.
```

## Product Value

- One UBID across departments
- Active/Dormant/Closed status with evidence
- Ambiguous matches routed to officers
- Queries previously impossible are now possible
- Works without modifying department systems

## Sample Credentials

No login or mock credentials are currently implemented.
