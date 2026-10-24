import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { AppRoutes } from "@/App";
import { useUI } from "@/stores/ui";
import { server } from "./server";
import { API, ME, PROJECT, json, renderApp, signedIn, signedOut } from "./utils";

const overview = { kpis: { total_users: 3, active_users: 3, new_users: 3, total_events: 11, sessions: 5, events_per_user: 3.67, avg_session_duration_seconds: 60 }, previous_kpis: { total_users: 0, active_users: 2, new_users: 0, total_events: 0, sessions: 0, events_per_user: 0, avg_session_duration_seconds: null },
  interval: "day", labels: ["2026-08-03"], event_volume: [11], active_users_series: [3], new_users_series: [3], user_growth_series: [3], top_events: [{ event: "login", count: 8, unique_users: 3 }], top_pages: [], retention: { type: "retention", interval: "day", offsets: [0], cohorts: [], average: [], date_from: "", date_to: "", timezone: "UTC" }, cached: false, computed_at: new Date().toISOString() };

describe("end-to-end user workflow (mocked API)", () => {
  it("register -> create first project -> API key shown once -> overview with real KPIs", async () => {
    signedOut();
    let hasProject = false;
    const meNoOrg = { ...ME, organizations: [] };
    server.use(
      http.post(API("/auth/register"), () => { server.use(http.get(API("/auth/me"), () => json(ME)), http.get(API("/projects"), () => json(hasProject ? [PROJECT] : []))); return json({ ...ME, organizations: [{ org_id: "o1", org_name: "Acme", org_slug: "acme", role: "owner" }] }, 201); }),
      http.get(API("/projects"), () => json(hasProject ? [PROJECT] : [])),
      http.post(API("/projects"), async ({ request }) => { const b: any = await request.json(); hasProject = true; return json({ ...PROJECT, name: b.name, api_key: { id: "k1", name: "Default", key_prefix: "phc_abcdef", key: "phc_abcdef0123456789SECRET", created_at: "", last_used_at: null, revoked_at: null, expires_at: null } }, 201); }),
      http.post(API("/analytics/overview"), () => json(overview)),
      http.get(API("/notifications"), () => json({ items: [], unread: 0 })),
    );
    void meNoOrg;
    renderApp(<AppRoutes />, "/register");
    await userEvent.type(await screen.findByLabelText("Email"), "owner@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Sup3rSecretPass");
    await userEvent.type(screen.getByLabelText("Workspace name"), "Acme");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    // no project yet -> onboarding
    await userEvent.type(await screen.findByLabelText("Project name"), "Web App");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(await screen.findByTestId("api-key-value")).toHaveTextContent("phc_abcdef0123456789SECRET");
    expect(screen.getByText(/shown only once/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continue to workspace" }));
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(await screen.findByTestId("kpi-Total events")).toHaveTextContent("11");
    expect(screen.getByTestId("kpi-Active users")).toHaveTextContent("3");
    expect(screen.getByText("login")).toBeInTheDocument();
  });

  it("overview shows an empty state when no events have arrived", async () => {
    signedIn();
    server.use(http.post(API("/analytics/overview"), () => json({ ...overview, kpis: { ...overview.kpis, total_events: 0, total_users: 0 } })));
    renderApp(<AppRoutes />, "/");
    expect(await screen.findByText("No data yet")).toBeInTheDocument();
  });
});

describe("API keys", () => {
  const key = { id: "k1", name: "Default", key_prefix: "phc_abcdef", created_at: "2026-08-01T00:00:00Z", last_used_at: null, revoked_at: null, expires_at: null };
  it("creates a key (shown once), rotates and revokes with confirmation", async () => {
    signedIn();
    const calls: string[] = [];
    server.use(
      http.get(API("/projects/p1/api-keys"), () => json([key])),
      http.post(API("/projects/p1/api-keys"), async ({ request }) => { calls.push("create:" + ((await request.json()) as any).name); return json({ ...key, id: "k2", name: "CI", key: "phc_NEWKEY", key_prefix: "phc_NEWKEY" }, 201); }),
      http.delete(API("/projects/p1/api-keys/k1"), () => { calls.push("revoke"); return json({ ...key, revoked_at: "2026-08-02T00:00:00Z" }); }),
    );
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    renderApp(<AppRoutes />, "/settings/api-keys");
    expect(await screen.findByText("phc_abcdef…")).toBeInTheDocument();
    expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /new key/i }));
    await userEvent.type(await screen.findByLabelText("Name"), "CI");
    await userEvent.click(screen.getByRole("button", { name: "Create key" }));
    expect(await screen.findByTestId("api-key-value")).toHaveTextContent("phc_NEWKEY");
    await userEvent.click(screen.getByRole("button", { name: "Copy API key" }));
    expect(await screen.findByText("Copied")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await userEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await userEvent.click(await screen.findByRole("button", { name: "Revoke key" }));
    await waitFor(() => expect(calls).toEqual(["create:CI", "revoke"]));
  });

  it("is hidden from non-admins", async () => {
    signedIn();
    server.use(http.get(API("/projects"), () => json([{ ...PROJECT, role: "member" }])));
    renderApp(<AppRoutes />, "/settings/api-keys");
    expect(await screen.findByText("Admins only")).toBeInTheDocument();
  });
});

