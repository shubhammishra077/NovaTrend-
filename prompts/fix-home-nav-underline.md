# Fix Home Navigation Underline

## Goal
Only show the active underline on New Arrivals or Best Sellers when the browser location hash points to that section.

## Affected File
- `frontend/app/components/globals/header.tsx`

## Root Cause
React Router `NavLink` active matching is based on the pathname and ignores the hash when determining whether `/`, `/#new-arrivals`, and `/#best-sellers` are active. All these links therefore appear active while on the home route.

## Implementation
- Use the current router location to determine a hash-link's active state by comparing its target hash with `location.hash`.
- Keep Home active only when the pathname is exactly `/` and there is no hash.
- Keep the existing path-based active behavior for the other navbar routes.
- Use the same active state for text styling and underline rendering in desktop navigation; do not alter mobile links.

## Done
- On `/`, Home alone is active.
- On `/#new-arrivals`, only New Arrivals is active.
- On `/#best-sellers`, only Best Sellers is active.
- Other route active styling remains unchanged.
