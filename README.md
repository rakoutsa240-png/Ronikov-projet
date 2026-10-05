# RONIKOV — Carburant Togo

RONIKOV is a web app for finding fuel stations in Togo, checking their prices and stock, reserving fuel and paying for it in advance. The interface is in French.

It was generated with Google AI Studio and is currently a **front-end prototype**: there is no backend. Stations, reservations, notifications and prices come from mock data in `src/data/mockData.ts` and are saved in the browser's `localStorage`. Sign-in, mobile money and card payments (TMoney, Flooz, Moov, Visa/Mastercard) and the map are simulated.

## Features

- **Accueil**: landing page with official fuel prices and a quick station search.
- **Stations & Carte**: station list and interactive map, with per-station prices, stock levels and price history.
- **Réservation**: reserve a fuel volume at a station and get a QR-code ticket.
- **Mes Réservations**: history of reservations and tickets.
- **Pass Premium**: subscription offer page.
- **Pro / Admin dashboards**: switch roles from the header menu to manage a station (Pro) or the whole network and official prices (Admin).

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

No environment variables are needed to run the app. `.env.example` and `metadata.json` are left over from the AI Studio template (they mention a `GEMINI_API_KEY` that the code never reads).

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the Vite dev server on port 3000 |
| `bun run build` | Build the production bundle into `dist/` |
| `bun run preview` | Serve the production build locally |
| `bun run lint` | Type-check the project with `tsc --noEmit` |
| `bun run test` | Run the test suite once |
| `bun run test:watch` | Run tests in watch mode |

## Project structure

```
src/
  App.tsx            # Root component: navigation, app state, localStorage persistence
  main.tsx           # Entry point
  types.ts           # Shared TypeScript types
  data/mockData.ts   # Mock stations, reservations, notifications and prices
  components/        # Views (HomeView, MapView, ProDashboard, ...) and UI pieces
  test/setup.ts      # Vitest setup (jest-dom matchers, cleanup)
  App.test.tsx       # Smoke test
```

## Tests

Tests use Vitest with a jsdom environment, configured in `vitest.config.ts` (it reuses `vite.config.ts`). Put test files next to the code they cover, named `*.test.ts` or `*.test.tsx`.
