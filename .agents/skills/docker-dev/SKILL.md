---
name: docker-dev
description: Build, start, inspect, and troubleshoot this project's local Docker Compose app and PostgreSQL services.
---

# Run the project with Docker

- Use the repository's `compose.yaml` and `Dockerfile` as the source of truth. The services are `app` and `db`; PostgreSQL data persists in the `postgres_data` named volume.
- For a rebuild after code or dependency changes, use `docker compose up --build`; inspect output and `docker compose logs app` / `docker compose logs db` when startup fails. The app listens on port 3001 and the database is exposed on 5432.
- The image runs `prisma generate`, `npm run train`, and `npm run build:backend` during build. At container startup it applies committed migrations with `prisma migrate deploy` before starting the server. Rebuild when build-time inputs change.
- Keep local secrets in `.env`, which is excluded from the Docker build context; never copy secrets into the image or commit them. Use `.env.example` for variable names.
- Prefer targeted actions such as rebuilding the app service or restarting a container. Do not recommend `docker compose down -v`, pruning volumes, or deleting images as routine troubleshooting; these can erase database data or affect other projects. Explain the impact and confirm the target before any destructive cleanup.
- Do not modify package scripts unless asked.
