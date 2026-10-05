# RONIKOV — Carburant Togo

RONIKOV is a web app for finding fuel stations in Togo, checking their prices and stock, reserving fuel and paying for it in advance. The interface is in French.

It was generated with Google AI Studio and is a **front-end prototype** moving to a real backend. An API server in `server/` (Express + PostgreSQL) serves stations, stock and official prices, and the app loads them from it through `src/api.ts`. If the API cannot be reached, the app keeps working on the copy saved in the browser. Sign-in is real: accounts live in the database, and the server decides each account's role. Reservations, notifications and every change made from the Pro and Admin dashboards are still local: they come from `src/data/mockData.ts` and are saved in `localStorage` until the next backend steps. Mobile money and card payments (TMoney, Flooz, Moov, Visa/Mastercard) and the map are simulated.

## Features

- **Accueil**: landing page with official fuel prices and a quick station search.
- **Stations & Carte**: station list and interactive map, with per-station prices, stock levels and price history.
- **Réservation**: reserve a fuel volume at a station and get a QR-code ticket.
- **Mes Réservations**: history of reservations and tickets.
- **Pass Premium**: subscription offer page.
- **Pro / Admin dashboards**: shown to accounts with the manager (`STATION_PRO`) or `ADMIN` role, to manage a station or the whole network and official prices.

## Tech stack

- [Vite 6](https://vite.dev) + [React 19](https://react.dev) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com) (via `@tailwindcss/vite`)
- [motion](https://motion.dev) for animations, [Recharts](https://recharts.org) for charts, [lucide-react](https://lucide.dev) for icons, `qrcode` for tickets
- [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) for tests

## Getting started

Requirements: [Node.js](https://nodejs.org) 20+ or [Bun](https://bun.sh). The repo ships a `bun.lock`, so Bun is the preferred package manager.

```bash
bun install        # or: npm install
bun run dev        # or: npm run dev
```

The dev server runs at http://localhost:3000.

No environment variables are needed to run the app on its own. `.env.example` and `metadata.json` are left over from the AI Studio template (they mention a `GEMINI_API_KEY` that the code never reads).

### API server

The API needs PostgreSQL 16. The quickest way is Docker:

```bash
docker compose up -d   # Postgres on localhost:5432, user/password/db: ronikov
bun run dev:api        # API on http://localhost:4000, applies migrations on start
bun run db:seed        # load the demo stations and prices (safe to re-run)
```

### Accounts and roles

Users sign in with a Togolese phone number and a password. Sign-up always creates a client; only the command line (and, later, an admin) can create managers and admins:

```bash
bun run user:create --name "Nom" --phone 90123456 --password "un-mot-de-passe" --role ADMIN
bun run user:create --name "Gérant" --phone 91234567 --password "..." --role STATION_PRO --station st-01
```

For local testing, `bun run db:seed --demo-users` adds three accounts with the password `ronikov-demo`: `90000001` (client), `90000002` (manager of `st-01`) and `90000003` (admin). Do not run it on a real database. With npm, put `--` before the options (`npm run db:seed -- --demo-users`).

Sessions are random tokens in an `httpOnly`, `SameSite=Lax` cookie, valid 30 days and `Secure` when `NODE_ENV=production`; the database only stores their SHA-256 hash. Passwords are hashed with scrypt. Login is limited to 10 attempts per minute per number and 30 per IP.

Set `DATABASE_URL` and `PORT` to point elsewhere (see `.env.example`). In development, Vite forwards `/api` requests from port 3000 to the API. To call an API hosted elsewhere, build the app with `VITE_API_URL` set to its address.

| Endpoint | Returns |
| --- | --- |
| `GET /api/stations?city=&fuel=&available=true` | Stations with stock; litres already reserved are subtracted and the status (`AVAILABLE`, `LOW`, `OUT_OF_STOCK`) is computed |
| `GET /api/stations/:id` | One station |
| `GET /api/prices` | Current official price per fuel and average availability |
| `POST /api/auth/register` | Create a client account (`name`, `phone`, `password`, optional `email`) and sign in |
| `POST /api/auth/login` | Sign in with `phone` and `password` |
| `POST /api/auth/logout` | Sign out |
| `GET /api/me` | The signed-in account, its role and managed stations (401 when signed out) |

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the Vite dev server on port 3000 |
| `bun run build` | Build the production bundle into `dist/` |
| `bun run preview` | Serve the production build locally |
| `bun run dev:api` | Start the API server with reload on change |
| `bun run start:api` | Start the API server |
| `bun run db:generate` | Create a migration after editing `server/db/schema.ts` |
| `bun run db:seed` | Load the demo data into the database (`--demo-users` adds test accounts) |
| `bun run user:create` | Create or update an account with a given role |
| `bun run lint` | Type-check the project with `tsc --noEmit` |
| `bun run test` | Run the test suite once |
| `bun run test:watch` | Run tests in watch mode |

## Project structure

```
src/
  App.tsx            # Root component: navigation, app state, localStorage persistence
  api.ts             # Client for the API server
  main.tsx           # Entry point
  types.ts           # Re-exports shared/types.ts
  data/mockData.ts   # Mock stations, reservations, notifications and prices
  components/        # Views (HomeView, MapView, ProDashboard, ...) and UI pieces
  test/setup.ts      # Vitest setup (jest-dom matchers, cleanup)
  App.test.tsx       # Smoke test
shared/
  types.ts           # Types used by both the app and the API
  stock.ts           # Fuel labels and stock-status rule
  phone.ts           # Togolese phone number normalisation
server/
  index.ts           # API entry point
  app.ts             # Express app and station/price routes
  auth.ts            # Passwords, sessions, role checks, rate limiting
  routes/auth.ts     # Sign-up, login, logout, /api/me
  db/schema.ts       # Drizzle tables (stations, stock, prices, users, managers, sessions)
  db/migrations/     # SQL migrations generated by drizzle-kit
  db/seed.ts         # Loads src/data/mockData.ts into the database
  *.test.ts          # API tests
```

## Tests

Tests use Vitest, configured in `vitest.config.ts` with two projects: `app` (jsdom, files under `src/`) and `server` (Node, files under `server/`). API tests run against an in-memory PostgreSQL ([PGlite](https://pglite.dev)), so `bun run test` needs no database. Put test files next to the code they cover, named `*.test.ts` or `*.test.tsx`.
