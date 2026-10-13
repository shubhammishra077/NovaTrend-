# Razorpay and INR Payments

## Goal

Replace Stripe checkout with Razorpay, retain Cash on Delivery, and use Indian rupees (INR) for all current product pricing, checkout, order totals, and revenue displays. Treat existing product price numbers as rupees without converting their values.

## Confirmed decisions

- Keep Cash on Delivery and add Razorpay as the online payment option.
- Existing product numeric prices become INR values as-is (for example, `100` means ₹100); do not apply a currency conversion.

## Current implementation

- Checkout selects `cod` or `stripe`.
- `backend/src/controllers/order.js` creates an order and then a Stripe Checkout session; amounts and delivery fee are currently USD.
- `backend/src/lib/auth.js` configures the Better Auth Stripe plugin and updates orders from Stripe events.
- `backend/src/routes/order.js` includes a legacy `/stripe/checkout` route.
- `backend/prisma/schema.prisma` stores `stripeSessionId` on orders.
- Currency symbols/formatting occur throughout storefront, checkout, product, order, admin, and seller revenue UIs.

## Required implementation

- Integrate Razorpay on the backend using its supported Node SDK and Checkout flow. Keep the secret exclusively server-side; expose only the public key needed by the frontend.
- Create Razorpay orders from server-calculated totals, convert INR rupees to integer paise, and do not trust client-supplied prices or totals.
- Verify the Razorpay payment signature on the backend before marking an order paid/confirmed. Add webhook signature verification for payment events and safely handle duplicate webhook delivery. Never trust the browser's success callback alone as proof of payment.
- Preserve COD order behavior. Use clear payment states for pending, successful, failed, and cancelled/abandoned online payments; do not mark pending Razorpay orders as paid.
- Replace the Stripe checkout UI and routes with Razorpay while preserving promo, delivery, inventory, and cart behavior.
- Remove Stripe runtime integration, auth plugin, dependencies, webhook handling, stale Stripe-only endpoints, and Stripe configuration documentation/environment variables. Preserve historical order records; do not perform destructive database operations or connect/push schema to the configured database.
- Review the Prisma order fields needed for Razorpay identifiers. Document any safe schema/index synchronization required for an existing MongoDB database.
- Centralize frontend currency formatting as `en-IN` / `INR` and update every user-visible product, cart, checkout, order, seller analytics, and admin revenue price display to ₹. Keep date/number formatting unrelated to money unchanged.
- Keep the prior `stripe` payment-method identifier readable for historical orders if records already exist; do not falsely label old historical USD amounts as INR. New orders must use Razorpay or COD.
- Update root/backend setup documentation with required Razorpay environment variables and local webhook setup. Never include actual credentials in tracked files.

## Affected surfaces

- Backend: `src/controllers/order.js`, `src/routes/order.js`, `src/lib/auth.js`, Stripe helper/dependencies, Prisma `Order` model, webhook/server wiring, `.env` guidance.
- Frontend: checkout/payment selector, order confirmation, API/hooks/types, and all price/revenue displays in `frontend/app`.
- Documentation: root README and backend setup instructions.

## Edge cases and security

- Handle Razorpay SDK/key misconfiguration with actionable server-side errors and no success-shaped fallback.
- Ensure amount is computed from database product prices after discounts, valid promos, and delivery charges, then converted to paise consistently.
- Verify payment/order IDs are associated with the authenticated user's pending order before accepting client verification.
- Verify webhook HMAC using the raw request body and configured webhook secret, compare signatures safely, and make state updates idempotent.
- On payment failure/cancellation, retain an accurate pending/failed state and allow the user to retry without accidentally creating a paid order.
- Do not delete existing order records or run database changes against the user's configured MongoDB.

## Definition of done

- New orders support COD and verified Razorpay payments in INR.
- Paid order status can only be set by server-verified Razorpay signature/webhook.
- Stripe is no longer used by active application code or documented setup.
- All visible current-price and revenue values use INR formatting; legacy Stripe orders are not misrepresented.
- Backend syntax and Prisma schema/client checks, frontend typecheck/build, and focused payment verification tests pass where available.
