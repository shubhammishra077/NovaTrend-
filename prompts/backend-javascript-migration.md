# Convert the backend from TypeScript to JavaScript

## Goal

Convert the backend workspace of this MERN project from TypeScript to plain JavaScript so it can be installed and started with Node.js and npm. Do not convert or otherwise modify the frontend.

Remove all backend-authored TypeScript source and TypeScript configuration/tooling. Generated dependency artifacts are not backend-authored source and must not be hand-edited.

## Affected routes and entry points

- Convert every backend source file under `backend/src/` from `.ts` to `.js`, including the Express entry point, routes, controllers, middleware, libraries, and Inngest files. Remove TypeScript annotations, interfaces, and type-only imports while preserving runtime behavior.
- Preserve all existing API routes, request/response behavior, middleware, and business logic.
- Update backend-local import specifiers to use `.js` extensions.

## Runtime and package configuration

- Update `backend/package.json` scripts and metadata to use Node.js and npm with the JavaScript entry point, removing backend TypeScript-only tooling and dependencies when no longer needed.
- Update `backend/nodemon.json` so the development command runs the JavaScript server with Node.js and continues loading `backend/.env`.
- Remove backend TypeScript configuration that is no longer used.
- Ensure Prisma generation and generated-client imports remain compatible with JavaScript and the existing MongoDB schema.
- Do not modify frontend dependencies, scripts, or source files.

## Data model changes

- No Prisma schema or database-model changes are intended.

## Edge cases

- Preserve environment loading and startup behavior on supported Node.js versions.
- Ensure modules that rely on TypeScript-only syntax, type imports, or type declarations are correctly converted or removed.
- Keep Vercel backend entry-point and ESM import behavior compatible with the existing deployment configuration.
- Do not add secrets or create real environment files.

## Done when

- No backend-authored TypeScript source, configuration, or runtime tooling remains in the backend workspace; generated artifacts or dependency-owned declarations must not be hand-edited.
- The backend can be installed and started using documented Node.js and npm commands.
- The backend starts with its required environment variables and retains its existing endpoints.
- Existing API behavior and functionality remain unchanged. Relevant available checks pass, and backend startup instructions are updated.
