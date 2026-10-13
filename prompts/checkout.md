# Checkout — Delivery, Address/Phone, Promo, Razorpay (INR)

## Goal
Build an elegant checkout page matching https://cdn.dribbble.com/userupload/46733962/file/817662a4a4cc40dc563db7d5d1b45198.png, integrating cart (Zustand), delivery status (pickup/delivery), selectable saved addresses/phones, promo code, and payment method (cash on delivery or Razorpay Checkout). All current product and order amounts are INR. Razorpay payment signatures are verified server-side and a signed Razorpay webhook updates paymentStatus (pending/paid/failed).

## Affected Routes / Endpoints

### Backend
- `backend/prisma/schema.prisma` — `Order` stores payment method `cod|razorpay`, payment status, optional `razorpayOrderId` and `razorpayPaymentId`, and INR totals.
- `backend/src/lib/razorpay.js` — Razorpay SDK and payment/webhook signature verification.
- `backend/src/controllers/order.js` — creates COD orders or Razorpay orders from server-calculated INR totals; accepts only active database promo records, reserves stock with conditional atomic updates, and verifies captured payments before confirming an order.
- `backend/src/lib/order-payments.js` — performs compare-and-set payment transitions, idempotently releases stock on definitive failure, and attempts an atomic stock reacquisition if a late capture arrives after failure.
- `backend/src/routes/order.js` — authenticated order create/read/list and `POST /api/orders/:id/razorpay/verify`.
- `backend/src/routes/razorpay-webhook.js` — verifies signed raw-body events at `POST /api/webhooks/razorpay`.

### Frontend
- `frontend/app/routes/checkout.tsx` — route at `/checkout`, requires cart non-empty (redirect if empty). Layout 2-col: left form (delivery toggle, address cards, phone cards, promo, payment cards), right sticky summary.
- `frontend/app/components/checkout/AddressSelector.tsx` — card list, radio `pickup` hides it, `delivery` shows; each address card rounded-2xl, ring-primary when selected, edit icon; plus "Add new" dashed card. Prepared for multiple addresses.
- `frontend/app/components/checkout/PhoneSelector.tsx` — similar, pill cards.
- `frontend/app/components/checkout/PromoField.tsx` — input + Apply, validates `SAVE10` mock 10% or `WELCOME20` 20% (or future API), shows discount.
- `frontend/app/components/checkout/PaymentMethod.tsx` — `ToggleGroup` / radio cards for `cod` vs `razorpay` with icons, descriptions.
- `frontend/app/components/checkout/OrderSummary.tsx` — line items from `useCartStore`, INR subtotal, delivery fee (0 pickup / ₹5 delivery), discount, total, Place Order button. Uses shadcn `Card`, `Separator`, `Button`.
- `frontend/app/stores/address.ts` + `phone.ts` (or combined `checkout.ts`) — Zustand persist for saved addresses/phones (mock seed 2 each), to demonstrate selection.
- `frontend/app/routes/order-confirmation.tsx` — `/order-confirmation/:id` shows success, pending, or failed via query param, clears cart on success.

## Data Model Changes
- Prisma: add Address, Phone, Order, OrderItem, Promo stub. Orders track optional `inventoryReservedAt` and `inventoryReleasedAt` timestamps so existing records remain compatible. New checkout stock reservation is required and runs inside a MongoDB transaction; MongoDB must support replica-set transactions.

## Edge Cases
- Empty cart → redirect to `/shop` with toast.
- Delivery selected but no address → block submit, show Field error.
- Phone required for delivery, optional for pickup (still collect).
- Promo invalid/expired → error toast, no discount.
- Razorpay checkout dismissed or payment failed → keep the cart; only definitive failure releases stock.
- Webhook and browser verification may arrive in either order or be duplicated; payment updates must be idempotent and late captures must reacquire stock atomically or surface an explicit reconciliation error.
- Uncertain payment status → do not mark the order failed or paid from browser data; verify with Razorpay server-side and show a pending state while waiting for a signed webhook.
- Auth required for checkout; unauthenticated → redirect login, preserve cart via persist.
- Concurrent stock changes or insufficient stock → rollback the transaction and return 409 with details.
- COD order → confirmed fulfillment state with paymentStatus pending; cancelling a reserved unpaid order restores stock once. Paid orders cannot be cancelled without refund review.
- A seller may update an order only when every line belongs to that seller; mixed-seller orders cannot be changed through the single-order seller status endpoint.
- Multiple addresses: default selected, radio updates.

## Design System
- Theme tokens only from `app.css` (tomato primary, muted, card). Playfair for headings/price, Noto Sans for body, 4-5 sizes, 4px spacing, rounded-2xl cards, subtle 200ms transitions, lucide-react icons.
- Reference image: address/phone cards with rounded checkboxes, promo input with inside button, payment cards with radio dot + icon, summary sticky.

## TanStack Query / Zustand
- Cart via Zustand (persist) not Query. Checkout uses `POST /api/orders` and `POST /api/orders/:id/razorpay/verify` (api.ts). Promo validation uses the existing API.

## What "Done" Looks Like
- [ ] Prompt at `prompts/checkout.md`
- [ ] Prisma Order/Address/Phone/Promo models + generate
- [ ] Razorpay SDK, order routes/controllers, payment verification, and signed webhook update paymentStatus
- [ ] Checkout UI: delivery toggle, address/phone selectors (multiple ready), promo field, payment method, summary, image-faithful
- [ ] Razorpay Checkout + confirmation page, while COD remains available
- [ ] `npm run typecheck` and `npm run build` pass in `frontend/`; manual flow: add to cart → checkout → pickup/delivery → promo → COD creates order / Razorpay opens Checkout
