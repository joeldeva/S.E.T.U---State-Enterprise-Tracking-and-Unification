# K-BIG - Karnataka Business Intelligence Grid

## Product Demo Status

K-BIG is currently configured as a single-project Vercel product demo.

Current preserved original prototype file:

```text
frontend/raw-html-prototype/kbig_ubid_identity_engine.html
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
