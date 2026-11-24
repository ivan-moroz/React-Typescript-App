---
name: add-feature
description: Implement a user-facing feature across this project's Next.js App Router, feature modules, server logic, and tests.
---

# Add a feature

Build on the existing feature-first structure and nearby implementation patterns.

- Put routes and pages in `app/`; keep feature UI, models, styles, and tests in `features/<feature>/` and shared code in `shared/`. Keep server infrastructure in `server/`.
- Keep components server-rendered by default. Add `"use client"` only for browser APIs, state, effects, or event handlers; isolate client interactivity from server data loading.
- Put protected data access and mutations on the server. Derive the user from the validated session and enforce authorization for each operation.
- For API work, follow `$add-api-route` and the existing `app/api/` adapter patterns.
- Add focused tests alongside the owning feature, following nearby Vitest conventions. Run the relevant tests and `npx tsc --noEmit --incremental false`; for route, layout, or server-rendering changes also run `npm run build:backend`.
- Do not edit package scripts unless requested.
