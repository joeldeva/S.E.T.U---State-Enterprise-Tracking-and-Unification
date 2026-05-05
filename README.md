# SETU / K-BIG - State Enterprise Tracking and Unification

SETU, also called **K-BIG - Karnataka Business Intelligence Grid**, is a working prototype for the Karnataka Government problem statement on creating a Unified Business Identifier (UBID) and business activity intelligence layer.

The prototype links fragmented synthetic department records into one explainable business identity, classifies businesses as Active, Dormant, Closed, or Unknown/Insufficient Data, and gives officers review, audit, rollback, graph, map, and BI query views.

Live demo:

```text
https://s-e-t-u-state-enterprise-tracking-a-mu.vercel.app/
```

## Why This Exists

Karnataka business records are spread across department systems such as Shops and Establishments, Factories, Labour, KSPCB, BESCOM, BWSSB, Fire, and local bodies. Each system can store different spellings, addresses, licence numbers, owner/contact fields, and activity signals for the same operating establishment.

That fragmentation makes it hard to answer basic governance questions:

- Is this the same business across departments?
- Is the business active, dormant, closed, or unknown?
- Which businesses need officer review before linking?
- Which active factories have stale inspection evidence?
- Which activity events could not be confidently joined to a UBID?

SETU does not assume every record has PAN or GSTIN. It uses PAN/GSTIN when available, but also supports licence numbers, utility consumer numbers, names, addresses, PIN code, district, owner/contact fields, and activity events.

