# SETU / K-BIG Prototype Notes

This document records the product assumptions, governance guardrails, dataset design, and prototype-vs-production boundary for SETU / K-BIG.

## Current Prototype Status

SETU is configured as a single-project Vercel demo with:

- React/Vite frontend under `frontend/`
- FastAPI backend under `backend/`
- Vercel API entrypoint at `api/index.py`
- Synthetic CSV mock database under `data/mock_database/`
- Single-project routing in `vercel.json`
- MongoDB support through `MONGODB_URI`
- Mock/in-memory fallback for demo environments without MongoDB

Preserved original HTML prototype:

```text
frontend/raw-html-prototype/setu_ubid_identity_engine.html
```

## Problem Statement Fit

The prototype addresses the Karnataka Government need for:

- A Unified Business Identifier (UBID) across fragmented department records
- Explainable linking between records that may not share PAN/GSTIN
- Human review for ambiguous or conflicting matches
- Activity intelligence for Active, Dormant, Closed, and Unknown/Insufficient Data states
- Audit logs and reversible/deactivatable link concepts
- BI queries, graph inspection, and area-level intelligence

## Research Alignment

SETU treats PAN and GSTIN as useful signals, not mandatory anchors.

Official e-Karmika Shops and Commercial Establishments SOP material from the Government of Karnataka Department of Labour describes an online application process, officer verification, and document uploads such as owner identity/address proof, establishment address proof, incorporation certificate where applicable, and signed registration form. This supports matching models that use establishment identity, address, owner/signatory, and document/licence evidence rather than PAN/GSTIN alone.

Source: [e-Karmika SOP/help manual, Government of Karnataka Department of Labour](https://www.ekarmika.karnataka.gov.in/ekarmika/Documents/SOP%20HELP%20MANUAL%20Shops%20and%20establishment.pdf)

## Dataset Design

Prototype dataset:

| Dataset item | Count |
| --- | ---: |
| Department business records | 447 |
| Business dataset columns | 45 |
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

The mock business dataset includes:

- Clean cross-department matches
- Slight business-name differences
- Address spelling/abbreviation differences
- Missing PAN/GSTIN cases
- Invalid PAN/GSTIN cases
- PAN/GSTIN mismatch cases
- Licence-only matches
- BESCOM/BWSSB consumer-number matches
- Owner/signatory/contact evidence
- Kannada/transliteration-style name examples
- False-friend business names that should not merge
- Provisional/unresolved cases

The activity dataset includes:

- Renewal
- Compliance filing
- Inspection
- Electricity usage
- Water usage
- Licence update
- Pollution consent
- Trade licence renewal
- Low utility consumption
- Closure application
- Licence cancelled

## Identity Model

SETU separates:

- **Legal entity anchor:** PAN/GSTIN hash/status when available.
- **Establishment / operating unit UBID:** The business establishment identity across department systems.

This distinction matters because PAN/GSTIN can represent legal/tax identity, while the UBID is meant to represent the operating establishment or business unit that appears across Karnataka department records.

## Matching Model

Evidence signals:

- PAN/GSTIN match
- Licence number match
- Utility consumer number match
- Business-name similarity
- Address similarity
- PIN/district match
- Owner/contact/signatory similarity
- Conflict penalties

Decision thresholds:

| Confidence | Decision |
| --- | --- |
| 90-100 | Auto-link |
| 65-89 | Human Review |
| Below 65 | Keep separate or create provisional UBID |

Thresholds are conservative because a wrong merge is more harmful than a missed merge in a government identity system.

## Activity Intelligence Model

Activity status is inferred from events, not guessed from a single department field.

Operational status examples:

- **Active:** Recent renewal, inspection, compliance filing, or utility usage.
- **Dormant:** Stale renewal/inspection/filing signals or low activity.
- **Closed:** Closure application, licence cancellation, or shutdown-type evidence.
- **Unknown/Insufficient Data:** Not enough evidence to classify confidently.

Compliance risk is separate from operational status. A business can be operationally Active but still High Risk if licence, consent, or inspection evidence is stale.

## Governance Guardrails

- Synthetic data only
- Source department systems modeled as read-only inputs
- No hosted LLM used for identity matching
- Raw PAN/GSTIN must not be exposed in UI or public API output
- PAN/GSTIN demo outputs are masked or hashed
- Ambiguous cases are routed to human review
- Reviewer decisions are audit logged
- Unmatched activity events are surfaced for review
- Wrong links can be deactivated without deleting source records
- Audit logs preserve actor, reason, before/after state, and timestamp where applicable

## Prototype vs Production Data Flow

| Prototype | Production |
| --- | --- |
| CSV/Excel-style synthetic mock database | Authorized APIs, secure pipelines, or scheduled exports |
| Synthetic records and events only | Real department data with permissions |
| Simulated identifier verification | Official validation services where authorized |
| Local rule-based scoring | Calibrated scoring using reviewer decisions |
| Demo role model | Role-based access control |
| Demo audit logs | Durable audit retention and monitoring |
| No hosted LLM for matching | No raw PII to hosted LLMs; strict data-sharing controls |

Potential production integrations:

- e-Karmika Shops and Establishments
- Factories/e-Suraksha
- KSPCB
- BESCOM
- BWSSB
- Fire and Emergency Services
- Food Safety
- Local-body trade licence systems

## Demo Boundaries

The prototype is judge-ready for demonstrating workflow and architecture, but it does not claim:

- Real government verification
- Real PAN/GSTIN validation
- Production-grade identity matching
- Full Kannada NLP support
- Production-grade security hardening
- Official department-system integration

## Future Work

- Connect authorized department APIs or secure scheduled exports
- Add production authentication and role-based permissions
- Expand Kannada and transliteration normalization
- Calibrate scoring with reviewer-labelled examples
- Add stronger duplicate-cluster review and batch operations
- Add production observability and audit retention policies
- Add encrypted storage and key-management controls for sensitive identifiers
