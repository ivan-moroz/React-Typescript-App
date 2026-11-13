# Project Guidelines

## Package Scripts

- Do not add, remove, rename, or modify commands in the `scripts` section of `package.json` unless the user explicitly requests a script change.
- When a task requires a different command, run it directly rather than changing the project's scripts.

## Architecture

- Use the Next.js App Router for pages and API routes. Do not add Pages Router files.
- Keep feature-specific code in `features/<feature>/`, shared code in `shared/`, and server infrastructure in `server/`.
- Keep components server-rendered by default. Add `"use client"` only when browser APIs, state, effects, or event handlers require it.

## Security

- Derive the current user from the server-validated session, not from request body or query parameters.
- Check authorization on the server for every protected operation.

## Validation

- Run focused tests and `npx tsc --noEmit --incremental false` after code changes.
- Run `npm run build:backend` after changes to routes, layouts, or server rendering.
