import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "@/App";
import { server } from "./server";
import { API, ME, err, json, renderApp, signedIn, signedOut } from "./utils";

describe("authentication UI", () => {
  it("redirects anonymous visitors to the login page", async () => {
    signedOut();
    renderApp(<AppRoutes />, "/events");
    expect(await screen.findByRole("heading", { name: "Sign in to workspace" })).toBeInTheDocument();
  });

  it("validates the login form before calling the API", async () => {
    signedOut();
    let called = false;
    server.use(http.post(API("/auth/login"), () => { called = true; return json(ME); }));
    renderApp(<AppRoutes />, "/login");
    await userEvent.click(await screen.findByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("shows a friendly message for wrong credentials", async () => {
    signedOut();
    server.use(http.post(API("/auth/login"), () => err(401, "INVALID_CREDENTIALS", "Invalid email or password")));
    renderApp(<AppRoutes />, "/login");
    await userEvent.type(await screen.findByLabelText("Email address"), "a@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });

  it("logs in and lands on the workspace", async () => {
    signedOut();
    let body: any;
    server.use(
      http.post(API("/auth/login"), async ({ request }) => { body = await request.json(); signedIn(); return json(ME); }),
      http.post(API("/analytics/overview"), () => json({ kpis: { total_users: 0, active_users: 0, new_users: 0, total_events: 0, sessions: 0, events_per_user: 0, avg_session_duration_seconds: null }, previous_kpis: null, interval: "day", labels: [], event_volume: [], active_users_series: [], new_users_series: [], user_growth_series: [], top_events: [], top_pages: [], retention: { cohorts: [], average: [], offsets: [], interval: "day" } })),
    );
    renderApp(<AppRoutes />, "/login");
    await userEvent.type(await screen.findByLabelText("Email address"), " owner@example.com ");
    await userEvent.type(screen.getByLabelText("Password"), "Sup3rSecretPass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(body).toEqual({ email: "owner@example.com", password: "Sup3rSecretPass" });
  });

  it("enforces the password policy on registration and surfaces duplicate emails", async () => {
    signedOut();
    server.use(http.post(API("/auth/register"), () => err(409, "EMAIL_TAKEN", "exists")));
    renderApp(<AppRoutes />, "/register");
    await userEvent.type(await screen.findByLabelText("Email"), "dup@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "alllowercase1");
    await userEvent.type(screen.getByLabelText("Workspace name"), "Acme");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText(/Mix upper and lower case/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Password"));
    await userEvent.type(screen.getByLabelText("Password"), "GoodPassw0rdHere");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("An account with this email already exists."));
  });
});
