# Demo branch

This branch is a recruiter-facing standalone simulation of the Product Analytics application.

The normal `main` branch continues to use the real FastAPI backend. On `demo`, `src/services/api.ts` enables `DEMO_MODE`, and API calls are served by `src/demo/runtime.ts` entirely in the browser.

The demo includes realistic seeded organizations, projects, people, events, sessions, analytics results, cohorts, reports, dashboards, alerts, notifications, API keys, team settings, usage data, and export behavior. Mutations update the in-memory store so create/update/delete flows feel stateful during a session.

No PostgreSQL, Redis, SMTP, object storage, or deployed backend is required for the frontend demo.

For the companion standalone backend simulator, see the `demo` branch of `product_analytics_backend` and run:

```bash
uvicorn app.demo.main:app --host 0.0.0.0 --port 8000
```

The frontend `demo` branch does not depend on that backend; it is intentionally self-contained for zero-backend demonstrations.