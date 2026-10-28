# React (TypeScript) SPA + Next.js + PostgreSQL + Prisma

This project uses **Vite + React + TypeScript + Next.js + PostgreSQL + Prisma** for the app layer.

Already implemented infinite scrolling, modals, drag-and-drop reordering of users, email-and-password login, and user management. An asset feature added, allowing users to upload documents, videos, photos etc. Asset Management — where users can see only their own assets and Public assets, added metadata for assets like Asset Name, Description, Authorization(Internal, Public). Assets content files can be up to 1 GB in size, including videos, images, and other file types. For local use only — clone it and lets continue working with AI. Good luck!

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
   npm run prisma:migrate
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

Run `npm run dev:backend` alongside Vite. Vite proxies `/api`, `/assets`, `/table`, and Next.js runtime files to port 3001. Assets and Users (`/table`) render on the Next.js server at request time, with their initial data read directly from Prisma; uploads, modals, pagination, and editing remain interactive after hydration.

Assets and Users implementation files, feature components, and tests live under `backend/features` and `backend/test`. Their Next.js route entry points are `backend/pages/assets.tsx` and `backend/pages/table.tsx`. These pages are excluded from the Vite SPA routes and bundles.

Login issues a signed HttpOnly session cookie so the server can load the current user's own and public assets. Sessions expire after 24 hours; log in again after upgrading from the browser-storage-only login. Logout clears the cookie.

By default it runs at [http://localhost:5173](http://localhost:5173).

### `npm run dev:backend`

Starts the Next.js backend API at [http://localhost:3001](http://localhost:3001).

User API routes:
- `GET /api/users?offset=0&limit=10` (returns a page of users; defaults to 10)
- `POST /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/auth/login`

Asset API routes (assets are stored in PostgreSQL and scoped to the logged-in user's ID):
- `GET /api/assets?userId=:userId`
- `POST /api/assets`
- `GET /api/assets/:id?userId=:userId` (streams the stored file)
- `DELETE /api/assets/:id`

The asset API accepts files up to 10 MB and stores their binary data in the `assets` table. Run `npm run prisma:generate` and apply the included migration before starting the backend.

After applying the password migration, every existing user can log in with their email address and the initial password `12345`. Passwords are stored as salted hashes. New users must provide a password; when editing a user, leave the password field blank to retain the current password.

### `npm test`

Runs tests with Vitest.

### `npm run build`

Builds the app for production into the `dist` folder.

For the full application, run `npm run build`, then `npm run build:backend`, and serve with `npm run start:backend`. Next.js serves Assets and Users with SSR and serves the remaining SPA routes and static files from `dist`. `npm run preview` alone only previews the Vite build and does not provide SSR or the API.

### `npm run preview`

Previews the production build locally.

Storybook

### `npm run storybook`

http://localhost:6006/