Research alignment: the official e-Karmika Shops and Commercial Establishments SOP describes online application intake, officer verification, and document uploads such as owner identity/address proof, establishment address proof, incorporation certificate where applicable, and signed registration form. This supports the prototype choice to treat establishment records as broader than PAN/GSTIN-only matching. Source: [e-Karmika SOP/help manual, Government of Karnataka Department of Labour](https://www.ekarmika.karnataka.gov.in/ekarmika/Documents/SOP%20HELP%20MANUAL%20Shops%20and%20establishment.pdf).

## Problem And SETU Solution

| Problem | SETU approach |
| --- | --- |
| Same business appears differently across departments | Creates one UBID for the operating establishment |
| PAN/GSTIN may be missing or inconsistent | Uses licence numbers, utility numbers, name, address, PIN, and department evidence |
| Wrong automatic merge is risky | Sends ambiguous/conflicting cases to the Human Review Queue |
| Government cannot see real activity status | Uses renewals, inspections, filings, utility usage, closure, and cancellation events |
| Decisions must be trusted | Shows confidence, evidence, audit log, and reversible link/deactivation concept |

## How SETU Works

1. A user or officer enters business details such as name, address, PIN code, PAN, GSTIN, licence number, or consumer number.
2. The backend validates and normalizes the input.
3. SETU checks a CSV/Excel-style synthetic mock department database.
4. The matching engine compares the submitted record with department records.
5. A UBID is generated.
6. High-confidence matches are linked automatically.
7. Medium-confidence or conflicting matches go to Human Review.
8. Weak-evidence submissions receive a provisional UBID and remain unresolved.
9. Activity events classify the business as Active, Dormant, Closed, or Unknown/Insufficient Data.
10. Important automated and reviewer actions are stored in Audit Logs.

## Core Features

### 1. Business Data Ingestion

The Data Ingestion screen accepts:

- Business name, address, district, and PIN code
- PAN/GSTIN when available
- Factory licence number
- Shop licence number
- Labour registration number
- KSPCB consent number
- BESCOM/BWSSB consumer number
- Trade licence number
- Owner/contact details

After submission, SETU validates inputs, checks synthetic department records, and displays a full UBID result page with masked identifiers and matched department evidence.

### 2. Mock CSV Spreadsheet Viewer

The Data Ingestion screen includes a link to inspect the synthetic mock database in an Excel-like view. The viewer supports search, horizontal scrolling, sticky record columns, quick jumps to date/licence fields, and masked CSV download.

### 3. Internal Normalization

The backend normalizes messy department values before matching.

Examples:

- `Pvt` -> `Private`
- `Ltd` -> `Limited`
- `Engg` -> `Engineering`
- `Bangalore` -> `Bengaluru`
- `III Cross` -> `3rd Cross`
- `Peenya Indl Area` -> `Peenya Industrial Area`
- `Shree / Shri / Sri` -> `Sri`

PAN and GSTIN are validated, masked, and hashed for application outputs. Do not use real PAN/GSTIN in this prototype.

### 4. Explainable Matching

SETU uses multiple evidence signals:

| Evidence | Purpose |
| --- | --- |
| PAN/GSTIN match | Strong legal/tax anchor when available |
| Licence number match | Strong department anchor |
| Consumer number match | Utility-based activity or identity evidence |
| Business name similarity | Fuzzy identity support |
| Address similarity | Location support |
| PIN/district match | Geographic evidence |
| Owner/contact match | Additional confidence |
| Conflict detection | Prevents unsafe merges |

Decision thresholds:

| Confidence | Decision |
| --- | --- |
| 90-100 | Auto-link |
| 65-89 | Human Review |
| Below 65 | Provisional UBID / more evidence needed |

The confidence score is shown as a visual signal breakdown rather than only a number.

### 5. Human Review Queue

Ambiguous cases are not silently merged. A reviewer can:

- Approve a merge
- Reject a match
- Create a new UBID
- Attach to an existing UBID
- Mark insufficient data
- Request more evidence

Reviewer actions create audit entries and contribute to the simulated feedback-learning summary.

### 6. UBID Registry

Each business gets a UBID such as:

```text
KA-UBID-XXXXXXXXXXXX
```

The UBID profile shows:

- Business name and UBID
- Legal entity anchor status, when PAN/GSTIN evidence exists
- Establishment / operating unit identity
- Linked department records
- Match confidence and evidence explanation
- Activity status and compliance risk context
- Open/deactivate source-link actions
- Audit history and identity graph navigation

### 7. Activity Intelligence

SETU uses activity events to classify businesses.

Activity signals include:

- Licence renewal
- Compliance filing
- Inspection
- Electricity usage
- Water usage
- Pollution consent
- Closure application
- Licence cancellation
- Low or stale activity

The system separates operational status from compliance risk. For example, a business can look Active because utility usage exists, but still be High Risk if licence or inspection evidence is stale.

### 8. BI Query Engine

The query engine helps officers ask structured intelligence questions such as:

```text
Active factories in PIN code 560058 with no inspection in the last 18 months.
```

Other demo query types include:

- Dormant businesses with active pollution consent
- Businesses with utility usage but expired licence
- Businesses active in one department but missing from another
- High-confidence duplicate clusters
- Unmatched activity events

### 9. Identity Graph, PIN-code Map, and Audit Logs

- **Identity Graph:** Shows how department records connect to one UBID.
- **PIN-code Map:** Shows aggregate area-level activity, review pressure, and high-risk inspection gaps.
- **Audit Logs:** Tracks submissions, matches, review decisions, link deactivation, and activity status updates.

## Prototype Dataset

The prototype uses synthetic CSV/Excel-style mock data instead of real government data.

| Dataset item | Count |
| --- | ---: |
| Department business records | 447 |
| Columns in business dataset | 45 |
| Activity events | 750 |
| Departments represented | 7 |
| Missing PAN records | 105 |
| Missing GSTIN records | 118 |
| Invalid PAN-format rows | 10 |
| Invalid GSTIN-format rows | 8 |
| PAN/GSTIN mismatch rows | 35 |
| Event types | 11 |

Departments represented:

- Shops and Establishments
- Factories
- Labour
- KSPCB
- BESCOM
- BWSSB
- Local Body / Trade Licence

The dataset includes clean matches, fuzzy matches, missing PAN/GSTIN cases, invalid identifier cases, PAN-GSTIN mismatch cases, licence-only matches, utility consumer matches, Kannada/transliteration examples, false-friend business names, unresolved records, and activity events.

Important privacy note: the committed CSV contains synthetic identifier-like strings for local matching tests only. The frontend/API demo views expose masked or hashed identifiers, not raw PAN/GSTIN values.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS |
| UI/animation | Framer Motion, Lucide React |
| Graph view | React Flow |
| Map view | MapLibre GL JS |
| Backend | FastAPI |
| Runtime | Python 3.11+ recommended, Node.js 20+ recommended |
| Database | MongoDB Atlas or local MongoDB; mock fallback for demo |
| MongoDB driver | Motor / PyMongo |
| Matching logic | Explainable rule-based scoring plus fuzzy evidence |
| Deployment | Single Vercel project serving frontend and FastAPI routes |

## Dependencies

Frontend dependencies are in `frontend/package.json`:

- `react`, `react-dom`
- `vite`, `typescript`
- `tailwindcss`, `postcss`, `autoprefixer`
- `framer-motion`
- `lucide-react`
- `reactflow`
- `maplibre-gl`

Backend dependencies are in `backend/requirements.txt` and root `requirements.txt`:

- `fastapi`
- `uvicorn[standard]`
- `motor`
- `pymongo`
- `mongomock-motor`

## Repository Layout

```text
api/
  index.py                # Vercel FastAPI entrypoint
backend/
  app/                    # FastAPI app, routers, services, seed logic
  requirements.txt        # Backend Python dependencies
data/
  mock_database/          # Synthetic CSV mock department database
docs/
  BACKEND_SETUP.md        # Backend/API reference
  DEMO_GUIDE.md           # Judge/demo walkthrough and checks
  DEPLOYMENT_SPEC.md      # Vercel deployment notes
  PROTOTYPE_NOTES.md      # Governance and prototype notes
frontend/
  public/                 # Logos and frontend static assets
  raw-html-prototype/     # Preserved original HTML prototype
  src/                    # React application
  package.json            # Frontend dependencies/scripts
vercel.json               # Single-project Vercel routing
package.json              # Root Vercel build script
requirements.txt          # Python dependencies for Vercel
docker-compose.yml        # Optional local MongoDB helper
```

## Local Development

Prerequisites:

- Node.js 20 or newer
- Python 3.11 or newer
- Optional: MongoDB local instance or MongoDB Atlas URI

Install and run the frontend:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
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
curl http://127.0.0.1:8000/health
```

Production-style frontend build:

```powershell
cd frontend
npm run build
```

Single-project Vercel build from repo root:

```powershell
npm run build
```

Optional local MongoDB helper:

```powershell
docker compose up -d
```

## Deployment

The project is configured as one Vercel deployment:

- `/` serves the React frontend from `frontend/dist`
- `/health` serves FastAPI health through `api/index.py`
- `/api/...` serves FastAPI API routes through `api/index.py`

Recommended Vercel settings:

```text
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: frontend/dist
Install Command: default or None
```

Environment variables for durable deployment:

```text
MONGODB_URI=<MongoDB Atlas connection string>
MONGODB_DB=kbig_demo
APP_ENV=production
```

Do not set `VITE_API_BASE_URL` for the single-project Vercel deployment. The frontend calls the backend on the same domain.

After deployment, verify:

```text
https://your-project.vercel.app/
https://your-project.vercel.app/health
https://your-project.vercel.app/api/dashboard
```

## Main API Endpoints

```text
GET  /health
GET  /api/dashboard
GET  /api/mock-database/summary
GET  /api/mock-database/records
GET  /api/source-records
GET  /api/normalized-records
GET  /api/match-candidates
POST /api/matching/run
GET  /api/matching/thresholds
GET  /api/review-queue
POST /api/review-queue/{case_id}/decision
GET  /api/review-feedback/summary
GET  /api/ubids
GET  /api/ubids/{ubid}
POST /api/ubids/{ubid}/links/{record_id}/deactivate
POST /api/activity/run
GET  /api/activity/unmatched-events
GET  /api/queries/prebuilt
GET  /api/queries/{query_id}
GET  /api/map/pincode-summary
GET  /api/audit-logs
POST /api/ingestion/identifier-verification
POST /api/ingestion/business-submission
```

## Test Cases Covered

| Test case | Expected result |
| --- | --- |
| Clean PAN + GSTIN match | Verified mock-match UBID with high confidence |
| Licence-only match | UBID generated without PAN/GSTIN |
| BESCOM/BWSSB consumer match | Utility record linked to UBID evidence |
| Fuzzy name/address/PIN match | Matched with explanation or routed to review |
| Invalid PAN | Validation warning and review/provisional handling |
| Invalid GSTIN | Validation warning and review/provisional handling |
| PAN/GSTIN mismatch | Conflict warning and review |
| No database match | Provisional self-submitted UBID |
| Active utility but stale licence | Active status with elevated compliance risk |
| Unmatched activity event | Visible for review, not dropped |

## Governance Guardrails

- Synthetic data only
- Source department systems are modeled as read-only
- No raw PAN/GSTIN is shown in the UI or public API outputs
- PAN/GSTIN outputs are masked or hashed
- No hosted LLM calls are used for identity matching
- Automated decisions include evidence and confidence
- Ambiguous matches go to human review
- Reviewer decisions write audit logs
- Wrong links can be deactivated without deleting source records
- Conservative thresholds are used because a wrong merge is more costly than a missed merge

## Prototype vs Production Data Flow

| Prototype | Production |
| --- | --- |
| CSV/Excel-style synthetic mock database | Authorized department APIs or scheduled exports |
| Synthetic records and activity events only | Real department data with permissions |
| Simulated identifier verification | Official registry/API validation where authorized |
| Basic Kannada/transliteration examples | Full multilingual normalization |
| Rule-based scoring | Calibrated scoring with reviewer feedback |
| Local/demo backend | Secure cloud/on-prem deployment |
| Demo audit trail | Role-based access, encryption, audit retention, monitoring |

Production deployment can connect to authorized systems such as e-Karmika, Factories/e-Suraksha, KSPCB, BESCOM, BWSSB, Fire, Food Safety, and local-body systems without replacing the source systems.

## Limitations And Future Work

- Real government data will be messier than synthetic data.
- Some businesses will remain provisional until more evidence is provided.
- Kannada and transliteration support is basic in this prototype.
- Activity scoring is rule-based and should be calibrated with real department inputs.
- Full production needs secure APIs, role-based access, encryption, official validation services, and data-sharing approvals.
- Reviewer feedback should gradually improve matching weights and thresholds.

## Impact

SETU can help Karnataka:

- Create a trusted UBID for operating establishments across departments.
- Reduce duplicate and conflicting business records.
- Identify active, dormant, closed, and unknown businesses.
- Find high-risk businesses needing inspection or cleanup.
- Support intelligence queries that were previously difficult across silos.
- Make officer decisions explainable, auditable, and reversible.
- Build a scalable business intelligence backbone without modifying existing department systems.

SETU is not just a registration portal. It is a governance intelligence layer that connects fragmented department records into one explainable, human-governed business identity system.
