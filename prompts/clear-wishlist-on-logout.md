# Clear Wishlist on Logout

## Goal
Prevent products saved by one signed-in user from appearing in the wishlist after logout or when another user signs in on the same browser.

## Root Cause
`frontend/app/stores/wishlist.ts` persists wishlist items in browser storage. The storefront header and the seller/admin topbars sign out without clearing this user-specific state.

## Affected Files
- `frontend/app/components/globals/header.tsx`
- `frontend/app/components/seller/seller-topbar.tsx`
- `frontend/app/components/admin/admin-topbar.tsx`
- `frontend/app/stores/wishlist.ts` (only if the existing `clear` action needs adjustment)

## Implementation
- Clear the persisted wishlist after a successful Better Auth sign-out from every logout entry point.
- Preserve wishlist data if sign-out fails; do not clear cart or other browser state as part of this focused fix.
- Keep the existing redirect behavior.

## Done
- Signing out from the storefront, seller dashboard, or admin dashboard empties and persists the empty wishlist.
- A different user signing in on the same browser does not see the prior user's wishlist.
- Frontend typecheck passes.
