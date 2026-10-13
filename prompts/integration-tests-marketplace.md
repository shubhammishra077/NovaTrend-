# Marketplace Checkout and Authorization Integration Tests

## Goal
Expand the disposable-MongoDB API integration suite to cover the highest-risk checkout, payment, inventory, order ownership, seller isolation, and administrator authorization behavior. Tests must exercise the running Express API and verify persisted database state; do not use production data or weaken authorization.

## Scope
- Reuse the existing `backend/test/auth-flow.integration.test.js` server lifecycle, temporary account fixtures, webhook signing helper, and cleanup patterns where practical.
- Add a successful checkout assertion for server-calculated totals, order ownership/status, and inventory reservation.
- Test invalid checkout inputs and invalid/unissued promotion codes; rejected checkout must not change stock.
- Test stock contention by issuing concurrent checkouts for the final available unit. Exactly one request may succeed, the other must conflict, and stock must never become negative.
- Cover Razorpay captured payment success, payment failure, amount mismatch, duplicate captured/failed webhook delivery, and verify resulting order/payment/inventory state after each event.
- Verify COD cancellation restores inventory exactly once, rejects unauthorized order changes, and prevents sellers from cancelling mixed-seller orders or affecting another seller's inventory.
- Verify administrator-only operations reject unauthenticated and non-admin callers and accept an authorized admin.
- Ensure every fixture created by the test is removed in `finally`, including partially created fixtures where possible.

## Safety and execution
- Run database-backed cases only when `RUN_AUTH_INTEGRATION=true` against a dedicated disposable MongoDB replica set.
- Keep ordinary `npm test` safe to run without a configured database; integration tests must be skipped by default.
- CI must use its temporary MongoDB replica set and provide only test credentials.

## Done
- New API integration assertions cover checkout, concurrent stock reservation, payment success/failure/idempotency, cancellation restoration, seller isolation, and admin authorization.
- Backend unit/integration test runner and JavaScript syntax checks pass; report integration tests as unverified if no disposable replica set is available.
