# React (TypeScript) SPA + Next.js

This project uses **Vite + React + TypeScript + Next.js**.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Starts the Vite development server.

By default it runs at [http://localhost:5173](http://localhost:5173).

### `npm run dev:backend`

Starts the Next.js backend API for table data at [http://localhost:3001/api/users](http://localhost:3001/api/users).

### PostgreSQL setup

The users API now reads/writes from PostgreSQL:

1. Run PostgreSQL locally.
2. Configure connection variables (defaults are shown below):

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=react_typescript_app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

`GET /api/users` returns users from the `users` table and `POST /api/users` creates a user in PostgreSQL.

### `npm test`

Runs tests with Vitest.

### `npm run build`

Builds the app for production into the `dist` folder.

### `npm run preview`

Previews the production build locally.

## Notes

The editable table now loads rows from PostgreSQL through the Next.js API endpoint.
