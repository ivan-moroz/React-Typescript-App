# React (TypeScript) SPA + Next.js + PostgreSQL + Prisma

This project uses **Vite + React + TypeScript + Next.js + PostgreSQL + Prisma** for the app layer and **PostgreSQL + Prisma** for user management.

## PostgreSQL + Prisma setup

1. Ensure PostgreSQL is running.
2. Create the database:
   ```sql
   CREATE DATABASE react_typescript_app;
   ```
3. Copy environment config:
   ```bash
   cp .env.example .env
   ```
4. Generate Prisma client and run migration:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name init_users
   ```

Default connection string in `.env.example` uses:
- username: `postgres`
- password: `postgres`
- database: `react_typescript_app`
- table: `users`

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Starts the Vite development server.

By default it runs at [http://localhost:5173](http://localhost:5173).

### `npm run dev:backend`

Starts the Next.js backend API at [http://localhost:3001](http://localhost:3001).

User API routes:
- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

### `npm test`

Runs tests with Vitest.

### `npm run build`

Builds the app for production into the `dist` folder.

### `npm run preview`

Previews the production build locally.
