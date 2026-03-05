# React (TypeScript) SPA + Next.js

This project uses **Vite + React + TypeScript + Next.js**.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Starts the Vite development server.

By default it runs at [http://localhost:5173](http://localhost:5173).

### `npm run dev:backend`

Starts the Next.js backend API for table data at [http://localhost:3001/api/users](http://localhost:3001/api/users).

### `npm test`

Runs tests with Vitest.

### `npm run build`

Builds the app for production into the `dist` folder.

### `npm run preview`

Previews the production build locally.

## PostgreSQL + Prisma setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your PostgreSQL connection string.
3. Install dependencies: `npm install`.
4. Generate Prisma client: `npm run prisma:generate`.
5. Create/update DB schema: `npm run prisma:migrate -- --name init_users`.
6. Start backend: `npm run dev:backend`.

The users table endpoint now supports:

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users?id=<id>`
- `DELETE /api/users?id=<id>`

## Notes

The editable table loads its initial rows from the Next.js API endpoint, now backed by PostgreSQL via Prisma.
