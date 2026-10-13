# Fix AI Insights Network Error

## Goal
Make seller AI Insights work reliably in local development and report actionable failures instead of surfacing a broken network stream.

## Root Causes
- The local Inngest dev server was not started with the backend. The AI endpoint sent an event after starting its SSE response; when `inngest.send()` failed, the browser saw a network error.
- Backend environment variables were loaded after importing dependent modules.
- The configured Gemini model ID was not listed in Google's supported model documentation.
- Failed Inngest runs did not mark their persisted stream as failed, leaving the browser request open.

## Implementation
- Start the backend API and Inngest dev server together from `backend` using `npm run dev`.
- Queue AI work before sending SSE headers; return a clear HTTP error if event delivery fails.
- Load `.env` before importing backend modules and read the Gemini key at generation time.
- Use the `gemini-3.5-flash-lite` model required by the current API response.
- Mark a stream failed after Inngest exhausts retries so the existing SSE endpoint can close with an error event.
- Preserve the shared API URL behavior already configured for local and production requests.

## Done
- Local AI Insights jobs can be delivered to registered Inngest functions.
- Queue or generation failures are visible to the seller rather than becoming network errors or indefinitely open streams.
- Backend JavaScript syntax checks and the frontend typecheck/build pass.
