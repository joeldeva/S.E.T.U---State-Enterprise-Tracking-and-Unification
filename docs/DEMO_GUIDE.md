# SETU / K-BIG Demo Guide

Use this guide when presenting the prototype to judges or reviewers.

## Demo URL

```text
https://s-e-t-u-state-enterprise-tracking-a-mu.vercel.app/
```

## Recommended Demo Order

1. Intro screen
2. Executive Dashboard
3. Data Ingestion / Business Registration
4. Mock CSV Spreadsheet
5. UBID Registry / UBID Profile
6. Review Queue
7. Activity Intelligence
8. BI Query Engine
9. Identity Graph
10. PIN-code Map
11. Audit Logs

## 1. Executive Dashboard

Show:

- Primary attention metric
- UBIDs generated
- Pending verification
- Active/Dormant/Closed mix
- Reviewer Feedback Learning card

Message:

SETU is not only a registration screen. It is a control-room layer for identity, review workload, activity status, and intelligence queries.

## 2. Data Ingestion / Business Registration

Use the form to demonstrate that SETU can work with:

- Business name
- Address and PIN code
- PAN/GSTIN when available
- Factory licence number
- Shop licence number
- Labour registration number
- KSPCB consent number
- BESCOM/BWSSB consumer number
- Trade licence number
- Owner/contact information

Expected outputs:

- Format validation messages
- Identifier existence check against synthetic CSV data
- UBID result page
- Masked PAN/GSTIN output
- Match confidence and matched department records
- Provisional/review status when evidence is weak or conflicting

Do not enter real PAN/GSTIN. Use synthetic demo data only.

## 3. Mock CSV Spreadsheet

Click `View Mock CSV Spreadsheet` from Data Ingestion.

Show:

- Synthetic records loaded
- Search
- Horizontal scrolling
- Sticky record columns
- Date columns
- Licence/reference columns
- Masked CSV download

Message:

The prototype uses CSV/Excel-style synthetic department data. In production, this layer would connect to authorized department APIs, secure pipelines, or scheduled exports.

## 4. UBID Registry / Profile

Show:

- One UBID per operating establishment
- Legal Entity Anchor section
- Establishment / Operating Unit UBID section
- Confidence signal breakdown
- Department source links near the top
- `Open Source Links`
- `Deactivate Link`
- Activity timeline

Message:

PAN/GSTIN may identify legal/tax identity. UBID identifies the operating business establishment across department systems.

## 5. Review Queue

Show:

- Case-management layout
- Two records side by side
- Evidence/signal breakdown
- Approve/reject/insufficient data actions
- Confidence threshold explanation

Message:

Ambiguous matches are not silently merged. Human review protects against false merges.

## 6. Activity Intelligence

Show:

- Active/Dormant/Closed/Insufficient Data classification
- Evidence timeline
- Activity score breakdown
- Unmatched Activity Events panel

Message:

Activity status is based on renewal, filing, inspection, utility, consent, closure, and cancellation events. Events that cannot be confidently joined to a UBID remain visible for review.

## 7. BI Query Engine

Run:

```text
Active factories in PIN code 560058 with no inspection in the last 18 months
```

Also show other query cards:

- Dormant businesses with active pollution consent
- Businesses with utility usage but expired licence
- Businesses active in one department but missing from another
- High-confidence duplicate clusters
- Unmatched activity events

Message:

UBID linkage turns fragmented department records into cross-department intelligence.

## 8. Identity Graph

Show:

- UBID as the central node
- Department records as linked nodes
- Evidence/confidence for links

Message:

Reviewers can inspect why records are connected instead of trusting an opaque merge.

## 9. PIN-code Map

Show:

- Karnataka map
- Clickable PIN summaries
- Active/dormant/closed counts
- High-risk inspection gaps
- Department coverage gaps

Message:

SETU supports area-level intelligence without exposing exact business locations.

## 10. Audit Logs

Show:

- Timeline view
- Action types
- Actor/reason fields
- Expandable record details
- Link deactivation/audit concept

Message:

Every important decision is traceable and reversible in concept.

## Suggested Test Scenarios

| Scenario | Expected result |
| --- | --- |
| Strong PAN/GSTIN evidence from synthetic data | Verified mock-match UBID with high confidence |
| Licence-only evidence | UBID generated without depending on PAN/GSTIN |
| BESCOM/BWSSB consumer evidence | Utility record contributes to match/activity evidence |
| Similar name + address + PIN | Match explanation or human review |
| Invalid identifier format | Validation warning |
| PAN/GSTIN mismatch | Conflict warning and review |
| No matching mock record | Provisional self-submitted UBID |
| Recent utility usage with stale licence | Active status plus elevated risk |
| Unmatched activity event | Visible in review panel/query, not dropped |

## Final Submission Checklist

- Live URL opens.
- `/health` returns `status: ok`.
- Data Ingestion can generate a UBID.
- Mock CSV Spreadsheet scrolls horizontally.
- UBID Registry source actions are visible at the top.
- Review Queue opens without blank state.
- Activity Intelligence shows unmatched events.
- BI Query returns results.
- Identity Graph renders.
- PIN-code Map is interactive.
- Audit Logs render.
- No real PAN/GSTIN is entered or displayed.
