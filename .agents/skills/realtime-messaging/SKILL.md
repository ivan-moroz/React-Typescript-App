---
name: realtime-messaging
description: Change messaging UI, API, persistence, or live updates in this project's WebSocket and PostgreSQL notification system.
---

# Work on realtime messaging

- Trace the flow across `features/messaging/`, `server/api/messaging/`, `server.mjs`, and `features/messaging/server/realtime.ts` before changing behavior.
- The custom Node server authenticates WebSocket upgrades from the session cookie and associates sockets with users. Preserve per-user authorization; never accept a sender identity from the client as authoritative.
- API mutations should use the existing conversation/message server functions and publish typed updates through `publishMessagingUpdate`. Keep event kinds and payloads consistent with `features/messaging/model/types.ts` and existing clients.
- The server delivers locally and uses PostgreSQL `LISTEN/NOTIFY` for cross-worker updates. Preserve validation of notification payloads, reconnect behavior, and bounded buffering when changing transport code.
- Update both server and client handling for changed events. Add focused tests for authorization, mutation semantics, and realtime delivery using existing messaging tests.
- Run focused tests and `npx tsc --noEmit --incremental false`; run `npm run build:backend` for route or server-rendering changes.
