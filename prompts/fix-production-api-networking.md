# Fix Production API Network Errors

## Goal
Route browser API and Server-Sent Event (SSE) requests through the frontend's same-origin `/api` Vercel rewrite in production, preventing browser CORS failures or stale `VITE_API_URL` settings from breaking seller AI Insights.

## Findings
- The configured production backend `https://ecommerce-backend-nine-beta.vercel.app/health` responds HTTP 200.
- The frontend Vercel config already rewrites `/api/*` to that backend.
- The frontend currently honors `VITE_API_URL` in production. A configured/stale backend URL bypasses the same-origin rewrite and requires the backend's CORS allow-origin to exactly match the deployed frontend.
- No frontend `.env*` file is present in this checkout; Vercel dashboard environment variables may still be configured externally.

## Affected Files
- `frontend/app/lib/api.ts`
- `frontend/app/lib/auth-client.ts`
- `readme.md`
- `frontend/README.md`

## Implementation
- In development, allow `VITE_API_URL` as an optional backend override and otherwise keep `http://localhost:5000`.
- In production, always use same-origin relative API paths (empty API base), so Vercel's existing `/api/*` rewrite handles JSON requests and SSE streams. Do not let `VITE_API_URL` bypass this production route.
- Keep credentials enabled and preserve existing API error handling and SSE behavior.
- Update docs to clarify that `VITE_API_URL` only overrides the development API host; production uses the deployed frontend's `/api` rewrite.

## Done
- Production code does not make browser API/SSE requests directly to localhost or an independently configured backend host.
- Local development still targets localhost by default.
- Frontend typecheck and production build pass.
