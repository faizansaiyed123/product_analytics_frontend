import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const base = "http://127.0.0.1:5173";
const visuals = path.resolve("docs/testing/visuals");
fs.mkdirSync(visuals, { recursive: true });

async function screenshot(page: import("@playwright/test").Page, name: string) {
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(visuals, name), fullPage: true, animations: "disabled" });
}

test("real UI -> FastAPI -> PostgreSQL product journey", async ({ page }) => {
  const calls = new Set<string>();
  const serverErrors: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/")) calls.add(r.method() + " " + new URL(r.url()).pathname);
  });
  page.on("response", (r) => {
    if (r.url().includes("/api/v1/") && r.status() >= 500) serverErrors.push(r.status() + " " + r.url());
  });

  const email = `qa-${Date.now()}@example.com`;
  const password = "StrongE2EPassword123";
  const names = { report: "E2E Purchase Trend", cohort: "E2E Purchase Cohort", dashboard: "E2E Analytics Dashboard", alert: "E2E Purchase Alert" };

  await page.goto(base + "/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await screenshot(page, "00-login.png");

  await page.goto(base + "/register");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await screenshot(page, "01-register.png");
  await page.getByLabel("Your name").fill("Full Stack Test Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("Workspace name").fill("E2E Test Workspace");
  const registerWait = page.waitForResponse(r => r.url().includes("/api/v1/auth/register") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create account" }).click();
  expect((await registerWait).status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Create your first project" })).toBeVisible();
  await screenshot(page, "02-first-project.png");

  await page.getByLabel("Project name").fill("Full Stack Test Project");
  const projectWait = page.waitForResponse(r => r.url().endsWith("/api/v1/projects") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create project" }).click();
  const projectResponse = await projectWait;
  expect(projectResponse.status()).toBe(201);
  const project = await projectResponse.json();
  const apiKey = (await page.getByTestId("api-key-value").innerText()).trim();
  expect(apiKey).toMatch(/^phc_/);
  // The one-time secret is never captured into committed screenshots.
  await page.getByTestId("api-key-value").evaluate(node => { node.textContent = "phc_TEST_KEY_REDACTED"; });
  await screenshot(page, "03-api-key-redacted.png");
  await page.getByRole("button", { name: "Continue to workspace" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 20_000 });

  // These are isolated test events sent through the real public ingestion endpoint, not mocked responses.
  const now = Date.now();
  const event = (name: string, distinct_id: string, uuid: string, minutes: number, properties: object) => ({
    event: name, distinct_id, uuid, timestamp: new Date(now - minutes * 60_000).toISOString(), properties,
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

  await page.goto(base + "/insights/trends");
  const queryWait = page.waitForResponse(r => r.url().includes("/api/v1/analytics/query") && r.request().method() === "POST");
  const queryResponse = await queryWait;
  expect(queryResponse.ok()).toBeTruthy();
  await expect(page.getByRole("button", { name: "Save as report" })).toBeEnabled({ timeout: 20_000 });
  await screenshot(page, "04-trends.png");
  await page.getByRole("button", { name: "Save as report" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(names.report);
  const reportWait = page.waitForResponse(r => r.url().endsWith("/api/v1/reports") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Save report" }).click();
  expect((await reportWait).status()).toBe(201);
  await expect(page.getByText("Report saved")).toBeVisible();

  await page.goto(base + "/insights/cohorts");
  await page.getByRole("button", { name: "New cohort" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(names.cohort);
  await page.getByRole("dialog").getByLabel("Event", { exact: true }).fill("purchase_completed");
  const cohortWait = page.waitForResponse(r => r.url().endsWith("/api/v1/cohorts") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Save cohort" }).click();
  expect((await cohortWait).status()).toBe(201);
  await expect(page.getByText(names.cohort)).toBeVisible();

  await page.goto(base + "/dashboards");
  await page.getByRole("button", { name: "New dashboard" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(names.dashboard);
  const dashWait = page.waitForResponse(r => r.url().endsWith("/api/v1/dashboards") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  expect((await dashWait).status()).toBe(201);
  await expect(page.getByRole("heading", { name: names.dashboard })).toBeVisible();
  await page.getByRole("button", { name: "Add widget" }).click();
  await page.getByRole("dialog").getByLabel("Report").selectOption({ label: names.report + " (trend)" });
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
  expect((await alertWait).status()).toBe(201);
  await expect(page.getByText(names.alert)).toBeVisible();
