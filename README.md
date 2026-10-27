# Product Analytics Frontend

The frontend for a self-hosted product analytics platform. It provides the browser workspace for exploring product events and people, building analytics queries, saving reports and dashboards, and managing project settings. It connects to the companion FastAPI backend for authentication, data, and analytics queries.

- **Hosted app:** https://product-analytics-frontend-un93.vercel.app/
- **Backend repository:** https://github.com/faizansaiyed123/product_analytics_backend
- **Visual end-to-end walkthrough:** [docs/testing/VISUAL-TEST-WALKTHROUGH.md](docs/testing/VISUAL-TEST-WALKTHROUGH.md)

## Features

- **Overview:** view project activity and key metrics over a selected date range.
- **Analytics:** explore trends, funnels, retention, and user journeys/paths with query filters and breakdowns.
- **Event and people exploration:** browse events, inspect event properties, view people profiles and timelines, and explore sessions.
- **Cohorts:** define audiences from behavioral criteria, preview matching people, and save cohort definitions.
- **Reports and dashboards:** save analytics reports and arrange saved insights in dashboards.
- **Project and workspace administration:** manage project settings, API keys, team membership and invitations, alerts, data management, and account security.
- **Account flows:** register, sign in, verify email, request password resets, and change or reset passwords.
- **JavaScript SDK distribution:** the repository includes built SDK files under `public/sdk/javascript/dist`; the production Nginx configuration publishes them at `/sdk/analytics.min.js` and `/sdk/analytics.esm.js`.

These pages depend on the API and permissions provided by the backend; the frontend repository alone does not provide the database or API service.

## Technology

- React 18 and TypeScript
- Vite for local development and production builds
- React Router for page routing
- TanStack Query for server-state fetching and caching
- Zustand for UI state
- Tailwind CSS, Radix UI, and Lucide icons
- Recharts for analytics charts
- Vitest, Testing Library, and MSW for frontend tests
- Playwright for browser-driven end-to-end tests
- Nginx for serving the production build and proxying backend paths

## Requirements

- Node.js 22 and npm
- The companion [Product Analytics Backend](https://github.com/faizansaiyed123/product_analytics_backend) running when using API-backed features

The backend requires Python 3.12, PostgreSQL, and Redis. See its README for backend configuration, migrations, and startup instructions.

## Local development

Clone the repository and install its locked dependencies:

```bash
git clone https://github.com/faizansaiyed123/product_analytics_frontend.git
cd product_analytics_frontend
npm ci
```

By default, Vite proxies API and backend utility paths to `http://localhost:8000`. Start the backend on that address, then run the frontend:

```bash
npm run dev
```

The frontend development server runs at [http://localhost:5173](http://localhost:5173).

To use a backend at a different address, set `VITE_BACKEND_URL` in the environment before starting Vite. For example, in Bash:

```bash
export VITE_BACKEND_URL=http://localhost:8000
npm run dev
```

Or in PowerShell:

```powershell
$env:VITE_BACKEND_URL = "http://localhost:8000"
npm run dev
```

The Vite proxy forwards `/api`, `/health`, `/docs`, and `/openapi.json` to the configured backend URL. The application makes API requests through same-origin paths and includes session credentials; non-GET requests include the CSRF token read by the frontend.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check the application and create a production build in `dist/` |
| `npm run preview` | Preview the built frontend locally |
| `npm run lint` | Run ESLint on `src/` and fail on warnings |
| `npm run typecheck` | Run the TypeScript type check |
| `npm test` | Run the Vitest frontend test suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run format` | Format TypeScript, TSX, and CSS files under `src/` with Prettier |

Run the checks locally with:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## End-to-end testing

The browser tests live in `tests/e2e/` and use `playwright.config.ts`. They require the real companion backend, PostgreSQL, Redis, and the frontend development server. The full-stack GitHub Actions workflow provisions PostgreSQL 16 and Redis 7, checks out the backend, applies its migrations, runs backend and frontend tests, runs lint/type checks and a build, then runs the Playwright tests and checks persisted data in PostgreSQL.

To run the browser tests locally, first start the backend and frontend as described above, then install Playwright and Chromium if they are not already available:

```bash
npm install --no-save --no-audit --no-fund @playwright/test
npx playwright install chromium
npx playwright test --config=playwright.config.ts
```

See [`.github/workflows/full-stack-e2e.yml`](.github/workflows/full-stack-e2e.yml) for the CI setup and [the visual walkthrough](docs/testing/VISUAL-TEST-WALKTHROUGH.md) for the documented product journey and screenshots.

## Docker deployment

Build the production image:

```bash
docker build -t product-analytics-frontend .
```

The image builds the application with Node.js and serves the generated static files with Nginx. The Nginx configuration proxies `/api/`, the API documentation, and health/readiness paths to `http://backend:8000`. Run the frontend container on a network where the backend is reachable using the hostname `backend` and port `8000`, or adjust the Nginx configuration for your deployment. The configuration also serves the SDK under `/sdk/` and falls back to `index.html` for client-side routes.

## Project layout

```text
src/
├── components/    Shared interface elements, filters, chart components, and dialogs
├── hooks/         Authentication, project, date-range, and insight hooks
├── layouts/       Workspace layout
├── pages/         Overview, analytics, events, people, sessions, reports, and settings pages
├── services/      API client and typed endpoint functions
├── stores/        UI state
├── test/          Vitest tests and test utilities
├── types/         API and domain types
└── utils/         Formatting, date, filter, and utility functions

docs/testing/      Visual end-to-end walkthrough and screenshot assets
public/sdk/        Checked-in JavaScript SDK distribution
tests/e2e/         Playwright browser-driven tests
.github/workflows/ Full-stack integration and visual walkthrough workflow
Dockerfile         Production image build
nginx.conf         Static serving, SPA fallback, SDK path, and backend proxy
vite.config.ts     Vite server, proxy, build, and Vitest configuration
playwright.config.ts
                  Playwright test configuration
```
