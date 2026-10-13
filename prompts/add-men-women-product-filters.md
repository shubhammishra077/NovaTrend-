# Add Men and Women Product Filters

## Goal
Add Men and Women gender filters to both the public Shop page and the Admin Products page.

## Confirmed Scope
- Add the filter to `/shop` and `/admin/products`.
- Provide Men and Women options; leave existing products and gender values unchanged.
- Preserve all existing category, price, rating, status, search, sorting, and pagination behavior.

## Existing Data
- Products already have a nullable `gender` field.
- Backend product creation validates gender values as `men`, `women`, or `unisex`.

## Implementation
- Add an optional `gender` filter to the shared public products hook parameters and include it in public product-list query strings.
- Add an optional `gender` parameter to the admin products hook and include it in the admin-list query string.
- In `backend/src/controllers/product.js`, parse and validate `gender` as `men`, `women`, or `unisex` and apply it to the product query when provided. This powers the Shop page.
- In `backend/src/routes/admin.js`, parse/validate the same `gender` parameter and apply it to the admin product query.
- Add a Men/Women selector to the Shop filter sidebar so it works in both desktop and mobile filters. Include the selected gender in active filters, clear-all behavior, and page reset.
- Add a Men/Women selector to Admin → Products alongside the existing category and status filters, resetting pagination when changed.
- Keep `All` as the default and do not filter out `unisex` products when no gender filter is selected.
- Do not alter product creation or edit forms, product records, or unrelated filters.
- Update directly related documentation and the approved implementation prompt if needed.

## Done
- Selecting Men or Women on Shop returns matching products and updates the displayed total/pagination.
- Selecting Men or Women in Admin → Products returns matching products while retaining the existing status/category/search filters.
- Clearing filters restores all genders, including unisex.
- Frontend typecheck/build and backend syntax checks pass.
