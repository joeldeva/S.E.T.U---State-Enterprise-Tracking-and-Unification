# SETU / K-BIG Deployment Specification

SETU is deployed as one Vercel project from the repository root. The deployment serves both the React frontend and the FastAPI backend under one domain.

## Target Shape

```text
https://your-project.vercel.app/          React frontend
https://your-project.vercel.app/health    FastAPI health check
https://your-project.vercel.app/api/...   FastAPI API routes
```

Current demo alias:

```text
https://s-e-t-u-state-enterprise-tracking-a-mu.vercel.app/
```

## Required Files

```text
vercel.json
package.json
requirements.txt
api/index.py
frontend/package.json
frontend/vite.config.ts
backend/app/main.py
```

## Vercel Settings

```text
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: frontend/dist
Install Command: default or None
```

The root `package.json` runs:

```json
{
  "scripts": {
    "build": "cd frontend && npm ci && npm run build"
  }
}
```

## Routing

`vercel.json` maps:

```text
/api/(.*)  -> /api/index.py
/health    -> /api/index.py
/(.*)      -> /index.html
```

This lets frontend and backend share one origin and avoids production CORS issues.

## Environment Variables

Durable production database:

```text
MONGODB_URI=<MongoDB Atlas connection string>
MONGODB_DB=kbig_demo
APP_ENV=production
```

Do not set `VITE_API_BASE_URL` for the single-project deployment. The frontend should call `/api/...` on the same domain.

If `MONGODB_URI` is not set or unavailable, the backend can run in mock mode for demo availability. Mock mode is not durable.

## Deploy Commands

Production deploy:

```powershell
npx vercel deploy --prod --yes --scope joeldevas-projects --no-wait
```

Inspect a deployment:

```powershell
npx vercel inspect <deployment-url> --scope joeldevas-projects
```

## Verification Checklist

After deployment:

```text
/                                      loads the SETU UI
/health                                returns backend JSON
/api/dashboard                         returns dashboard data
/api/mock-database/summary             returns synthetic dataset summary
/api/mock-database/records?limit=1      returns masked mock record output
/api/matching/thresholds               returns threshold configuration
/api/activity/unmatched-events         returns unmatched events for review
```

Manual UI checks:

- Intro screen renders Karnataka/SETU branding.
- Dashboard opens without blank cards.
- Data Ingestion submits a known mock business and shows a full UBID result page.
- Mock CSV Spreadsheet opens and scrolls horizontally.
- UBID Registry shows Open Source Links and Deactivate Link actions near the top.
- Review Queue cards show evidence and approve/reject actions.
- Activity Intelligence shows unmatched activity events.
- BI Query cards run and display returned results.
- Identity Graph renders connected department records.
- PIN-code Map renders Karnataka map and clickable PIN summaries.
- Audit Logs render timeline entries.

## Common Deployment Issues

If `/` loads but `/health` fails:

- Check `requirements.txt`.
- Check `api/index.py`.
- Check Vercel function build logs.

If `/api/...` works locally but not on Vercel:

- Confirm `vercel.json` routes are deployed.
- Confirm Python dependencies installed in Vercel.
- Confirm `MONGODB_URI` is correct or mock fallback is acceptable.

If UI actions fail on Vercel:

- Make sure `VITE_API_BASE_URL` is not pointing to an old backend.
- Check browser console for failed `/api/...` calls.
- Verify `/health` and `/api/dashboard` on the same domain.

If Vercel still shows an older UI:

- Confirm the latest commit was pushed to `main`.
- Run a production deploy.
- Inspect the deployment until status is `Ready`.
- Reload the public alias with cache disabled.

## Privacy And Security Deployment Notes

- Do not put raw PAN/GSTIN in environment variables, logs, or hosted LLM prompts.
- The deployed demo uses synthetic data.
- Official production integration would require authorized department APIs, secure pipelines, role-based access, encryption, monitoring, and audit retention.
- The prototype should describe official verification as simulated unless a real authorized API integration is added.
