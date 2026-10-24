import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { server } from "./server";
import type { Me, Project } from "@/types";

export const ME: Me = { user: { id: "u1", email: "owner@example.com", name: "Owner", email_verified: true, created_at: "2026-08-01T00:00:00Z" }, organizations: [{ org_id: "o1", org_name: "Acme", org_slug: "acme", role: "owner" }], csrf_token: "tok" };
export const PROJECT: Project = { id: "p1", org_id: "o1", name: "Web App", role: "owner", created_at: "2026-08-01T00:00:00Z",
  settings: { timezone: "UTC", session_timeout_minutes: 30, retention_days: null, ip_mode: "anonymize", rate_limit_per_second: 100, property_denylist: ["password"] } };

export const API = (path: string) => `http://localhost:3000/api/v1${path}`;
export const json = (data: unknown, status = 200) => HttpResponse.json(data as any, { status });
export const err = (status: number, code: string, message: string) => HttpResponse.json({ error: { code, message } }, { status });

/** Default handlers for a signed-in user with one project. Override per test with server.use(). */
export function signedIn() {
  server.use(
    http.get(API("/auth/me"), () => json(ME)),
    http.get(API("/projects"), () => json([PROJECT])),
    http.get(API("/meta/event-definitions"), () => json([{ name: "$pageview", first_seen: "", last_seen: "" }, { name: "purchase", first_seen: "", last_seen: "" }])),
    http.get(API("/meta/property-definitions"), () => json([{ name: "plan", kind: "event", value_type: "string" }])),
    http.get(API("/meta/property-values"), () => json([{ value: "pro", count: 3 }])),
    http.get(API("/cohorts"), () => json([])),
    http.get(API("/notifications"), () => json({ items: [], unread: 0 })),
  );
}
export function signedOut() { server.use(http.get(API("/auth/me"), () => err(401, "UNAUTHORIZED", "Authentication required"))); }

export function renderApp(ui: ReactElement, route = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return { client, ...render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><AuthProvider>{ui}</AuthProvider></MemoryRouter></QueryClientProvider>) };
}
