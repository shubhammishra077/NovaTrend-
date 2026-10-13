# Fix Public Navigation and Hero Buttons

## Goal
Make the storefront's public navigation and hero calls to action lead to real destinations instead of falling through to the dynamic seller profile route.

## Confirmed Behavior
- New Arrivals and Best Sellers navigate to the corresponding sections on the home page.
- About, Blog, and Contact are separate simple public pages.
- Contact displays the admin email `shubhammishra88044@gmail.com` as the customer inquiry address.
- Hero "Shop Now" navigates to `/shop`.
- Hero "Explore Collection" navigates to the home page's New Arrivals section.

## Root Cause
The public route config ends with the dynamic `:username` seller profile route, so unknown static paths such as `/new-arrivals`, `/about`, `/blog`, and `/contact` are interpreted as seller usernames and display "Seller not found." The hero buttons are not linked to any route.

## Affected Files
- `frontend/app/routes.ts`
- `frontend/app/components/globals/header.tsx`
- `frontend/app/components/globals/hero.tsx`
- `frontend/app/components/product/NewArrivals.tsx`
- `frontend/app/components/product/BestSellers.tsx`
- New route modules for About, Blog, and Contact under `frontend/app/routes/`

## Implementation
- Point the navigation's New Arrivals and Best Sellers items at stable home-page section anchors; assign matching IDs to those sections.
- Add explicit About, Blog, and Contact routes before the `:username` dynamic route so those reserved names never resolve as seller usernames.
- Build small, responsive pages that use existing typography, theme tokens, and shared layout conventions. About explains the multi-seller marketplace; Blog clearly shows an intentional "coming soon" state rather than a missing page; Contact shows a working `mailto:` link for `shubhammishra88044@gmail.com`.
- Connect "Shop Now" to `/shop` and "Explore Collection" to `/#new-arrivals`.
- Ensure both desktop and mobile navbar versions use the same destinations and close the mobile menu after navigation.
- Preserve genuine seller profile routing for usernames not reserved by static routes.

## Edge Cases
- Direct navigation and refresh on `/about`, `/blog`, and `/contact` must render the correct public page.
- Clicking New Arrivals or Best Sellers from another route must navigate home and scroll to the right section.
- Category links and normal seller profile links must remain functional.
- All controls must work on desktop and mobile and remain keyboard-accessible.

## Done
- No public navbar item or hero CTA resolves to "Seller not found."
- New Arrivals/Best Sellers land on their home sections; hero CTAs navigate to their confirmed targets.
- About, Blog, and Contact routes render their simple page content.
- Frontend typecheck and production build pass.
