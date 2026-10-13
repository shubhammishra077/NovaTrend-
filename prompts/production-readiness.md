# Production Readiness: Tests, Security, Payments, and UX

## Goal

Improve production readiness in small, reviewable phases, starting with automated tests and pull-request CI, then hardening payment and API behavior, improving Ask AI and operational visibility, and polishing critical shopping/account/dashboard flows. Preserve current behavior unless a security or correctness fix requires a documented change. Do not deploy, run destructive database operations, or expose secrets as part of implementation.

The repository is a MERN marketplace: JavaScript ES modules and Express 5 in `backend/`, React Router Framework Mode and TypeScript in `frontend/`, Prisma with MongoDB, Better Auth, Razorpay, Inngest, Resend, UploadThing, and Gemini. Backend local imports must end in `.js`. The repository currently has no test files or test scripts and no `.github/workflows` CI workflow. Use existing npm lockfiles and `npm ci`. The previously agreed refund terms are 14 days from delivery and video unboxing proof; do not invent additional refund promises.

## Implementation Order

Implement and validate each phase before proceeding to the next. Keep changes narrowly scoped to this request and preserve unrelated worktree changes.

### Phase 1: Automated Tests and CI (first)

- Add deterministic automated coverage for signup/login behavior, admin seller approval, seller product ownership/permissions, order ownership, server-calculated checkout totals, and Razorpay signature/payment verification.
- Test both allowed and denied cases, including unauthenticated/unauthorized access, tampered totals, mismatched Razorpay order/payment details, invalid signatures, and duplicate payment notifications.
- Keep tests isolated from production credentials and external payment/email/AI services. Use existing project patterns where available; otherwise add only the smallest suitable test tooling and expose narrow test seams rather than weakening production checks.
- Add GitHub Actions CI for pull requests (and the repository's mainline pushes): install frontend and backend dependencies with `npm ci`, run frontend typecheck, backend JavaScript syntax checks, and automated tests. Ensure CI does not require production secrets or mutate a live database.
- Add the test scripts and any necessary documentation for running tests locally.

### Phase 2: Checkout and Payment Safety

- Audit `backend/src/controllers/order.js`, `backend/src/routes/order.js`, `backend/src/routes/razorpay-webhook.js`, `backend/src/lib/razorpay.js`, and relevant Prisma models.
- Verify Razorpay webhook signatures over the exact raw request bytes before processing. Preserve the raw-body parser ordering and reject missing/invalid signatures.
- Make webhook and browser-verification payment transitions idempotent under duplicate and concurrent delivery. Never mark an order paid based only on browser-submitted data.
- Reconcile uncertain payment states using Razorpay's server-side payment/order status before deciding whether an order is paid or failed. Do not silently release stock or claim payment failure when provider status is unknown.
- Prevent overselling with atomic conditional stock updates that only decrement when sufficient stock remains. Handle multi-item orders and partial decrement failures safely; use transactions only if supported by the configured MongoDB deployment. If rollback is not reliable, use an explicit reservation/compensation approach and test it.
- Preserve distinct COD and Razorpay semantics: COD orders are not reported as prepaid; failures and cancelled checkout retain an actionable retry path without duplicating orders or charging twice.
- Any required Prisma changes must be backward-compatible where possible, covered by schema validation, and documented with a safe production rollout. Never run `db push` against a production database during implementation.

### Phase 3: API Protection

- Apply Redis-backed rate limiting to authentication (sign-up/sign-in), checkout/order creation and payment verification, and Ask AI. Configure through environment variables and fail safely/explicitly if required production limiter configuration is absent; avoid silently falling back to per-instance limits in production.
- Return consistent `429` responses with appropriate retry information. Keep limits configurable and testable without Redis in the unit-test suite; add an integration test strategy for Redis-backed behavior.
- Validate request bodies and relevant query/path parameters at API boundaries using existing project conventions, returning safe, consistent client errors without exposing internal details.
- Audit seller/admin mutation endpoints and order reads for server-side authentication, role, ownership, and approval checks. Add regression tests for any corrected authorization gaps.
- Do not change public API behavior without updating its consumers and tests.

### Phase 4: Ask AI

- Bound request size, message length, frequency, and upstream work; handle provider failures/timeouts explicitly and avoid logging prompts, personal data, or order details unnecessarily.
- Make order-status intent detection robust enough to distinguish order lookups from general questions. Retrieve only the authenticated user's orders; never rely on model output for authorization.
- Ground refund answers in the existing policy: 14 days from delivery and video unboxing proof. Clearly describe this as the published policy, avoid guaranteeing approval, and route ambiguous or account-specific refund decisions to the existing support/contact path.
- Add tests for order ownership, intent detection, limits, prompt injection boundaries, and provider failures.

### Phase 5: Operational Visibility and Deployment Documentation

- Add structured server-side logs with request correlation and useful context for API failures, Razorpay payment/webhook failures, Inngest job failures, and email delivery failures. Redact secrets, cookies, payment credentials, authorization headers, and unnecessary personal/order data.
- Integrate Sentry using a server-side DSN configuration, capturing actionable exceptions and payment/webhook/background-job failures without sending secrets or sensitive request bodies. Keep local development usable when Sentry is not configured.
- Add health/readiness behavior that does not leak secrets or report a healthy database when its connection check fails. Preserve existing health endpoint compatibility.
- Document required environment variables, Redis/Sentry setup, webhook URLs/events, background-job endpoint configuration, health checks, and safe database schema rollout. Do not put real credentials in source or example files.

### Phase 6: Shopping Experience

- Review product search/filtering and empty/loading/error states, then test responsive layout and keyboard/screen-reader accessibility in checkout, account, and seller/admin dashboards.
- Reuse current design tokens and installed UI components. Avoid broad redesigns or unrelated screens; fix concrete usability/accessibility defects found in these critical paths.
- Add or adjust focused frontend tests only where existing tooling supports them without introducing a disproportionate test stack.

## Affected Routes, Services, and Configuration

- Backend auth and API entry: `backend/src/lib/auth.js`, `backend/src/server.js`, and the route modules mounted there.
- Checkout/payments: `backend/src/controllers/order.js`, `backend/src/routes/order.js`, `backend/src/routes/razorpay-webhook.js`, `backend/src/lib/razorpay.js`, and `backend/prisma/schema.prisma` only if the implementation requires data changes.
- Ask AI: `backend/src/routes/ask-ai.js` and the existing Gemini integration.
- Background jobs and email: `backend/src/inngest/`, `backend/src/lib/emails.js`, and `backend/src/lib/resend.js`.
- Frontend impacted by behavior changes: `frontend/app/routes/checkout.tsx`, `frontend/app/routes/order-confirmation.tsx`, Ask AI UI, and product/account/dashboard routes as confirmed by audit.
- Add CI under `.github/workflows/`. Update both package manifests and lockfiles only for necessary tooling.
- Document operational configuration in the existing root/backend README rather than creating redundant deployment documents.

## Data Model and Compatibility

- Prefer no schema change unless payment reconciliation, idempotency, or safe inventory handling cannot be implemented reliably with the current fields.
- If schema changes are needed, explain the migration/rollout and backward compatibility, validate the Prisma schema, and add regression tests. Never connect implementation or CI to a production database.
- Preserve existing users, orders, products, and payment records. No bulk data rewrite or deletion.

## Edge Cases

- Duplicate, concurrent, delayed, or out-of-order Razorpay webhook and browser verification requests.
- A provider timeout or network interruption where payment outcome is unknown.
- Two customers checking out the last unit concurrently, multi-product stock updates, and failures halfway through reservation/decrement.
- COD creation, Razorpay checkout dismissal, failed payments, retry, and repeated order submission.
- Unauthenticated access, cross-user order IDs, seller access to another seller's products, unapproved sellers, and non-admin seller-approval attempts.
- Redis unavailable, rate-limit boundary conditions, malformed/oversized bodies, and downstream AI/email/Sentry failures.
- User asks about a refund without delivery date or video proof; provide only the published rule and do not invent eligibility.
- Local development and CI without Redis, Sentry, Razorpay, Resend, Gemini, or production secrets.

## What "Done" Looks Like

- [ ] Focused tests cover the six named authentication/authorization/checkout/payment areas, including deny and failure paths.
- [ ] GitHub Actions runs frontend typecheck, backend syntax checks, and tests on every pull request without production secrets or database writes.
- [ ] Payment processing is signature-verified, server-authoritative, concurrency-safe, idempotent, and handles unknown states without false success/failure.
- [ ] Stock cannot be oversold by concurrent order creation; COD and online payment flows remain distinct and recoverable.
- [ ] Redis-backed limits protect auth, checkout, and Ask AI; request validation and seller/admin ownership rules are tested.
- [ ] Ask AI is bounded and uses the actual published refund terms without exposing other users' order details.
- [ ] Structured logs and Sentry report actionable failures with sensitive values redacted; deployment/operations docs identify configuration and rollout steps.
- [ ] Critical shopping/account/dashboard flows have concrete loading, empty, and error states and are usable on mobile and with keyboard navigation.
- [ ] Frontend typecheck/build, backend syntax checks, Prisma validation if schema changed, and all automated tests pass.
- [ ] Summarize edited files and any required operator actions; do not claim a live payment/database deployment was tested.
