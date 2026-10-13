# Fix Admin Seller Product Counts

## Goal
Show the correct product count for each seller in Admin → Sellers.

## Root Cause
The seller listing relies on Prisma's relational `_count.products`, but the schema has a MongoDB native type mismatch between `Seller.id` (`@db.ObjectId`) and `Product.sellerId` (plain `String`). Product records store the seller ID as a string, so relation-based counts can incorrectly return zero.

## Implementation
- In `backend/src/routes/admin.js`, stop relying on the seller relation `_count.products` for this listing.
- For the paginated seller records, count matching products using the persisted scalar `Product.sellerId === seller.id` and include the count in each seller response as `_count.products`, preserving the existing frontend DTO.
- Count all products for the seller, preserving current semantics; do not filter by product status.
- Do not change the Prisma field native type or mutate stored records as part of this focused fix.
- Preserve existing auth checks, search, approval filters, pagination, and seller ordering.

## Done
- The admin seller table shows the count of products actually stored for each seller.
- Sellers with no products continue to show zero.
- Backend syntax checks and frontend typecheck pass.
