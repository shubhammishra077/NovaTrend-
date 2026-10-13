# Admin Seller Approval Failure

## Goal

Prevent failures to enqueue a seller approval email from turning a successful seller approval into an HTTP 500 response.

## Findings

- `backend/src/routes/admin.js` updates the seller record, then sends an Inngest email event inside the same `try` block.
- If `inngest.send` fails, the API responds with `Failed to approve seller` even though the database update has already succeeded.
- `frontend/app/routes/admin/sellers.tsx` displays a generic error without the API error message, making failures difficult to diagnose.

## Scope

- Keep the database approval update and authorization behavior unchanged.
- Treat the email event as a best-effort side effect: log delivery failure explicitly, but return the successful approval response if the database update succeeded.
- Preserve an error response if reading or updating the seller fails.
- Show API error detail in the admin failure toast when available.
- Do not alter seller rejection, email content, role policy, or unrelated routes.

## Definition of done

- An Inngest event delivery failure after a successful database update does not return HTTP 500.
- Database read/update errors still return an error response.
- Admin UI shows useful API error details when an action fails.
- Relevant backend syntax and frontend type checks pass.
