# Fix Password Recovery and Add Email Verification

## Goal
Fix the Forgot password link that currently resolves as a seller username, implement a usable email/password password-recovery flow, and require email verification for manually registered email/password accounts.

## Confirmed Behavior
- Verify an email once after email/password signup; do not require a code for every login.
- Unverified email/password users must not be allowed to sign in.
- Google sign-in behavior remains unchanged.
- The user approved using the standard signup verification flow.

## Root Cause
`/forgot-password` is not declared in the manual React Router route table, so it falls through to the public `:username` seller-profile route and reports “seller not found.”

## Affected Areas
- `frontend/app/routes.ts`
- New frontend forgot-password and reset-password route modules
- `frontend/app/routes/signup.tsx` and `login.tsx`
- `backend/src/lib/auth.js`
- `backend/src/lib/emails.js` and Resend configuration/documentation as needed

## Implementation
- Add explicit `/forgot-password` and `/reset-password` routes before the dynamic `:username` route.
- Implement a forgot-password form that requests a Better Auth reset link and gives a neutral confirmation state.
- Implement a reset-password form that accepts the token from the link, validates the new password and confirmation, and calls Better Auth to update the password.
- Configure Better Auth's `sendResetPassword` callback and send the reset email through the existing Resend integration.
- Configure email verification on signup and sign-in, require a verified email for email/password sign-in, and send Better Auth's verification link through Resend.
- Update signup UX to tell the user to verify their email rather than treating signup as a completed signed-in session.
- Surface the unverified-email error on login with clear guidance to check their inbox or retry sign-in to receive a verification email.
- Preserve Google OAuth behavior and do not send verification codes on every successful email/password login.
- Use the configured public frontend URL for auth email links; do not hardcode localhost into production links. Document any required Resend sender configuration without exposing secrets.

## Done
- `/forgot-password` and `/reset-password` render their own pages instead of the seller-not-found page.
- The complete forgot/reset password flow uses signed, expiring Better Auth tokens and Resend emails.
- New email/password signups must verify ownership before signing in; subsequent successful password logins do not trigger verification codes.
- Google sign-in continues to work as before.
- Frontend typecheck/build and backend JavaScript syntax checks pass.
