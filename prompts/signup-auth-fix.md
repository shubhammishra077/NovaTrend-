# Signup Authentication Fix

## Goal

Fix the failing email/password signup without changing unrelated authentication or marketplace behavior.

## Findings to verify

- `backend/prisma/schema.prisma` requires `Account.issuer`, but the installed Better Auth Prisma adapter does not write that field. The current Better Auth startup diagnostic flags this mismatch.
- The backend was switched from Bun to npm, and npm resolved newer Better Auth patch versions than the previous Bun lockfile. Do not change dependency versions unless the signup failure evidence shows that version drift is relevant.
- The Stripe plugin attempts customer creation after user signup, but catches and logs Stripe API errors. An invalid Stripe key may prevent customer linking, but should not be assumed to be the primary signup failure.

## Affected surfaces

- `backend/prisma/schema.prisma` — Better Auth Account model and account identity uniqueness.
- `backend/src/lib/auth.js` — inspect only; preserve existing auth providers, plugins, roles, and callbacks unless directly required.
- `frontend/app/routes/signup.tsx` and `frontend/app/lib/auth-client.ts` — inspect the request and error handling; change only if evidence identifies a client-side issue.

## Data and compatibility requirements

- Match the Account fields and identity uniqueness to the installed Better Auth Prisma adapter.
- Preserve existing account records and unrelated Prisma models.
- Do not connect to, push a schema to, or otherwise modify the user's configured MongoDB database.
- Identify any required index/schema synchronization for the user to perform after backing up their database.
- Do not expose or modify secret values in `backend/.env`.

## Edge cases

- Existing account documents and indexes may need compatibility handling when correcting the schema.
- Signup should remain usable when optional Stripe customer creation fails.
- Keep email/password signup, Google sign-in, admin plugin behavior, role assignment, and current frontend error display intact.
- Distinguish a schema failure from missing/invalid MongoDB, Stripe, or other environment configuration.

## Definition of done

- Prisma schema validation and client generation pass.
- Automated or isolated signup verification confirms that a user and credential account can be created with the corrected schema, without using the user's configured database.
- Signup errors remain visible and actionable; no unrelated auth or marketplace behavior changes.
- Report any required database index/schema synchronization steps without running them against the user's database.
