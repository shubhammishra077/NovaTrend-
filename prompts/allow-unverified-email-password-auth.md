# Allow Email and Password Auth Without Verification

## Goal
Allow people to register and sign in with email/password without needing verification emails.

## Confirmed Behavior
- Email/password sign-up must not require email verification.
- Successful email/password sign-up should sign the user in and send them to the storefront.
- Existing unverified accounts must be allowed to sign in with a valid password.
- Google sign-in remains unchanged.
- Do not claim that password reset emails work when the Resend test sender cannot deliver to that account.

## Affected Files
- `backend/src/lib/auth.js`
- `frontend/app/routes/signup.tsx`
- `frontend/app/routes/login.tsx` if verification-specific messaging is no longer appropriate

## Implementation
- Disable Better Auth's `emailAndPassword.requireEmailVerification` gate and its automatic verification-email triggers.
- Preserve the existing password reset email handler, Resend integration, and provider sign-in behavior; do not change unrelated email flows.
- After successful email/password signup, show a success message and navigate to `/` instead of displaying a verification-pending screen.
- Remove the login-only “check your inbox to verify” message if Better Auth no longer returns a verification-required response; retain normal authentication error messaging.

## Done
- A new email/password user can register and is signed in without a verification email.
- Existing unverified email/password accounts can sign in using their correct password.
- Google sign-in remains unchanged.
- Frontend typecheck/build and backend syntax checks pass.
