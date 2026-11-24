---
name: auth-session
description: Add or change registration, login, logout, session validation, and protected access in this project.
---

# Work with authentication and sessions

- Inspect `server/auth/session.ts`, `server/auth/password.ts`, and the relevant `server/api/auth/` handler before changing auth behavior.
- Use the server-validated `app_session` cookie through the existing session helpers. The session signature is tied to the user's password hash; preserve expiry checks, constant-time signature comparison, and HttpOnly/SameSite cookie attributes.
- Hash passwords with the existing password helper; never store or return plaintext passwords or password hashes.
- Derive identity from the validated session, never request JSON or query parameters. Enforce authorization server-side on every protected read or mutation.
- Keep API route adapters in `app/api/` thin and business logic in `server/api/`. Follow existing response and error conventions; avoid broad CORS changes to credentialed auth flows.
- Add focused tests for successful and rejected flows, cookie behavior, and access control. Run them with `npx tsc --noEmit --incremental false`; for route changes also run `npm run build:backend`.
