# Fix Local Google OAuth Redirect URI

## Goal
Fix the local Google OAuth redirect URI mismatch without breaking the production Vercel proxy setup.

## Root Cause
The local `backend/.env` currently sets `BETTER_AUTH_URL=http://localhost:5173`, but local Better Auth requests are served directly by the backend on port 5000. Google therefore receives a callback URI on the frontend origin.

## Implementation
- Set the ignored local `backend/.env` value `BETTER_AUTH_URL=http://localhost:5000`.
- Keep the production configuration guidance that `BETTER_AUTH_URL` points to the frontend origin when Vercel rewrites `/api/auth/*` to the backend.
- Document local Google OAuth values:
  - Authorized JavaScript origin: `http://localhost:5173`
  - Authorized redirect URI: `http://localhost:5000/api/auth/callback/google`
- Do not read, print, or change any other local environment variables or secrets.
- Google Cloud Console must be updated manually; local code cannot add an OAuth URI to Google's allowlist.

## Done
- Local auth config uses the backend origin, matching where Better Auth's OAuth callback handler is mounted.
- The exact Google Console origin and callback URI are documented.
- Production Vercel auth URL behavior is preserved.
