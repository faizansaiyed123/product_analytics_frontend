import { describe, expect, it } from "vitest";
import { demoRequest } from "@/demo/runtime";

describe("demo runtime", () => {
  it("starts with a usable authenticated workspace", async () => {
    const me = await demoRequest<any>("/auth/me");
    expect(me.user.email).toBe("demo@analytics.local");
    expect(me.organizations[0].role).toBe("owner");
    const projects = await demoRequest<any>("/projects");
    expect(projects[0].name).toBe("Acme Web App");
  });

  it("returns realistic analytics payloads", async () => {
    const result = await demoRequest<any>("/analytics/query", {
      method: "POST",
      body: {
        project_id: "project-demo-0001",
        query: { type: "trend", series: [{ event: "Started Trial" }], metric: "unique_users", date_range: { preset: "last_30_days" }, interval: "day", filters: [] },
      },
    });
    expect(result.query_type).toBe("trend");
    expect(result.result.series[0].event).toBe("Started Trial");
    expect(result.result.labels.length).toBe(14);
  });

  it("keeps mutations stateful inside the demo session", async () => {
    const before = await demoRequest<any>("/reports", { params: { project_id: "project-demo-0001" } });
    const created = await demoRequest<any>("/reports", {
      method: "POST",
      body: {
        project_id: "project-demo-0001",
        name: "Demo saved report",
        description: "Created during the demo",
        query: { type: "trend", series: [{ event: "$pageview" }], metric: "total_events", date_range: { preset: "last_7_days" }, interval: "day", filters: [] },
        visualization: { chart: "line" },
      },
    });
    const after = await demoRequest<any>("/reports", { params: { project_id: "project-demo-0001" } });
    expect(after.length).toBe(before.length + 1);
    expect(after[0].id).toBe(created.id);
  });
});