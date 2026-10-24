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

test("event details, erasure, key rotation, alerts and team invites", async ({ page }) => {
  test.setTimeout(120_000);
  const calls = new Set<string>();
  const errors: string[] = [];
  page.on("request", r => {
    if (r.url().includes("/api/v1/")) calls.add(r.method() + " " + new URL(r.url()).pathname);
  });
  page.on("response", r => {
    if (r.url().includes("/api/v1/") && r.status() >= 500) errors.push(r.status() + " " + r.url());
  });

  const email = "qa-secondary-" + Date.now() + "@example.com";
  const inviteEmail = "qa-invite-" + Date.now() + "@example.com";
  const password = "StrongE2EPassword123";
  const projectName = "Privacy and Admin E2E Project";
  const rotationKeyName = "E2E Rotation Test Key";
  const alertName = "E2E Rotated Key Alert";
  const erasedDistinctId = "qa-privacy-person-" + Date.now();

  await page.goto(base + "/register");
  await page.getByLabel("Your name").fill("Privacy E2E Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("Workspace name").fill("Privacy E2E Workspace");
  const registerWait = page.waitForResponse(r => r.url().endsWith("/api/v1/auth/register") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create account" }).click();
  expect((await registerWait).status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Create your first project" })).toBeVisible();

  await page.getByLabel("Project name").fill(projectName);
  const projectWait = page.waitForResponse(r => r.url().endsWith("/api/v1/projects") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create project" }).click();
  const projectResponse = await projectWait;
  expect(projectResponse.status()).toBe(201);
  const project = await projectResponse.json();
  const initialKey = (await page.getByTestId("api-key-value").innerText()).trim();
  expect(initialKey).toMatch(/^phc_/);
  await page.getByRole("button", { name: "Continue to workspace" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 20000 });

  // Ingest real events so detail and person pages consume actual persisted records.
  const now = Date.now();
  const events = [
    { event: "privacy_purchase", distinct_id: erasedDistinctId, uuid: "e2e-privacy-purchase-" + now, timestamp: new Date(now - 120000).toISOString(), properties: { amount: 42, source: "e2e-detail" }, context: { country: "IN", browser: "Chromium", device_type: "desktop" } },
    { event: "privacy_login", distinct_id: erasedDistinctId, uuid: "e2e-privacy-login-" + now, timestamp: new Date(now - 60000).toISOString(), properties: { source: "e2e-detail" }, context: { country: "IN", browser: "Chromium", device_type: "desktop" } },
  ];
  const ingested = await page.evaluate(async ({ apiKey, events }) => {
    const r = await fetch("/api/v1/events/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, events }),
    });
    return { status: r.status, body: await r.json() };
  }, { apiKey: initialKey, events });
  expect(ingested.status).toBe(200);
  expect(ingested.body.accepted).toBe(2);

  await page.goto(base + "/events");
  const eventRow = page.getByRole("button", { name: "Inspect privacy_purchase event" });
  await expect(eventRow).toBeVisible({ timeout: 20000 });
  await eventRow.click();
  const eventDialog = page.getByRole("dialog");
  await expect(eventDialog.getByRole("heading", { name: "privacy_purchase" })).toBeVisible();
  await expect(eventDialog.getByText(/"amount": 42/)).toBeVisible();
  await expect(eventDialog.getByRole("link", { name: erasedDistinctId, exact: true })).toBeVisible();
  await saveShot(page, "29-event-detail.png");

  const detailWait = page.waitForResponse(r => r.url().includes("/api/v1/events/") && r.request().method() === "GET");
  await eventDialog.getByRole("link", { name: erasedDistinctId, exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/users\//);
  const detailResponse = await detailWait;
  expect(detailResponse.status()).toBe(200);
  await expect(page.getByRole("heading", { name: erasedDistinctId })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("privacy_purchase", { exact: true })).toBeVisible();
  const personId = new URL(page.url()).pathname.split("/").pop()!;
  await saveShot(page, "30-user-detail.png");

  await page.getByRole("button", { name: "Delete user data" }).click();
  await expect(page.getByRole("heading", { name: "Delete this user's data?" })).toBeVisible();
  const eraseWait = page.waitForResponse(r => r.url().endsWith("/api/v1/projects/" + project.id + "/persons/" + personId) && r.request().method() === "DELETE");
  await page.getByRole("dialog").getByRole("button", { name: "Delete permanently" }).click();
  expect((await eraseWait).status()).toBe(200);
  await expect(page.getByText("User and their events were deleted")).toBeVisible();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/users");
  await saveShot(page, "34-person-erasure-result.png");

  // Rotate a second key using the settings UI; the replaced secret must immediately stop ingesting.
  await page.goto(base + "/settings/api-keys");
  await page.getByRole("button", { name: "New key" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(rotationKeyName);
  const createKeyWait = page.waitForResponse(r => r.url().endsWith("/api/v1/projects/" + project.id + "/api-keys") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create key" }).click();
  expect((await createKeyWait).status()).toBe(201);
  const oldRotationKey = (await page.getByTestId("api-key-value").innerText()).trim();
  expect(oldRotationKey).toMatch(/^phc_/);
  await page.getByRole("button", { name: "Done" }).click();

  const rotationRow = page.getByRole("row").filter({ hasText: rotationKeyName }).first();
  await expect(rotationRow).toBeVisible();
  await rotationRow.getByRole("button", { name: "Rotate" }).click();
  await expect(page.getByRole("heading", { name: "Rotate API key?" })).toBeVisible();
  const rotationWait = page.waitForResponse(r => r.url().includes("/api/v1/projects/" + project.id + "/api-keys/") && r.url().endsWith("/rotate") && r.request().method() === "POST");
  await page.getByRole("dialog").getByRole("button", { name: "Rotate key" }).click();
  const rotatedResponse = await rotationWait;
  expect(rotatedResponse.status()).toBe(201);
  const newRotationKey = (await rotatedResponse.json()).key as string;
  expect(newRotationKey).toMatch(/^phc_/);
  await expect(page.getByTestId("api-key-value")).toHaveText(newRotationKey);
  await saveShot(page, "31-key-rotation.png");
  await page.getByRole("button", { name: "Done" }).click();

  const probeEvent = { event: "rotation_probe", distinct_id: "rotation-key-smoke-" + now, uuid: "e2e-rotation-probe-" + now, timestamp: new Date().toISOString(), properties: { source: "rotated-key" } };
  const rejectedOldKey = await page.evaluate(async ({ apiKey, event }) => {
    const r = await fetch("/api/v1/events/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ events: [event] }),
    });
    return { status: r.status, body: await r.json() };
  }, { apiKey: oldRotationKey, event: probeEvent });
  expect(rejectedOldKey.status).toBe(401);
  const acceptedNewKey = await page.evaluate(async ({ apiKey, event }) => {
    const r = await fetch("/api/v1/events/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ events: [event] }),
    });
    return { status: r.status, body: await r.json() };
  }, { apiKey: newRotationKey, event: probeEvent });
  expect(acceptedNewKey.status).toBe(200);
  expect(acceptedNewKey.body.accepted).toBe(1);

  // Evaluate an alert against that real event; a firing transition must create a notification and mark-read must persist.
  await page.goto(base + "/settings/alerts");
  await page.getByRole("button", { name: "New alert" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(alertName);
  await page.getByRole("dialog").getByLabel("Event", { exact: true }).fill("rotation_probe");
  await page.getByRole("dialog").getByLabel("Threshold").fill("10000");
  const createAlertWait = page.waitForResponse(r => r.url().endsWith("/api/v1/alerts") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create alert" }).click();
  const alertResponse = await createAlertWait;
  expect(alertResponse.status()).toBe(201);
  const alert = await alertResponse.json();
  const alertRow = page.getByRole("row").filter({ hasText: alertName });
  await expect(alertRow).toBeVisible();
  const evaluateAlertWait = page.waitForResponse(r => r.url().endsWith("/api/v1/alerts/" + alert.id + "/evaluate") && r.request().method() === "POST");
  await alertRow.getByRole("button", { name: "Evaluate now" }).click();
  expect((await evaluateAlertWait).status()).toBe(200);

  const notificationButton = page.getByRole("button", { name: /Notifications/ });
  await expect.poll(async () => (await notificationButton.getAttribute("aria-label")) || "").toContain("unread");
  await notificationButton.click();
  await expect(page.getByText("Alert: " + alertName, { exact: true })).toBeVisible();
  await saveShot(page, "32-alert-notification.png");
  const markReadWait = page.waitForResponse(r => r.url().endsWith("/api/v1/notifications/read") && r.request().method() === "POST");
  await page.getByRole("menuitem", { name: "Mark all as read" }).click();
  expect((await markReadWait).status()).toBe(200);
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();

  // Create and then revoke a real organization invite through the team settings UI.
  await page.goto(base + "/settings/team");
  await page.getByRole("button", { name: "Add member" }).click();
  await page.getByRole("dialog").getByLabel("Email").fill(inviteEmail);
  await page.getByRole("dialog").getByLabel("Role", { selector: "button" }).click();
  await page.getByRole("option", { name: "viewer", exact: true }).click();
  const inviteWait = page.waitForResponse(r => r.url().endsWith("/api/v1/organizations/" + project.org_id + "/members") && r.request().method() === "POST");
  await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
  const inviteResponse = await inviteWait;
  expect(inviteResponse.status()).toBe(201);
  const invite = await inviteResponse.json();
  expect(invite.status).toBe("invited");
  const inviteRow = page.getByRole("row").filter({ hasText: inviteEmail });
  await expect(inviteRow).toBeVisible();
  await saveShot(page, "33-team-invitations.png");
  const revokeInviteWait = page.waitForResponse(r => r.url().endsWith("/api/v1/organizations/" + project.org_id + "/invitations/" + invite.invitation.id) && r.request().method() === "DELETE");
  await inviteRow.getByRole("button", { name: "Revoke" }).click();
  expect((await revokeInviteWait).status()).toBe(200);
  await expect(inviteRow).toHaveCount(0);

  for (const prefix of [
    "POST /api/v1/auth/register",
    "POST /api/v1/projects",
    "POST /api/v1/events/batch",
    "GET /api/v1/events/",
    "GET /api/v1/users/",
    "DELETE /api/v1/projects/",
    "POST /api/v1/projects/",
    "POST /api/v1/alerts",
    "POST /api/v1/alerts/",
    "POST /api/v1/notifications/read",
    "POST /api/v1/organizations/",
    "DELETE /api/v1/organizations/",
  ]) {
    expect([...calls].some(call => call.startsWith(prefix)), prefix).toBeTruthy();
  }
  expect(errors).toEqual([]);
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync("test-results/e2e-secondary-state.json", JSON.stringify({
    email,
    org_id: String(project.org_id),
    project_id: String(project.id),
    project_name: projectName,
    erased_distinct_id: erasedDistinctId,
    rotation_key_name: rotationKeyName,
    rotation_probe_distinct_id: probeEvent.distinct_id,
    invite_email: inviteEmail,
    alert_name: alertName,
  }, null, 2));
});
