import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const base = "http://127.0.0.1:5173";
const visuals = path.resolve("docs/testing/visuals");
fs.mkdirSync(visuals, { recursive: true });
const saveShot = async (page: import("@playwright/test").Page, name: string) => {
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(visuals, name), fullPage: true, animations: "disabled" });
};

test("browser journey writes through FastAPI into PostgreSQL", async ({ page }) => {
  const calls = new Set<string>();
  const errors: string[] = [];
  page.on("request", r => { if (r.url().includes("/api/v1/")) calls.add(r.method() + " " + new URL(r.url()).pathname); });
  page.on("response", r => { if (r.url().includes("/api/v1/") && r.status() >= 500) errors.push(r.status() + " " + r.url()); });
  const email = `qa-${Date.now()}@example.com`;
  const password = "StrongE2EPassword123";
  const names = { report: "E2E Purchase Trend", cohort: "E2E Purchase Cohort", dashboard: "E2E Analytics Dashboard", alert: "E2E Purchase Alert", apiKey: "E2E Revocation Test Key" };
  const updatedProjectName = "Full Stack Test Project - QA";

  await page.goto(base + "/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await saveShot(page, "00-login.png");
  await page.goto(base + "/register");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await saveShot(page, "01-register.png");
  await page.getByLabel("Your name").fill("Full Stack Test Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("Workspace name").fill("E2E Test Workspace");
  const registerWait = page.waitForResponse(r => r.url().includes("/api/v1/auth/register") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create account" }).click();
  expect((await registerWait).status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Create your first project" })).toBeVisible();
  await saveShot(page, "02-first-project.png");

  await page.getByLabel("Project name").fill("Full Stack Test Project");
  const projectWait = page.waitForResponse(r => r.url().endsWith("/api/v1/projects") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create project" }).click();
  const projectResponse = await projectWait;
  expect(projectResponse.status()).toBe(201);
  const project = await projectResponse.json();
  const apiKey = (await page.getByTestId("api-key-value").innerText()).trim();
  expect(apiKey).toMatch(/^phc_/);
  await page.getByTestId("api-key-value").evaluate(node => { node.textContent = "phc_TEST_KEY_REDACTED"; });
  await saveShot(page, "03-api-key-redacted.png");
  await page.getByRole("button", { name: "Continue to workspace" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 20000 });

  // Isolated test events use the actual ingestion API and production ingestion service, not MSW or fixtures.
  const now = Date.now();
  const event = (name: string, distinct_id: string, uuid: string, minutes: number, properties: object) => ({
    event: name, distinct_id, uuid, timestamp: new Date(now - minutes * 60000).toISOString(), properties,
    context: { country: "IN", browser: "Chromium", device_type: "desktop" },
  });
  const events = [
    event("$pageview", "qa-person-a", "qa-pageview-001", 12, { "$pathname": "/pricing", plan: "pro" }),
    event("signup_completed", "qa-person-a", "qa-signup-001", 10, { plan: "pro", source: "walkthrough" }),
    event("purchase_completed", "qa-person-a", "qa-purchase-001", 8, { amount: 99, currency: "USD", plan: "pro" }),
    event("$pageview", "qa-person-b", "qa-pageview-002", 5, { "$pathname": "/docs", plan: "starter" }),
  ];
  const ingested = await page.evaluate(async ({ apiKey, events }) => {
    const r = await fetch("/api/v1/events/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: apiKey, events }) });
    return { status: r.status, body: await r.json() };
  }, { apiKey, events });
  expect(ingested.status).toBe(200);
  expect(ingested.body.accepted).toBe(4);

  // Overview may have cached the empty state before the events arrived; the visible refresh button
  // must bypass that cache and render totals from the records now persisted in PostgreSQL.
  const overviewRefreshWait = page.waitForResponse(r =>
    r.url().endsWith("/api/v1/analytics/overview") &&
    r.request().method() === "POST" &&
    r.request().postDataJSON()?.refresh === true,
  );
  await page.getByRole("button", { name: "Refresh data" }).click();
  const overviewRefresh = await overviewRefreshWait;
  expect(overviewRefresh.status()).toBe(200);
  const overviewBody = await overviewRefresh.json();
  expect(overviewBody.kpis.total_events).toBe(4);
  await expect(page.getByTestId("kpi-Total events")).toHaveText("4");
  await saveShot(page, "05-overview.png");

  const queryWait = page.waitForResponse(r => r.url().includes("/api/v1/analytics/query") && r.request().method() === "POST");
  await page.goto(base + "/insights/trends");
  expect((await queryWait).ok()).toBeTruthy();
  await expect(page.getByRole("button", { name: "Save as report" })).toBeEnabled({ timeout: 20000 });
  await saveShot(page, "04-trends.png");
  await page.getByRole("button", { name: "Save as report" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(names.report);
  const reportWait = page.waitForResponse(r => r.url().endsWith("/api/v1/reports") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Save report" }).click();
  expect((await reportWait).status()).toBe(201);
  await expect(page.getByText("Report saved")).toBeVisible();

  await page.goto(base + "/insights/cohorts");
  await page.getByRole("button", { name: "New cohort" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(names.cohort);
  const cohortPreviewWait = page.waitForResponse(r => r.url().endsWith("/api/v1/cohorts/preview") && r.request().method() === "POST");
  await page.getByRole("dialog").getByLabel("Event", { exact: true }).fill("purchase_completed");
  const cohortPreview = await cohortPreviewWait;
  expect(cohortPreview.status()).toBe(200);
  expect((await cohortPreview.json()).count).toBeGreaterThanOrEqual(1);
  const cohortWait = page.waitForResponse(r => r.url().endsWith("/api/v1/cohorts") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Save cohort" }).click();
  expect((await cohortWait).status()).toBe(201);
  await expect(page.getByText(names.cohort)).toBeVisible();

  await page.goto(base + "/dashboards");
  await page.getByRole("button", { name: "New dashboard" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(names.dashboard);
  const dashboardWait = page.waitForResponse(r => r.url().endsWith("/api/v1/dashboards") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  expect((await dashboardWait).status()).toBe(201);
  await expect(page.getByRole("heading", { name: names.dashboard })).toBeVisible();
  await page.getByRole("button", { name: "Add widget" }).click();
  await page.getByRole("dialog").getByLabel("Report", { selector: "button" }).click();
  await page.getByRole("option", { name: names.report + " (trend)" }).click();
  await page.getByRole("button", { name: "Add to dashboard" }).click();
  const patchWait = page.waitForResponse(r => r.url().includes("/api/v1/dashboards/") && r.request().method() === "PATCH");
  await page.getByRole("button", { name: "Save dashboard" }).click();
  expect((await patchWait).ok()).toBeTruthy();

  await page.goto(base + "/settings/alerts");
  await page.getByRole("button", { name: "New alert" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(names.alert);
  await page.getByRole("dialog").getByLabel("Event", { exact: true }).fill("purchase_completed");
  await page.getByRole("dialog").getByLabel("Threshold").fill("10000");
  const alertWait = page.waitForResponse(r => r.url().endsWith("/api/v1/alerts") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create alert" }).click();
  const alertResponse = await alertWait;
  expect(alertResponse.status()).toBe(201);
  const createdAlert = await alertResponse.json();
  await expect(page.getByText(names.alert)).toBeVisible();
  const evaluateAlertWait = page.waitForResponse(r => r.url().endsWith(`/api/v1/alerts/${createdAlert.id}/evaluate`) && r.request().method() === "POST");
  await page.getByRole("button", { name: "Evaluate now" }).click();
  expect((await evaluateAlertWait).status()).toBe(200);

  // Verify a project settings edit persists through the authenticated API.
  await page.goto(base + "/settings/project");
  await page.getByLabel("Project name").fill(updatedProjectName);
  const projectUpdateWait = page.waitForResponse(r => r.url().endsWith(`/api/v1/projects/${project.id}`) && r.request().method() === "PATCH");
  await page.getByRole("button", { name: "Save changes" }).click();
  expect((await projectUpdateWait).status()).toBe(200);
  await expect(page.getByText("Project settings saved")).toBeVisible();

  // Persist a retention setting and leave stored events inside the configured window.
  await page.goto(base + "/settings/data");
  await page.getByLabel("Keep events for", { selector: "button" }).click();
  await page.getByRole("option", { name: "90 days", exact: true }).click();
  const retentionWait = page.waitForResponse(r => r.url().endsWith(`/api/v1/projects/${project.id}`) && r.request().method() === "PATCH");
  await page.getByRole("button", { name: "Save retention" }).click();
  expect((await retentionWait).status()).toBe(200);
  await expect(page.getByText(/Retention updated/)).toBeVisible();

  // Queue a background export in the UI; the worker consumes it and the browser downloads its real CSV output.
  await page.goto(base + "/settings/data");
  const exportWait = page.waitForResponse(r => r.url().endsWith("/api/v1/export/jobs") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Queue events export (90 days)" }).click();
  expect((await exportWait).status()).toBe(202);
  await expect(page.getByText("done", { exact: true })).toBeVisible({ timeout: 60000 });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: /Download/ }).click(),
  ]);
  expect(await download.suggestedFilename()).toBe("events.csv");

  // Destructive project purge must stay disabled until the exact project name is entered.
  await page.getByRole("button", { name: "Delete all data" }).click();
  await expect(page.getByRole("heading", { name: "Delete all project data?" })).toBeVisible();
  await page.getByRole("dialog").getByLabel(`Type "${updatedProjectName}" to confirm`).fill("not-the-project-name");
  await expect(page.getByRole("dialog").getByRole("button", { name: "Delete all data" })).toBeDisabled();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  expect([...calls].some(call => call === `POST /api/v1/projects/${project.id}/data/purge`)).toBeFalsy();

  const routes: Array<[string, string]> = [
    ["/", "05-overview.png"], ["/insights/trends", "06-trends-data.png"], ["/insights/funnels", "07-funnels.png"],
    ["/insights/retention", "08-retention.png"], ["/insights/paths", "09-journeys.png"], ["/insights/cohorts", "10-cohorts.png"],
    ["/events", "11-events.png"], ["/users", "12-users.png"], ["/sessions", "13-sessions.png"],
    ["/dashboards", "14-dashboards.png"], ["/reports", "15-reports.png"], ["/settings/project", "16-project-settings.png"],
    ["/settings/api-keys", "17-api-keys.png"], ["/settings/team", "18-team.png"], ["/settings/alerts", "19-alerts.png"],
    ["/settings/data", "20-data-management.png"], ["/settings/security", "21-security.png"],
  ];
  for (const [route, name] of routes) {
    const response = await page.goto(base + route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("main")).toBeVisible({ timeout: 20000 });
    await saveShot(page, name);
  }

  // Exercise real API-key creation and revocation from Settings; never include the plaintext key in screenshots.
  await page.goto(base + "/settings/api-keys");
  await page.getByRole("button", { name: "New key" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(names.apiKey);
  const createKeyWait = page.waitForResponse(r => r.url().endsWith(`/api/v1/projects/${project.id}/api-keys`) && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create key" }).click();
  const createKeyResponse = await createKeyWait;
  expect(createKeyResponse.status()).toBe(201);
  const createdKey = await createKeyResponse.json();
  expect(createdKey.key).toMatch(/^phc_/);
  await expect(page.getByTestId("api-key-value")).toHaveText(createdKey.key);
  await page.getByRole("button", { name: "Done" }).click();
  const keyRow = page.getByRole("row").filter({ hasText: names.apiKey });
  await expect(keyRow).toBeVisible();
  await keyRow.getByRole("button", { name: "Revoke" }).click();
  const revokeKeyWait = page.waitForResponse(r => r.url().includes(`/api/v1/projects/${project.id}/api-keys/`) && r.request().method() === "DELETE");
  await page.getByRole("dialog").getByRole("button", { name: "Revoke key" }).click();
  expect((await revokeKeyWait).status()).toBe(200);
  await expect(keyRow.getByText("Revoked", { exact: true })).toBeVisible();

  // The direct CSV export must also return an actual browser download.
  await page.goto(base + "/events");
  const [csvDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export CSV" }).click(),
  ]);
  expect(csvDownload.suggestedFilename()).toMatch(/events.*\.csv|\.csv$/);

  await page.getByRole("button", { name: "Account menu" }).click();
  const logoutWait = page.waitForResponse(r => r.url().endsWith("/api/v1/auth/logout") && r.request().method() === "POST");
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  expect((await logoutWait).status()).toBe(200);
  await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible({ timeout: 20000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("WrongPassword123");
  const badLoginWait = page.waitForResponse(r => r.url().includes("/api/v1/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await badLoginWait).status()).toBe(401);
  await expect(page.getByRole("alert")).toContainText("Incorrect email or password.");
  await saveShot(page, "22-invalid-login.png");
  await page.getByLabel("Password").fill(password);
  const goodLoginWait = page.waitForResponse(r => r.url().includes("/api/v1/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await goodLoginWait).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 20000 });

  for (const prefix of ["POST /api/v1/auth/register", "POST /api/v1/projects", "POST /api/v1/events/batch", "POST /api/v1/analytics/overview", "POST /api/v1/analytics/query", "POST /api/v1/reports", "POST /api/v1/cohorts", "POST /api/v1/dashboards", "PATCH /api/v1/dashboards/", "POST /api/v1/alerts", "POST /api/v1/auth/logout", "POST /api/v1/auth/login"]) {
    expect([...calls].some(call => call.startsWith(prefix)), prefix).toBeTruthy();
  }
  expect(errors).toEqual([]);
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync("test-results/e2e-state.json", JSON.stringify({
    email, project_id: String(project.id), expected_events: 4, project_name: updatedProjectName, retention_days: 90, revoked_key_name: names.apiKey,
    report_name: names.report, cohort_name: names.cohort, dashboard_name: names.dashboard, alert_name: names.alert,
  }, null, 2));
});
