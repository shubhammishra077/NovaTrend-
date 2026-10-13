# Admin Blog Management

## Goal
Allow only admins to create, edit, publish, unpublish, and delete blog stories, and display published stories on the public Blog page.

## Confirmed Content Fields
- Title
- Excerpt
- Cover image URL
- Plain-text article body

## Implementation
- Add a Prisma MongoDB `BlogPost` model with a generated ID, unique URL slug, content fields, draft/published status, timestamps, and author relation to the admin `User`.
- Add admin-only backend endpoints to list posts (including drafts), create drafts, update posts, change publication status, and delete posts. Apply `requireAuth` and `requireAdmin` to every admin endpoint and validate/normalize input and slugs.
- Add a public endpoint that only returns published posts and an endpoint to fetch one published post by slug.
- Add `/admin/blog` with a list/editor experience to create, edit, publish/unpublish, and delete stories. Use the confirmed URL fields and a plain-text body editor. Add Blog to the admin sidebar.
- Replace the public Blog placeholder with published story cards and empty/loading/error states. Add a public `/blog/:slug` article page; declare it before the dynamic seller username route.
- Render plain-text body safely without interpreting it as HTML.
- Add prompt/documentation updates and note that MongoDB-backed deployments must apply the Prisma schema change (`npx prisma db push`) before using the feature.

## Security and Behavior
- Drafts must never appear through public list or detail endpoints.
- Non-admin users must receive an authorization failure from every admin blog endpoint, independent of frontend route guards.
- Slugs are generated from titles, remain unique, and are handled safely when a title is edited.
- Only admins can publish; a new post is a draft until explicitly published.

## Done
- Admin-only blog management supports create/edit/draft/publish/unpublish/delete.
- Public visitors can browse published stories and open a story detail page; drafts remain private.
- Frontend typecheck/build and backend JavaScript syntax checks pass.
