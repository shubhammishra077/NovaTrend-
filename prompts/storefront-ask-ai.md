# Storefront Ask AI

## Goal
Add a floating Ask AI chat widget across public storefront pages. Users can ask about their own order status, general refund guidance, and product recommendations.

## Confirmed Decisions
- The widget is available across the storefront through the public layout.
- The published refund policy requires requests within 14 days of delivery and video proof of unboxing. Explain that proof is required for review and does not guarantee approval; direct account-specific questions to `/refund-policy` and `/contact`. Do not invent exceptions, shipping costs, or processing times.
- Reuse the existing server-side Gemini integration and keep the API key on the backend.

## Backend
- Add a dedicated chat endpoint, mounted under the existing API structure.
- Allow guests to ask general questions and get product recommendations. For order questions, require a valid Better Auth session; if unauthenticated, return a clear response directing the user to sign in.
- Derive the user identity only from the authenticated session. Never accept a user ID or order data from the client as authority. Query only that user’s orders and return limited relevant fields such as order ID, current order/delivery status, placed date, and total.
- Answer order-status questions deterministically from the database; do not send order records, status, IDs, totals, or prior assistant responses containing order information to Gemini.
- Fetch recommendation context from active products belonging to approved sellers; include only catalog facts needed to make recommendations (such as name, category, price, and product link/ID). Do not allow the model to invent availability or product details.
- Send Gemini only the latest user question and public catalog facts needed for recommendations. Treat the question as untrusted text, not instructions to reveal data or change policy.
- Validate and bound incoming conversation input and response size. Return explicit errors for invalid input, missing Gemini configuration, and provider failures; do not leak secrets or raw provider credentials.
- Detect order-status and refund intent reliably enough to answer those requests deterministically. Keep order retrieval scoped to the authenticated session; send only the latest user message and public product data to Gemini. Bound upstream request time and do not log prompts or private order data.
- Do not persist chat history or create a database migration for this feature.

## Frontend
- Add a reusable floating chat widget to the public storefront layout, visible on public pages and not on seller/admin/auth layouts.
- Support opening/closing the panel, a concise welcome message and suggested questions, sending messages, pending/error states, and scrolling through the conversation accessibly on mobile and desktop.
- Send only the current user question to the backend endpoint. Preserve the visible conversation in component state only.
- For order questions, explain that the user must sign in when no session is available; do not expose order lookup controls that accept arbitrary order IDs.
- Make product recommendations link to the existing product details route. Link policy-specific refund questions to `/contact`.
- Follow existing design tokens, reusable UI patterns, and React Router conventions. Provide a labeled trigger and visible keyboard focus.

## Done
- Guests can ask general questions and receive catalog-grounded recommendations.
- Signed-in users can ask about their own orders, but cannot access another user’s orders through prompts or request parameters.
- Order questions while signed out direct users to sign in.
- Refund responses use only the published 14-day/video-proof terms and direct account-specific questions to `/refund-policy` and `/contact`.
- Chat failures render an actionable error without breaking the storefront.
- Frontend typecheck/build and backend syntax checks pass.
