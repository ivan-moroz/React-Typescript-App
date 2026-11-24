---
name: add-api-route
description: Add or change API endpoints in this Next.js project, especially App Router routes that connect to server-side feature logic.
---

# Add an API route

Follow the existing App Router structure and keep the route adapter separate from server-side behavior.

- Put the endpoint in `app/api/<resource>/route.ts`. Do not add Pages Router API files.
- Keep `route.ts` thin. For handlers compatible with the project's existing API adapter, export the supported HTTP methods and delegate to `runApiHandler` from `server/api/runApiHandler.ts`; place business logic in `server/api/` or the owning `features/<feature>/` area. Follow nearby routes and handlers for response and error conventions.
- Use a native App Router `Request`/`Response` handler when the endpoint needs behavior the adapter does not support, such as streaming a response or handling a specialized body. Do not force it through the adapter.
- Validate and bound untrusted path parameters, query values, and request bodies before use. Return appropriate status codes and the project's established error shape/constants. Export only the HTTP methods the endpoint needs, including `OPTIONS` only when required by its CORS behavior.
- For protected operations, derive the acting user from the server-validated session and check authorization on the server for every operation. Never trust a user identity supplied by the request body or query string.
- Keep server components as the default elsewhere; add client code only when browser APIs, state, effects, or event handlers require it. Do not change `package.json` scripts unless the user requests that change.

After changing a route, add or update focused tests for its behavior using the project's existing test conventions. Then run `npx tsc --noEmit --incremental false` and `npm run build:backend`, as required by the project guidelines. Run any relevant focused tests as well.
