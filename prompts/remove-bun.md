# Use npm across the project instead of Bun

## Goal

Remove Bun as a required project tool so the user can install and run both the JavaScript backend and React Router frontend with Node.js and npm, without changing application functionality.

## Affected workspaces and documentation

- Frontend workspace: create and maintain `frontend/package-lock.json` with npm, remove `frontend/bun.lock`, and retain the existing package versions/features as closely as npm's lockfile can support.
- Keep existing frontend scripts and React Router Framework Mode configuration; `npm run dev`, `npm run build`, `npm run typecheck`, and `npm start` should continue to work.
- Backend already uses npm and JavaScript; do not alter its runtime logic, environment values, lockfile, or Prisma schema.
- Update root and workspace setup instructions, package-manager references, scripts, and project-authored prompts that tell users to use Bun. Keep commands and prerequisites consistent with npm and Node.js.
- Leave React/TypeScript source, routes, dependencies, styling, behavior, Docker configuration, and Vercel configuration unchanged unless npm-specific lock/setup details require a change.
- Do not edit vendored or skill-owned documentation under `.agents/skills/`.

## Edge cases

- `frontend/README.md` already documents npm commands; keep that aligned with the root quickstart.
- Docker already installs with `npm ci` and expects `package-lock.json`, so the generated frontend npm lockfile must remain compatible with it.
- Preserve required `backend/.env` setup and explain frontend env configuration without introducing secret values.
- Avoid broad dependency upgrades; do not change `frontend/package.json` dependencies or scripts unless required for npm compatibility.

## Done when

- No Bun executable or Bun lockfile is required by the project setup, frontend commands, root docs, or project-authored operational prompts.
- `frontend/package-lock.json` is valid and supports deterministic `npm ci`.
- From a clean dependency install, frontend `npm run typecheck` and `npm run build` succeed without changing its functionality.
- Backend remains runnable with its existing npm commands.
