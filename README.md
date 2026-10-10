# Pleino — Carburant Togo

Pleino is a web app for finding fuel stations in Togo, checking their prices and stock, reserving fuel and paying for it in advance. The interface is in French. It was called RONIKOV until October 2026; the Render service, database, live address (`ronikov.onrender.com`), session cookie, browser storage keys and `RNK-` ticket codes keep that name so accounts, saved data and issued tickets keep working.

It was generated with Google AI Studio and now runs on its own backend: an API server in `server/` (Express + PostgreSQL) that the app calls through `src/api.ts`. Stations, stock, prices, accounts and roles, reservations, ticket codes, notifications and every change made from the Pro and Admin dashboards live in the database. The demo data in `src/data/mockData.ts` seeds the database and is shown only until the API answers. Payments are still simulated: every booking is marked paid. Mobile money and card payments (TMoney, Flooz, Moov, Visa/Mastercard) and the map are simulated.

### Tickets

Booking needs an account. The API locks the station's tank row, checks that enough litres are free (stock minus litres already held by pending tickets, 100 L at most per ticket), takes the price from the database and adds the 150 FCFA fee (0 for Premium accounts). It then creates a `RNK-XXXX-XX` code from a cryptographic generator, over an alphabet without 0/O or 1/I.

The database never stores the code. It keeps an HMAC of it to find the ticket at the pump, the last 4 characters for staff lists, and an AES-GCM encrypted copy so the owner can see the code again. The QR code holds a signed version of the code, so an edited screenshot is refused.

At the pump, a manager can only validate tickets for their own stations (an admin for any). A ticket is served once, and its litres then leave the tank. Cancelling gives the litres back. Every minute, pending tickets older than 2 hours become `EXPIRED` and free their litres too.

## Features

- **Accueil**: landing page with official fuel prices and a quick station search.
- **Stations & Carte**: station list and interactive map, with per-station prices, stock levels and price history.
- **Réservation**: reserve a fuel volume at a station and get a QR-code ticket.
- **Mes Réservations**: history of reservations and tickets.
- **Pass Premium**: offer page; the button sends an activation request that an admin grants from the console.
- **Pro dashboard** (`STATION_PRO` and `ADMIN`): validate tickets, set tank levels and the queue time of your own station.
- **Admin console** (`ADMIN`): official prices, partner stations, and a Comptes tab to change roles, assign managers to stations and grant Premium.

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

Users sign in with a Togolese phone number and a password. Sign-up always creates a client. An admin changes roles, managed stations and Premium from the Comptes tab; the first admin is created from the command line:

```bash
bun run user:create --name "Nom" --phone 90123456 --password "un-mot-de-passe" --role ADMIN
bun run user:create --name "Gérant" --phone 91234567 --password "..." --role STATION_PRO --station st-01
```

Pump attendants (`ATTENDANT`) only validate tickets at their one station: they see the ticket terminal of the Espace Pro, not the stock. The station's manager (or an admin) adds them under **Mes pompistes** in the Espace Pro with `POST /api/stations/:id/attendants`: a new number gets a temporary password to read out, a number that already has a client account keeps its own. Removing an attendant turns the account back into a client.

For local testing, `bun run db:seed --demo-users` adds three accounts with the password `ronikov-demo`: `90000001` (client), `90000002` (manager of `st-01`) and `90000003` (admin). Do not run it on a real database. With npm, put `--` before the options (`npm run db:seed -- --demo-users`).

Sessions are random tokens in an `httpOnly`, `SameSite=Lax` cookie, valid 30 days and `Secure` when `NODE_ENV=production`; the database only stores their SHA-256 hash. Passwords are hashed with scrypt. Login is limited to 10 attempts per minute per number and 30 per IP.

Set `DATABASE_URL` and `PORT` to point elsewhere (see `.env.example`). In production, also set `NODE_ENV=production` and a `TICKET_SECRET` of 32 characters or more: it signs and encrypts ticket codes, so changing it makes existing tickets unreadable. In development, Vite forwards `/api` requests from port 3000 to the API. To call an API hosted elsewhere, build the app with `VITE_API_URL` set to its address.

