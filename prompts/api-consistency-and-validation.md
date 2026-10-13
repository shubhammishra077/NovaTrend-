# API Validation, Errors, Authorization, and Query Consistency

## Goal
Improve backend API consistency without changing intended behavior or unnecessarily rewriting working code. Introduce reusable request validation, consistent error responses, shared authorization/query helpers, and validated constants for role and lifecycle status values.

## Scope
- Inspect Express app/middleware, backend route and controller structure, Prisma models, frontend API error handling, and existing unit/integration tests before editing.
- Reuse an existing validation library if present. If none exists, prefer small, dependency-free validators or ask before introducing a dependency.
- Validate request bodies, query parameters, and route parameters at the API boundary for the routes touched; preserve existing response data and status codes unless the current behavior is demonstrably inconsistent or unsafe.
- Standardize expected API errors into a stable JSON shape while avoiding leakage of stack traces, provider credentials, or database internals. Preserve useful field-level validation details.
- Consolidate duplicated auth/role/seller-approval/ownership checks and repeated pagination/filter/query construction only where it reduces divergence without obscuring resource-specific rules.
- Define shared validated constants/predicates for order, payment, product, delivery, and role states that are actually used; reject unknown transitions and values instead of accepting arbitrary strings.
- Keep all backend local imports suffixed with `.js`.
- Add unit and API integration regression tests for invalid payloads, query/status validation, authorization boundaries, and stable error shapes.
- Update directly affected API docs/prompts/README only as needed.

## Constraints
- Preserve public API contracts unless a change is required for correctness/security; document any response-shape change.
- Do not weaken authentication, authorization, validation, or existing permission checks.
- Keep changes focused; do not rewrite all controllers or introduce broad abstraction layers.
- Database-backed tests must run only against the dedicated disposable MongoDB replica set and remain skipped by default.
- Do not inspect, print, or copy real environment secret values.

## Verification
- Run backend unit tests and JavaScript syntax checks.
- Run the disposable-database integration suite only when a safe replica-set test database is explicitly configured.
- Run frontend typecheck if API error types or consumed response shapes change.
- Run `git diff --check`.

## Done
- Request validation, API errors, authorization helpers, reusable query logic, and state constants follow shared conventions on the relevant API surfaces.
- Regression tests demonstrate invalid input rejection, stable error envelopes, and preserved ownership/role behavior.
- Report what was covered and any deliberately deferred surfaces.
