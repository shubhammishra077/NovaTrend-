# Storefront Theme, Navigation, Policies, and Data Requests

## Goal
Implement the requested storefront quality-of-life features, legal-information pages, and account data-deletion request flow.

## Confirmed Decisions
- Dark mode is a user-controlled site-wide theme preference.
- Remove only the nonfunctional Search icon from the storefront header; preserve the existing navigation links.
- Refund requests must be submitted within 14 days of delivery and include video proof of unboxing.
- Users and sellers submit deletion requests from `/profile`. Requests wait for admin review; the application does not delete or anonymize accounts automatically. An admin records approval/rejection, and any actual deletion is handled manually.
- Footer copyright attribution is `shubhammishra` and the year is dynamic.

## Frontend
- Add an accessible dark-mode toggle using the existing `.dark` CSS variable theme. Persist the chosen light/dark preference locally; avoid adding a theme dependency. Use semantic theme tokens on shared storefront chrome and affected surfaces so the selected mode is usable, not merely a root class.
- Add a thin, accessible scroll-progress indicator and a back-to-top button with reduced-motion-aware scrolling. Keep them unobtrusive and keyboard accessible.
- Add a reusable footer to the public storefront layout with dynamic copyright year and links to Privacy Policy, Terms of Service, Refund Policy, About, Blog, and Contact.
- Add `/privacy-policy`, `/terms-of-service`, and `/refund-policy` pages. Content should reflect verified project behavior and the confirmed refund terms. Do not invent legal jurisdiction, retention periods, warranties, support SLAs, or compliance certifications. Clearly mark legal documents as informational drafts for owner/legal review.
- Register a custom not-found route with a clear path back to the store. Ensure unknown seller usernames also show the custom not-found state rather than a generic error.
- Remove the inert Search icon/button from the storefront header only. Preserve all currently working primary navigation links and both responsive layouts.
- Add a deletion request panel to the existing profile page. Show the signed-in user's current request status, explain that no account data is deleted automatically by the request, and prevent duplicate pending requests. Require an explicit confirmation before submission. Use the account's authenticated identity and role; do not accept a client-supplied user ID.

## Data-Deletion Request Workflow
- Add a Prisma model for deletion requests with Mongo-compatible IDs, requesting user ID, role snapshot, status, created/updated timestamps, and optional admin decision metadata. No account deletion occurs from this workflow.
- Add authenticated user endpoint(s) for submitting a request and reading the current user's request status. Derive the account ID from the Better Auth session.
- Add admin-only list and status-update endpoints. Admin can mark a request approved, rejected, or manually completed; status transitions should be validated and include decision timestamp/admin identity.
- Add an admin dashboard page for reviewing requests, and an entry in the admin navigation. Display enough account/request context for review without exposing unrelated profile or payment data.
- Prevent duplicate pending requests at the API level and report conflicts clearly.
- Keep order/payment records and all associated account data untouched. No deletion or anonymization is performed by admin status updates.

## Compatibility and Quality
- Preserve existing routing, auth, layout, responsive behavior, and semantic CSS variable conventions.
- Follow React Router Framework Mode and installed shadcn/Base UI composition patterns. Do not add dependencies unless an essential feature cannot be built with existing packages.
- Update the implementation prompt with any directly related discoveries. Run frontend typecheck/build, backend syntax checks, and validate the Prisma schema.
- If the schema changes, report that deployment must apply it with `cd backend && npx prisma db push`.

## Done
- Theme toggle persists and applies across storefront, account, seller, and admin views without making key navigation/content unreadable.
- Scroll progress and back-to-top work on short/long and mobile/desktop pages.
- Footer links resolve to the three policy pages; copyright year updates automatically.
- The refund page states 14 days from delivery with video proof of unboxing required, without promising approval outside the terms.
- Unknown URLs and unknown seller profiles show a custom not-found experience.
- Users and sellers can submit and track their own deletion requests; admins can review/update request status; requests do not trigger account deletion.
- Only the inactive Search control is removed from the existing header.
