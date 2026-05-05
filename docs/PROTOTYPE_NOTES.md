# S.E.T.U - State Enterprise Tracking and Unification

## Product Demo Status

S.E.T.U is currently configured as a single-project Vercel product demo.

Current preserved original prototype file:

```text
frontend/raw-html-prototype/setu_ubid_identity_engine.html
```

Current application shape:

- React/Vite frontend under `frontend/`
- FastAPI backend under `backend/`
- Vercel API entrypoint at `api/index.py`
- Single-project Vercel routing in `vercel.json`
- MongoDB Atlas supported through `MONGODB_URI`

## Governance Notes

- This product demo uses synthetic data only.
- Source department systems are treated as read-only.
- Automated decisions must be explainable.
- Merge/reviewer decisions must be auditable and reversible in concept.
- No hosted LLM is used for identity matching.
- Raw PAN/GSTIN values must not be exposed in the UI.

## Prototype vs Production Data Flow

Prototype:

- CSV/Excel mock database
- Synthetic data only

Production:

- Authorized APIs
- Secure data pipelines
- Scheduled exports
- Role-based access
- Audit logging
- No raw PII to hosted LLMs

## Department Field Alignment Rationale

S.E.T.U now treats PAN and GSTIN as optional identity signals, not mandatory anchors. The mock department database and normalization logic prioritize fields commonly present in Karnataka department workflows: establishment/business name, postal/site address, district, PIN code, employer/owner/promoter/authorised signatory details, contact information, registration/licence/consent numbers, utility consumer numbers, commencement/registration/renewal/inspection dates, and department status flags.

Research notes used for this alignment:

- Karnataka Shops and Commercial Establishments Form A asks for establishment name and postal address, nature of business, employer/partner/director details, telephone/fax/email, commencement and employment details. The form structure supports matching by establishment identity, address, employer/signatory and business nature rather than assuming PAN/GSTIN is always present. Source: [Karnataka Shop Establishment Application Form A](https://d4h9pka4iq2rv.cloudfront.net/ApplicationForm/KarnatakaShopEstablishment-ApplicationFormA.pdf).
- Karnataka Shops and Commercial Establishments Rules/Form references include registration certificate number/date, employer name, establishment postal address, establishment name, and nature of business. Source: [Karnataka Shops and Establishments Rules, 1963](https://www.datocms-assets.com/40521/1623320534-karnataka-shops-and-estalishment-rules-1963.pdf).
- e-Karmika SOP/checklist material lists upload documents such as identity/address proof, establishment address proof, incorporation/MOA where applicable, signed Form A, and payment receipt. This supports modeling address-proof and establishment-document fields in the mock database. Source: [e-Karmika SOP/help manual mirror](https://www.scribd.com/document/885760316/SOP-HELP-MANUAL-Shops-and-Establishment).
- Factory registration document checklists emphasize factory plans, fee challans, process write-up, possession/lease/sale/rental proof, questionnaire, stability certificate, KSPCB clearance where applicable, fire/NOC or local approvals where applicable, and other prescribed documents. This supports matching by factory licence, plan/stability references, site address, and KSPCB consent references. Source: [Karnataka Factory Registration documents overview](https://www.indiafilings.com/learn/karnataka-factory-registration).

Implementation implications:

- Licence, registration, consent, trade licence, BESCOM and BWSSB consumer numbers are strong local anchors.
- Name/address/PIN/district similarity is secondary evidence when identifiers are missing.
- Owner/promoter/signatory/contact fields add confidence but do not replace officer review for ambiguous cases.
- PAN/GSTIN, when submitted, are validated and masked, but missing PAN/GSTIN does not block provisional UBID creation.
