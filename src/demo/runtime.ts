/* Demo-only in-memory runtime. No network, database, Redis, or backend is required. */
type DemoOpts = { method?: string; body?: unknown; params?: Record<string, unknown> };

const DAY = 86_400_000;
const now = new Date("2026-11-16T09:30:00.000Z");

const iso = (ms: number) => new Date(ms).toISOString();
const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, "0")}`;

const user = {
  id: "user-demo-0001",
  email: "demo@analytics.local",
  name: "Demo Analyst",
  email_verified: true,
  created_at: iso(now.getTime() - 180 * DAY),
};
const org = {
  id: "org-demo-0001",
  name: "Acme Product Labs",
  slug: "acme-product-labs",
};
const projectSettings = {
  timezone: "UTC",
  session_timeout_minutes: 30,
  retention_days: 365,
  ip_mode: "anonymize" as const,
  rate_limit_per_second: 10,
  property_denylist: ["password", "token"],
};
const project = {
  id: "project-demo-0001",
  org_id: org.id,
  name: "Acme Web App",
  settings: projectSettings,
  role: "owner" as const,
  created_at: iso(now.getTime() - 150 * DAY),
};

const people = Array.from({ length: 12 }, (_, i) => {
  const first = ["Ava", "Noah", "Mia", "Liam", "Emma", "Oliver", "Sophia", "Ethan", "Isla", "Lucas", "Zoe", "Arjun"][i];
  const last = ["Patel", "Shah", "Mehta", "Kapoor", "Brown", "Smith", "Garcia", "Chen", "Wilson", "Khan", "Martin", "Singh"][i];
  return {
    id: id("person", i + 1),
    distinct_ids: [`user_${String(i + 1).padStart(3, "0")}`],
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    name: `${first} ${last}`,
    is_identified: true,
    properties: { plan: i % 4 === 0 ? "enterprise" : i % 3 === 0 ? "pro" : "growth", country: ["US", "IN", "GB", "DE"][i % 4], team_size: [3, 8, 15, 42][i % 4] },
    first_seen: iso(now.getTime() - (120 - i * 5) * DAY),
    last_seen: iso(now.getTime() - (i % 3) * DAY),
    event_count: 80 + i * 17,
    sessions: 8 + i,
    country: ["US", "IN", "GB", "DE"][i % 4],
    browser: i % 2 ? "Chrome" : "Safari",
    os: i % 3 ? "macOS" : "Windows",
    device_type: i % 4 === 0 ? "mobile" : "desktop",
  };
});

const eventNames = ["$pageview", "Signed Up", "Viewed Pricing", "Started Trial", "Created Project", "Invited Teammate", "Ran Report", "Exported Data"];

const events = Array.from({ length: 72 }, (_, i) => {
  const person = people[i % people.length];
  const event = eventNames[i % eventNames.length];
  const ts = now.getTime() - ((i * 7) % 42) * DAY - (i % 7) * 3_600_000;
  return {
    id: id("event", i + 1),
    event,
    timestamp: iso(ts),
    received_at: iso(ts + 1_200),
    distinct_id: person.distinct_ids[0],
    anonymous_id: i % 5 === 0 ? `anon_${i + 1}` : null,
    person_id: person.id,
    insert_id: `insert_${i + 1}`,
    properties: {
      plan: person.properties.plan,
      path: event === "$pageview" ? ["/", "/pricing", "/docs", "/app"][i % 4] : undefined,
      source: ["organic", "product", "email", "paid"][i % 4],
      value: event === "Ran Report" ? 120 + i * 7 : undefined,
    },
    path: event === "$pageview" ? ["/", "/pricing", "/docs", "/app"][i % 4] : `/app/${event.toLowerCase().replace(/\\s+/g, "-")}`,
    hostname: "app.acme.example",
    country: person.country,
    ip: i % 3 === 0 ? null : "203.0.113.10",
    user_agent: "Mozilla/5.0 (Demo Browser)",
    device: { browser: person.browser, browser_version: "157", os: person.os, os_version: "15", device_type: person.device_type },
    person: { id: person.id, properties: person.properties, first_seen: person.first_seen, last_seen: person.last_seen },
  };
});

const members = [
  { user_id: user.id, email: user.email, name: user.name, role: "owner", joined_at: user.created_at },
  { user_id: "user-demo-0002", email: "maya@acme.example", name: "Maya Chen", role: "admin", joined_at: iso(now.getTime() - 90 * DAY) },
  { user_id: "user-demo-0003", email: "daniel@acme.example", name: "Daniel Wong", role: "member", joined_at: iso(now.getTime() - 45 * DAY) },
];
const invitations = [
  { id: "invite-demo-0001", email: "new.engineer@example.com", role: "member", created_at: iso(now.getTime() - 2 * DAY) },
];
const apiKeys = [
  { id: "key-demo-0001", name: "Production JS SDK", key_prefix: "phc_demo_9f2a", created_at: iso(now.getTime() - 150 * DAY), last_used_at: iso(now.getTime() - 2_700_000), revoked_at: null, expires_at: null },
  { id: "key-demo-0002", name: "Staging", key_prefix: "phc_demo_51c3", created_at: iso(now.getTime() - 32 * DAY), last_used_at: iso(now.getTime() - 9 * DAY), revoked_at: null, expires_at: iso(now.getTime() + 60 * DAY) },
];

const reports: any[] = [
  {
    id: "report-demo-0001", project_id: project.id, name: "Activation trend", description: "Trial activation over the last 30 days",
    query: { type: "trend", series: [{ event: "Started Trial" }], metric: "unique_users", date_range: { preset: "last_30_days" }, interval: "day", filters: [], timezone: "UTC", compare_previous: true },
    visualization: { chart: "line" }, created_by_name: user.name, created_at: iso(now.getTime() - 20 * DAY), updated_at: iso(now.getTime() - 3 * DAY),
  },
  {
    id: "report-demo-0002", project_id: project.id, name: "Signup funnel", description: "Signup to first project creation",
    query: { type: "funnel", steps: [{ event: "Signed Up" }, { event: "Started Trial" }, { event: "Created Project" }], date_range: { preset: "last_30_days" }, conversion_window: { value: 14, unit: "day" }, filters: [], timezone: "UTC" },
    visualization: { chart: "bar" }, created_by_name: user.name, created_at: iso(now.getTime() - 12 * DAY), updated_at: iso(now.getTime() - DAY),
  },
];

const dashboards: any[] = [
  {
    id: "dashboard-demo-0001", project_id: project.id, name: "Executive overview", description: "Core product health metrics",
    config: {
      widgets: [
        { id: "widget-1", title: "Activation trend", report_id: reports[0].id, query: null, visualization: { chart: "line" }, layout: { x: 0, y: 0, w: 8, h: 4 } },
        { id: "widget-2", title: "Signup funnel", report_id: reports[1].id, query: null, visualization: { chart: "bar" }, layout: { x: 8, y: 0, w: 4, h: 4 } },
      ],
      date_range: { preset: "last_30_days" },
    },
    created_at: iso(now.getTime() - 25 * DAY),
    updated_at: iso(now.getTime() - 3 * DAY),
  },
];

const cohorts: any[] = [
  {
    id: "cohort-demo-0001", project_id: project.id, name: "Trial users", description: "Users who started a trial",
    definition: { match: "all", criteria: [{ type: "performed_event", event: "Started Trial", operator: "at_least", count: 1, within_days: null }] },
    last_count: 74, last_calculated_at: iso(now.getTime() - 2 * 3_600_000), created_at: iso(now.getTime() - 15 * DAY), updated_at: iso(now.getTime() - 2 * DAY),
  },
  {
    id: "cohort-demo-0002", project_id: project.id, name: "Enterprise accounts", description: "Users with enterprise plan",
    definition: { match: "all", criteria: [{ type: "person_property", property: "plan", operator: "equals", value: "enterprise" }] },
    last_count: 18, last_calculated_at: iso(now.getTime() - DAY), created_at: iso(now.getTime() - 8 * DAY), updated_at: iso(now.getTime() - DAY),
  },
];

const alerts: any[] = [
  { id: "alert-demo-0001", project_id: project.id, name: "Activation drop", enabled: true, query: { event: "Started Trial", metric: "unique_users", metric_property: null }, condition: { operator: "decrease_pct", value: 15 }, period: "day", webhook_url: null, state: "healthy", last_value: 82, last_evaluated_at: iso(now.getTime() - 45 * 60_000), last_triggered_at: null, last_error: null },
];

const notifications: any[] = [
  { id: "notification-demo-0001", alert_id: alerts[0].id, kind: "alert", title: "Activation drop", body: "Started Trial is within the expected range.", created_at: iso(now.getTime() - 3 * 3_600_000), read_at: null },
];

const auditLogs: any[] = [
  { id: "audit-demo-0001", action: "project.create", user_id: user.id, target_type: "project", metadata: { name: project.name }, created_at: iso(now.getTime() - 150 * DAY), ip: "203.0.113.10" },
  { id: "audit-demo-0002", action: "api_key.rotate", user_id: user.id, target_type: "api_key", metadata: { name: "Production JS SDK" }, created_at: iso(now.getTime() - 9 * DAY), ip: "203.0.113.10" },
  { id: "audit-demo-0003", action: "report.create", user_id: user.id, target_type: "report", metadata: { name: reports[1].name }, created_at: iso(now.getTime() - 3 * DAY), ip: "203.0.113.10" },
];

const exportJobs: any[] = [
  { id: "export-demo-0001", project_id: project.id, kind: "events", format: "csv", status: "done", row_count: 72, error: null, created_at: iso(now.getTime() - DAY), finished_at: iso(now.getTime() - 23 * 3_600_000) },
];

const state = { loggedIn: true, password: "demo1234!", people, events, members, invitations, apiKeys, reports, dashboards, cohorts, alerts, notifications, auditLogs, exportJobs };

const envelope = (result: any, queryType: string) => ({ query_type: queryType, result, cached: false, computed_at: now.toISOString(), duration_ms: 18 });

function dateLabels(count = 14) {
  return Array.from({ length: count }, (_, i) => iso(now.getTime() - (count - i - 1) * DAY).slice(0, 10));
}

function trendResult(query: any) {
  const labels = dateLabels(14);
  const selected = query.series?.length ? query.series : [{ event: "$pageview" }];
  return {
    type: "trend",
    kind: query.metric === "frequency" ? "distribution" : "time_series",
    interval: query.interval ?? "day",
    labels,
    series: selected.map((s: any, si: number) => ({
      label: s.event,
      event: s.event,
      breakdown_value: null,
      data: labels.map((_, i) => Math.round((18 + ((i * 7 + si * 11) % 28)) * (query.metric === "unique_users" ? 0.6 : 1))),
      total: 410 + si * 56,
    })),
    date_from: labels[0],
    date_to: labels[labels.length - 1],
    timezone: query.timezone ?? "UTC",
    previous: query.compare_previous
      ? { type: "trend", kind: "time_series", interval: query.interval ?? "day", labels, series: selected.map((s: any) => ({ label: s.event, event: s.event, breakdown_value: null, data: labels.map((_, i) => Math.round(14 + ((i * 5) % 20))), total: 315 })), date_from: labels[0], date_to: labels[labels.length - 1], timezone: query.timezone ?? "UTC" }
      : null,
  };
}

function funnelResult(query: any) {
  const counts = [96, 77, 54, 39];
  const steps = (query.steps ?? []).map((s: any, i: number) => {
    const count = counts[i] ?? Math.max(12, counts[counts.length - 1] - i * 7);
    const prev = i ? counts[i - 1] : count;
    return {
      order: i,
      event: s.event,
      label: s.label ?? s.event,
      count,
      conversion_rate: i ? count / prev : 1,
      dropoff_count: i ? prev - count : 0,
      dropoff_rate: i ? 1 - count / prev : 0,
      overall_conversion_rate: count / counts[0],
      avg_time_to_convert_seconds: i ? 1_800 + i * 2_200 : null,
      median_time_to_convert_seconds: i ? 1_400 + i * 1_900 : null,
    };
  });
  return { type: "funnel", steps, overall_conversion_rate: steps.length ? steps[steps.length - 1].count / steps[0].count : 0, breakdowns: null, conversion_window_seconds: 14 * DAY / 1000, date_from: dateLabels(14)[0], date_to: dateLabels(14).at(-1), timezone: query.timezone ?? "UTC" };
}

function retentionResult(query: any) {
  const offsets = Array.from({ length: Math.min(query.periods ?? 8, 8) }, (_, i) => i);
  const cohorts = [0, 1, 2, 3].map((i) => ({
    period: dateLabels(12)[12 - i - 4],
    size: 40 - i * 4,
    cells: offsets.map((offset) => ({ offset, count: offset === 0 ? 40 - i * 4 : Math.max(1, Math.round((40 - i * 4) * Math.pow(0.72, offset))), rate: offset === 0 ? 1 : Math.pow(0.72, offset) })),
  }));
  return { type: "retention", interval: query.interval ?? "day", offsets, cohorts, average: offsets.map((offset) => ({ offset, count: offset === 0 ? 44 : Math.round(44 * Math.pow(0.72, offset)), rate: offset === 0 ? 1 : Math.pow(0.72, offset) })), date_from: dateLabels(14)[0], date_to: dateLabels(14).at(-1), timezone: query.timezone ?? "UTC" };
}

function pathsResult(query: any) {
  const starts = query.path_type === "page" ? ["/", "/pricing", "/docs"] : ["$pageview", "Signed Up", "Viewed Pricing"];
  const edges: any[] = [];
  for (let step = 1; step <= Math.min(query.depth ?? 4, 4); step++) {
    const a = starts[(step - 1) % starts.length];
    const b = starts[step % starts.length];
    edges.push({ step, source: a, target: b, count: 90 - step * 13 }, { step, source: a, target: "$pageview", count: 46 - step * 4 });
  }
  return { type: "paths", edges, sessions: 126 };
}

function sessionsResult(query: any) {
  const labels = dateLabels(14);
  return {
    type: "sessions",
    summary: { sessions: 132, avg_duration_seconds: 456, avg_events_per_session: 6.4, avg_pages_per_session: 3.1, bounce_rate: 0.23, unique_users: 94 },
    interval: query.interval ?? "day",
    labels,
    sessions_series: labels.map((_, i) => 7 + (i % 5)),
    avg_duration_series: labels.map((_, i) => 340 + (i % 6) * 22),
    previous: { sessions: 118, avg_duration_seconds: 411, avg_events_per_session: 5.8, avg_pages_per_session: 2.8, bounce_rate: 0.27, unique_users: 87 },
    timezone: query.timezone ?? "UTC",
  };
}

function overview() {
  const labels = dateLabels(14);
  const topEvents = eventNames.slice(0, 6).map((event, i) => ({ event, count: 210 - i * 23, unique_users: 94 - i * 7 }));
  const topPages = ["/", "/pricing", "/docs", "/app/dashboard"].map((path, i) => ({ path, views: 860 - i * 145, unique_visitors: 310 - i * 42, avg_views_per_user: 2.2 + i * 0.3 }));
  return {
    kpis: { total_users: 148, active_users: 94, new_users: 26, total_events: 12840, sessions: 132, events_per_user: 86.8, avg_session_duration_seconds: 456 },
    previous_kpis: { total_users: 131, active_users: 86, new_users: 21, total_events: 11320, sessions: 118, events_per_user: 86.4, avg_session_duration_seconds: 411 },
    interval: "day",
    labels,
    event_volume: labels.map((_, i) => 730 + i * 28 + (i % 3) * 40),
    active_users_series: labels.map((_, i) => 49 + i * 2),
    new_users_series: labels.map((_, i) => 5 + (i % 4)),
    user_growth_series: labels.map((_, i) => 2.1 + i * 0.15),
    top_events: topEvents,
    top_pages: topPages,
    retention: retentionResult({ type: "retention", periods: 8, interval: "day", timezone: "UTC" }),
    cached: false,
    computed_at: now.toISOString(),
  };
}

function usage() {
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = iso(now.getTime() - (13 - i) * DAY).slice(0, 10);
    return { date, requests: 120 + i * 11, events_accepted: 740 + i * 24, events_rejected: 4 + (i % 3), events_duplicate: 18 + (i % 5), rate_limited: i % 4 === 0 ? 1 : 0 };
  });
  const totals = Object.fromEntries(["requests", "events_accepted", "events_rejected", "events_duplicate", "rate_limited"].map((k) => [k, days.reduce((n, d) => n + d[k as keyof typeof d], 0)]));
  return { days, totals, rate_limit_per_second: project.settings.rate_limit_per_second };
}

function findById(list: any[], value: string) { return list.find((x) => String(x.id) === String(value)); }
function jsonResponse(value: any): any { return value; }

export async function demoRequest<T = unknown>(path: string, opts: DemoOpts = {}): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  const method = (opts.method ?? "GET").toUpperCase();
  const body: any = opts.body ?? {};
  const params = opts.params ?? {};
  const parts = path.split("/").filter(Boolean);
  const root = parts[0] ?? "";

  if (root === "auth") {
    if (parts[1] === "me") return (state.loggedIn ? { user, organizations: [{ org_id: org.id, org_name: org.name, org_slug: org.slug, role: "owner" }], csrf_token: "demo-csrf" } : null) as T;
    if (parts[1] === "login") {
      state.loggedIn = true;
      return { user, organizations: [{ org_id: org.id, org_name: org.name, org_slug: org.slug, role: "owner" }], csrf_token: "demo-csrf" } as T;
    }
    if (parts[1] === "register") {
      state.loggedIn = true;
      return { user: { ...user, email: body.email ?? user.email, name: body.name ?? user.name }, organizations: [{ org_id: org.id, org_name: body.organization_name ?? org.name, org_slug: org.slug, role: "owner" }], csrf_token: "demo-csrf" } as T;
    }
    if (parts[1] === "logout") { state.loggedIn = false; return { ok: true } as T; }
    return { ok: true } as T;
  }

  if (!state.loggedIn) {
    const err: any = new Error("Demo session expired");
    err.status = 401; err.code = "UNAUTHORIZED";
    throw err;
  }

  if (root === "organizations") {
    const oid = parts[1];
    if (!oid) return [{ id: org.id, name: org.name, slug: org.slug, role: "owner" }] as T;
    if (parts[2] === "members") {
      if (method === "GET") return state.members as T;
      if (parts[3]) {
        if (method === "PATCH") { const m = findById(state.members.map((x) => ({...x,id:x.user_id})), parts[3]); if (m) m.role = body.role; return (m ?? { ok: true }) as T; }
        if (method === "DELETE") { state.members = state.members.filter((m: any) => m.user_id !== parts[3]); return { ok: true } as T; }
      }
      if (method === "POST") {
        const existing = state.members.find((m: any) => m.email.toLowerCase() === String(body.email).toLowerCase());
        if (existing) return { status: "added", member: existing } as T;
        const inv = { id: `invite-${Date.now()}`, email: body.email, role: body.role, created_at: now.toISOString() };
        state.invitations.push(inv);
        return { status: "invited", invitation: inv } as T;
      }
    }
    if (parts[2] === "invitations") {
      if (method === "GET") return state.invitations as T;
      if (method === "DELETE") { state.invitations = state.invitations.filter((x: any) => x.id !== parts[3]); return { ok: true } as T; }
    }
    if (parts[2] === "audit-logs") return state.auditLogs as T;
    if (method === "POST") return { id: `org-${Date.now()}`, name: body.name ?? "New Organization", slug: String(body.name ?? "new").toLowerCase().replace(/[^a-z0-9]+/g, "-"), role: "owner" } as T;
  }

  if (root === "projects") {
    const pid = parts[1];
    if (!pid) {
      if (method === "GET") return [project] as T;
      const created = { ...project, id: `project-${Date.now()}`, name: body.name ?? "New Project" };
      return { ...created, api_key: { ...apiKeys[0], id: `key-${Date.now()}`, name: "Default", key: "phc_demo_new", key_prefix: "phc_demo_new" } } as T;
    }
    if (parts[2] === "api-keys") {
      if (method === "GET") return state.apiKeys as T;
      if (parts[3] && parts[4] === "rotate" && method === "POST") {
        const key = { ...state.apiKeys[0], id: `key-${Date.now()}`, name: body.name ?? "Rotated", key_prefix: "phc_demo_rotated", key: "phc_demo_rotated_secret" };
        state.apiKeys.push({ ...key, key: undefined });
        return key as T;
      }
      if (parts[3] && method === "DELETE") {
        const key = findById(state.apiKeys, parts[3]);
        if (key) key.revoked_at = now.toISOString();
        return (key ?? { ok: true }) as T;
      }
      if (method === "POST") {
        const key = { id: `key-${Date.now()}`, name: body.name ?? "New key", key_prefix: "phc_demo_new", created_at: now.toISOString(), last_used_at: null, revoked_at: null, expires_at: null, key: "phc_demo_new_secret" };
        state.apiKeys.push({ ...key, key: undefined });
        return key as T;
      }
    }
    if (parts[2] === "usage") return usage() as T;
    if (parts[2] === "data" && parts[3] === "purge") return { ok: true } as T;
    if (parts[2] === "persons" && method === "DELETE") { state.people = state.people.filter((p: any) => p.id !== parts[3]); state.events = state.events.filter((e: any) => e.person_id !== parts[3]); return { ok: true } as T; }
    if (method === "GET") return project as T;
    if (method === "PATCH") {
      if (body.name) project.name = body.name;
      if (body.settings) project.settings = { ...project.settings, ...body.settings };
      return project as T;
    }
    if (method === "DELETE") return { ok: true } as T;
  }

  if (root === "analytics") {
    if (parts[1] === "overview") return overview() as T;
    if (parts[1] === "sessions" && parts[2] === "list") {
      const offset = Number(body.offset ?? 0);
      const rows = state.people.slice(offset, offset + 6).map((p: any, i: number) => ({ person_id: p.id, distinct_id: p.distinct_ids[0], start: iso(now.getTime() - (i + 1) * 3_600_000), end: iso(now.getTime() - (i + 1) * 3_600_000 + 1_800_000), duration_seconds: 1800, events: 6 + i, pages: 3, entry_path: "/", exit_path: "/app" }));
      return { items: rows, next_offset: offset + rows.length < state.people.length ? offset + rows.length : null } as T;
    }
    if (parts[1] === "query") {
      const q = body.query ?? {};
      const result = q.type === "trend" ? trendResult(q) : q.type === "funnel" ? funnelResult(q) : q.type === "retention" ? retentionResult(q) : q.type === "paths" ? pathsResult(q) : sessionsResult(q);
      return envelope(result, q.type) as T;
    }
  }

  if (root === "events") {
    if (method === "GET" && !parts[1]) return { items: state.events.slice(0, 50), next_cursor: state.events.length > 50 ? "page-2" : null } as T;
    if (parts[1]) return (findById(state.events, parts[1]) ?? state.events[0]) as T;
  }

  if (root === "users") {
    if (!parts[1]) return { items: state.people.slice(0, 50), next_cursor: null } as T;
    const person = findById(state.people, parts[1]) ?? state.people[0];
    if (parts[2] === "events") return { items: state.events.filter((e: any) => e.person_id === person.id), next_cursor: null } as T;
    return person as T;
  }

  if (root === "meta") {
    if (parts[1] === "event-definitions") return eventNames.map((name, i) => ({ name, first_seen: iso(now.getTime() - (120 - i) * DAY), last_seen: iso(now.getTime() - i * DAY) })) as T;
    if (parts[1] === "property-definitions") return [
      { name: "plan", kind: "person", value_type: "string", builtin: false },
      { name: "country", kind: "person", value_type: "string", builtin: true },
      { name: "$current_url", kind: "event", value_type: "string", builtin: true },
      { name: "source", kind: "event", value_type: "string", builtin: false },
      { name: "value", kind: "event", value_type: "number", builtin: false },
    ] as T;
    if (parts[1] === "property-values") return [{ value: "enterprise", count: 18 }, { value: "pro", count: 42 }, { value: "growth", count: 64 }] as T;
  }

  if (["cohorts", "reports", "dashboards", "alerts"].includes(root)) {
    const collection = state[root as "cohorts" | "reports" | "dashboards" | "alerts"];
    if (!parts[1]) {
      if (method === "GET") return collection as T;
      const created = { ...body, id: `${root.slice(0, -1)}-${Date.now()}`, project_id: body.project_id ?? project.id, created_at: now.toISOString(), updated_at: now.toISOString(), created_by_name: user.name };
      if (root === "cohorts") Object.assign(created, { last_count: 24, last_calculated_at: now.toISOString() });
      if (root === "alerts") Object.assign(created, { enabled: body.enabled ?? true, state: "healthy", last_value: null, last_evaluated_at: null, last_triggered_at: null, last_error: null, webhook_url: body.webhook_url ?? null });
      collection.unshift(created);
      return created as T;
    }
    const obj = findById(collection, parts[1]);
    if (parts[2] === "duplicate" && method === "POST" && obj) {
      const copy = { ...obj, id: `${root.slice(0, -1)}-${Date.now()}`, name: `${obj.name} (copy)`, created_at: now.toISOString(), updated_at: now.toISOString() };
      collection.unshift(copy); return copy as T;
    }
    if (parts[2] === "evaluate" && method === "POST" && obj) { obj.last_evaluated_at = now.toISOString(); obj.last_value = 84; obj.state = "healthy"; return obj as T; }
    if (parts[2] === "members" && root === "cohorts") return { items: state.people.slice(0, 8), total: 8 } as T;
    if (parts[2] === "refresh" && root === "cohorts" && method === "POST" && obj) { obj.last_count = 27; obj.last_calculated_at = now.toISOString(); return obj as T; }
    if (method === "GET") return obj as T;
    if (method === "PATCH") { Object.assign(obj ?? {}, body, { updated_at: now.toISOString() }); return obj as T; }
    if (method === "DELETE") { const i = collection.findIndex((x: any) => x.id === parts[1]); if (i >= 0) collection.splice(i, 1); return { ok: true } as T; }
  }

  if (root === "notifications") {
    if (method === "GET") { const unread = state.notifications.filter((n: any) => !n.read_at).length; return { items: state.notifications, unread } as T; }
    if (method === "POST") { state.notifications.forEach((n: any) => n.read_at = now.toISOString()); return { ok: true } as T; }
  }

  if (root === "export") {
    if (parts[1] === "jobs") {
      if (method === "GET") return state.exportJobs as T;
      if (method === "POST") {
        const job = { id: `export-${Date.now()}`, project_id: body.project_id ?? project.id, kind: body.kind ?? "events", format: body.format ?? "csv", status: "done", row_count: state.events.length, error: null, created_at: now.toISOString(), finished_at: now.toISOString() };
        state.exportJobs.unshift(job); return job as T;
      }
    }
    return { ok: true } as T;
  }

  return jsonResponse({ ok: true }) as T;
}

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k])).join(","))].join("\\n");
}

export function demoDownload(path: string, params: Record<string, unknown>): string {
  const data = path.includes("/events") ? state.events.slice(0, 50) : path.includes("/users") ? state.people : reports;
  const isJson = params.format === "json" || path.includes("/reports");
  const payload = isJson ? JSON.stringify(data, null, 2) : toCsv(data);
  const mime = isJson ? "application/json" : "text/csv";
  return `data:${mime};charset=utf-8,${encodeURIComponent(payload)}`;
}

export async function demoDownloadPost(path: string, body: unknown, filename: string): Promise<void> {
  const payload = JSON.stringify({ demo: true, path, body }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