| Endpoint | Returns |
| --- | --- |
| `GET /api/stations?city=&fuel=&available=true` | Stations with stock; litres already reserved are subtracted and the status (`AVAILABLE`, `LOW`, `OUT_OF_STOCK`) is computed |
| `GET /api/stations/:id` | One station |
| `GET /api/stations/:id/price-history?days=30` | Price changes of one station over the period (plus the price in force when it starts) |
| `GET /api/prices` | Current official price per fuel and average availability |
| `POST /api/auth/register` | Create a client account (`name`, `phone`, `password`, optional `email`) and sign in |
| `POST /api/auth/login` | Sign in with `phone` and `password` |
| `POST /api/auth/logout` | Sign out |
| `GET /api/me` | The signed-in account, its role and managed stations (401 when signed out) |
| `POST /api/reservations` | Book fuel (`stationId`, `fuelType`, `liters`, `paymentMethod`, `paymentPhone`); returns the ticket with its code |
| `GET /api/reservations/mine` | The signed-in account's tickets, with their codes |
| `POST /api/reservations/:id/cancel` | Cancel one of your pending tickets |
| `POST /api/stations/:id/validate` | Manager or admin: serve a ticket from its typed code or scanned QR (`code`) |
| `GET /api/stations/:id/reservations` | Manager or admin: the station's tickets, codes masked |
| `GET /api/reservations` | Admin: every ticket, codes masked |
| `GET /api/notifications`, `POST /api/notifications/read-all` | The account's notifications |
| `PATCH /api/stations/:id/stock/:fuelType` | Manager or admin: tank level `stockLiters` and `maxCapacityLiters`; admin only: `pricePerLiter` |
| `POST /api/stations` | Admin: add a station (`name`, `brand`, `district`, `city`, `address`, `lat`, `lng`, `phone`, optional `operatingHours`, `amenities`, `isPartner`, `fuels`) |
| `PATCH /api/stations/:id` | Manager or admin: `queueTimeMinutes`; admin only: `isPartner`, `isActive` |
| `PUT /api/prices` | Admin: new official prices (kept as history), optionally applied to every station |
| `GET /api/users`, `PATCH /api/users/:id` | Admin: list accounts; change `role`, `stationIds`, `isPremium` |
| `POST /api/premium/request` | Ask the admins to activate Premium |

Every stock, station, price, account change and ticket validation is written to the `audit_log` table with who made it.

## Deployment (Render)

`render.yaml` describes the whole setup for [Render](https://render.com): one web service that serves both the site and the API, plus a PostgreSQL database, both in the Frankfurt region (the closest Render region to Togo).

1. Sign in to render.com with GitHub and give Render access to this repository.
2. Choose **New > Blueprint**, pick the repository, then **Apply**.
3. Once the service is live, sign up on the site with your phone number. In the service's **Environment** tab, set `ADMIN_PHONES` to that number (several numbers: comma-separated) and save: the service restarts and that account becomes an admin. Free instances have no Shell; on a paid plan you can also run `npm run user:create` from the **Shell** tab.

Render generates `TICKET_SECRET` once; do not change it afterwards or existing tickets stop working. Both resources start on the free plan: the service sleeps after 15 minutes without visits and the free database is deleted after 30 days, so switch both to a paid plan before real use.

Production settings read by `server/env.ts`: `STATIC_DIR` (folder with the built site, `dist`), `SEED_DEMO_DATA` (`true` loads the demo stations and prices on start, keeping existing rows), `TRUST_PROXY` (Express "trust proxy", `true` behind Render's proxy) and `ADMIN_PHONES` (accounts promoted to admin on start; removing a number later does not demote it).

## Android app

`android/` is a [Capacitor](https://capacitorjs.com) project (app id `com.pleino.app`, set in `capacitor.config.ts`). The app opens the live site (`server.url`), so it uses the same accounts and roles, and every deploy of `main` reaches it at once. A new Play Store release is only needed when `android/` changes: icon, permissions, name, or Capacitor upgrade. Raise `versionCode` and `versionName` in `android/app/build.gradle` before each upload.

The **Appli Android** GitHub workflow builds it (Actions tab, or automatically when `android/` changes) and leaves two files under the run's **Artifacts**: `pleino-test.apk` to install on a phone, and `pleino-play-store.aab` to upload to the Play Console. Building locally needs Android Studio: `npm run build && npx cap sync android`, then open `android/`.

Play Store signing: create an upload key once (`keytool -genkeypair -v -keystore upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`), keep the file and its passwords safe, and add four repository secrets: `ANDROID_KEYSTORE_BASE64` (`base64 -w0 upload.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`) and `ANDROID_KEY_PASSWORD`. Without them the `.aab` is unsigned and the Play Console refuses it.

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
  App.tsx            # Root component: navigation, app state loaded from the API
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
  reservations.ts    # Booking rules: fee, litre cap, validity
server/
  index.ts           # API entry point
  app.ts             # Express app and station/price routes
  auth.ts            # Passwords, sessions, role checks, rate limiting
  routes/auth.ts     # Sign-up, login, logout, /api/me
  reservations.ts    # Booking, cancelling, validating, expiry, notifications
  routes/reservations.ts # Reservation and notification routes
  routes/admin.ts    # Stock, station, price, account and Premium routes
  audit.ts           # Writes to audit_log
  tickets.ts         # Ticket code generation, hashing, encryption, signed QR
  db/schema.ts       # Drizzle tables (stations, stock, prices, users, managers, sessions, reservations, notifications, audit_log)
  db/migrations/     # SQL migrations generated by drizzle-kit
  db/seed.ts         # Loads src/data/mockData.ts into the database
  *.test.ts          # API tests
```

## Tests

Tests use Vitest, configured in `vitest.config.ts` with two projects: `app` (jsdom, files under `src/`) and `server` (Node, files under `server/`). API tests run against an in-memory PostgreSQL ([PGlite](https://pglite.dev)), so `bun run test` needs no database. Put test files next to the code they cover, named `*.test.ts` or `*.test.tsx`.
