# Fix Seller Order Status Updates

## Goal
Ensure sellers can update the status of orders containing their products. A notification queue failure must not turn an already-persisted status update into a failed API response.

## Affected Routes / Endpoints
- `PATCH /api/orders/:id/status` in `backend/src/routes/order.js`
- `updateOrderStatus` in `backend/src/controllers/order.js`
- Existing seller order status mutation and toast in `frontend/app/hooks/use-orders.ts` and `frontend/app/routes/seller/orders.tsx`, only if the backend fix does not explain the reported behavior.

## Data Model Changes
None.

## Root Cause
`updateOrderStatus` saves the status, then awaits `inngest.send` for the customer email inside the same `try`. If Inngest is unavailable, the controller returns HTTP 500 even though the order status was already changed. This makes the seller see a failure and can leave the UI stale.

## Implementation
- Preserve existing seller authorization, order ownership checks, status validation, and status persistence.
- Treat the post-update email event as best-effort: log enqueue failures and still return the successfully updated order.
- Keep API failures explicit for actual order lookup or database update failures.
- Ensure the frontend query invalidation continues to refresh seller order data after a successful response.
- Avoid unrelated changes.

## Edge Cases
- Seller does not own an item in the order: retain 403.
- Unknown order: retain 404.
- Invalid status: retain 400.
- Inngest unavailable after persistence: return success with the updated order and log the notification failure.

## Done
- A valid seller status update succeeds even if Inngest cannot enqueue the email.
- Authorization and validation behavior remain unchanged.
- Backend syntax checks pass; run focused frontend checks only if frontend code changes.
