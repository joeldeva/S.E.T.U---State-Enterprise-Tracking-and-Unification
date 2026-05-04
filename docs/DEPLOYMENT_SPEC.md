# K-BIG Deployment Specification

## Target Shape

K-BIG deploys as one Vercel project from the repository root.

```text
https://your-project.vercel.app/          React frontend
https://your-project.vercel.app/health    FastAPI health check
https://your-project.vercel.app/api/...   FastAPI API routes
```

## Required Vercel Settings

```text
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: frontend/dist
Install Command: default or None
```

## Required Files

```text
vercel.json
package.json
requirements.txt
api/index.py
frontend/package.json
backend/app/main.py
```

## Routing

`vercel.json` maps:

- `/api/(.*)` to `/api/index.py`
- `/health` to `/api/index.py`
- every other route to `/index.html`

This lets the frontend and backend share one domain and avoids cross-origin API calls in production.

## Environment Variables

Production MongoDB:

```text
MONGODB_URI=<MongoDB Atlas connection string>
MONGODB_DB=kbig_demo
APP_ENV=production
```

Do not set `VITE_API_BASE_URL` for the single-project deployment.

## Verification Checklist

After deployment:

```text
/                     loads the K-BIG UI
/health               returns backend JSON
/api/dashboard        returns dashboard JSON
/api/matching/run     accepts POST
/api/activity/run     accepts POST
```

If `/` loads but `/health` fails, check Python requirements and `api/index.py`.

If `/api` works but UI actions fail, check browser console and make sure `VITE_API_BASE_URL` is not pointing to an old separate backend.
