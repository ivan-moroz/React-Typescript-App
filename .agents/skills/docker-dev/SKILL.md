---
name: docker-dev
description: Build, start, inspect, and troubleshoot this project's local Docker Compose app and PostgreSQL services.
---

# Run the project with Docker

- Use the repository's `compose.yaml` and `Dockerfile` as the source of truth. The services are `app` and `db`; PostgreSQL data persists in the `postgres_data` named volume.
- After code or dependency changes, run `docker compose up --build -d` from the project root. This rebuilds with Docker's layer cache and starts or recreates changed services in the background. Use `docker compose up --build --force-recreate -d` to force recreation of both services; the named `postgres_data` volume persists. Inspect `docker compose ps` and `docker compose logs -f app` / `docker compose logs db` when startup fails. The app listens on port 3001 and the database is exposed on 5432.
- The Dockerfile runs `prisma generate`, `npm run train`, and `npm run build:backend` during image build. Docker may reuse cached layers and skip training; to force it, run `docker compose build --no-cache app` and then `docker compose up -d app`. Training uses the default 50 epochs because the Dockerfile does not pass `TINY_LLM_EPOCHS` as a build argument.
- At container startup, the app applies committed migrations with `prisma migrate deploy` before starting the server.
- The Compose app receives its local database URL directly from `compose.yaml`; root `.env` is excluded from the Docker build context and is used for host-side development. Do not assume that values from `.env` override the app service's explicit Compose environment. Never copy real secrets into the image or commit them; use `.env.example` for host-side variable names.
- Prefer targeted actions such as rebuilding the app service or restarting a container. Do not recommend `docker compose down -v`, pruning volumes, or deleting images as routine troubleshooting; these can erase database data or affect other projects. Explain the impact and confirm the target before any destructive cleanup.
- Do not modify package scripts unless asked.