describe("Dashboards", () => {
  const report = { id: "r1", project_id: "p1", name: "Purchases", description: "", query: { type: "trend", series: [{ event: "purchase" }], metric: "total_events", date_range: { preset: "last_7_days" }, interval: "day", filters: [] }, visualization: { chart: "line" }, created_at: "", updated_at: "" };
  const dash = (widgets: any[]) => ({ id: "d1", project_id: "p1", name: "Main", description: "", config: { widgets }, created_at: "", updated_at: new Date().toISOString() });
  const trend = { query_type: "trend", cached: false, computed_at: new Date().toISOString(), duration_ms: 1, result: { type: "trend", kind: "time_series", interval: "day", labels: ["a"], series: [{ label: "purchase", event: "purchase", breakdown_value: null, data: [3], total: 3 }], date_from: "", date_to: "", timezone: "UTC" } };

  it("adds, resizes, reorders, removes widgets and saves structured JSON", async () => {
    signedIn();
    let saved: any = null;
    const w = (id: string, title: string) => ({ id, title, report_id: "r1", visualization: {}, layout: { x: 0, y: 0, w: 6, h: 4 } });
    server.use(
      http.get(API("/dashboards/d1"), () => json(dash([w("w1", "First"), w("w2", "Second")]))),
      http.get(API("/reports"), () => json([report])),
      http.post(API("/analytics/query"), () => json(trend)),
      http.patch(API("/dashboards/d1"), async ({ request }) => { saved = await request.json(); return json(dash(saved.config.widgets)); }),
    );
    renderApp(<AppRoutes />, "/dashboards/d1");
    expect(await screen.findByRole("region", { name: "First" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /edit layout/i }));
    await userEvent.click(screen.getByRole("button", { name: "Width of First" }));
    await userEvent.click(screen.getByRole("option", { name: "Full" }));
    await userEvent.click(within(screen.getByRole("region", { name: "First" })).getByRole("button", { name: "Move widget down" }));
    await userEvent.click(within(screen.getByRole("region", { name: "Second" })).getByRole("button", { name: /remove widget/i }));
    await userEvent.click(screen.getByRole("button", { name: /^add widget$/i }));
    await userEvent.click(await screen.findByLabelText("Report", { selector: "button" }));
    await userEvent.click(screen.getByRole("option", { name: "Purchases (trend)" }));
    await userEvent.type(screen.getByLabelText("Widget title (optional)"), "New one");
    await userEvent.click(screen.getByRole("button", { name: "Add to dashboard" }));
    await userEvent.click(screen.getByRole("button", { name: "Save dashboard" }));
    await waitFor(() => expect(saved).not.toBeNull());
    expect(saved.config.widgets.map((x: any) => [x.title, x.layout.w])).toEqual([["First", 12], ["New one", 6]]);
    expect(saved.config.widgets[0].report_id).toBe("r1");
    expect(await screen.findByRole("button", { name: /edit layout/i })).toBeInTheDocument(); // left edit mode after saving
  });

  it("shows an empty state for a new dashboard and a recoverable error for a broken one", async () => {
    signedIn();
    server.use(http.get(API("/dashboards/d1"), () => json(dash([]))), http.get(API("/reports"), () => json([])));
    renderApp(<AppRoutes />, "/dashboards/d1");
    expect(await screen.findByText("This dashboard is empty")).toBeInTheDocument();
  });
});

describe("theme", () => {
  it("toggles dark mode and persists the choice", async () => {
    signedIn();
    server.use(http.post(API("/analytics/overview"), () => json(overview)));
    useUI.setState({ theme: "light" });
    renderApp(<AppRoutes />, "/");
    await userEvent.click(await screen.findByRole("button", { name: "Switch to dark mode" }));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("pa-theme")).toBe("dark");
    await userEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
