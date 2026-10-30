import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "@/App";
import { RetentionHeatmap } from "@/components/charts/Heatmap";
import { useUI } from "@/stores/ui";
import { render } from "@testing-library/react";
import { server } from "./server";
import { API, err, json, renderApp, signedIn } from "./utils";

const trendResult = (total = 6) => ({
  query_type: "trend",
  cached: false,
  computed_at: new Date().toISOString(),
  duration_ms: 12,
  result: {
    type: "trend",
    kind: "time_series",
    interval: "day",
    labels: ["2026-08-03", "2026-08-04"],
    series: [{ label: "purchase", event: "purchase", breakdown_value: null, data: [4, 2], total }],
    date_from: "",
    date_to: "",
    timezone: "UTC",
  },
});

describe("Trends page", () => {
  it("sends a structured query, renders results and supports the table view", async () => {
    signedIn();
    useUI.getState().setDateRange({ from: "2026-08-03", to: "2026-08-09" });
    const bodies: any[] = [];
    server.use(
      http.post(API("/analytics/query"), async ({ request }) => {
        bodies.push(await request.json());
        return json(trendResult());
      }),
    );
    renderApp(<AppRoutes />, "/insights/trends");
    const ev = await screen.findByLabelText("Event 1");
    await userEvent.clear(ev);
    await userEvent.type(ev, "purchase");
    await userEvent.click(screen.getByLabelText("Metric", { selector: "button" }));
    await userEvent.click(screen.getByRole("option", { name: "Unique users" }));
    await waitFor(() =>
      expect(bodies.at(-1)?.query).toMatchObject({
        type: "trend",
        metric: "unique_users",
        series: [{ event: "purchase" }],
        date_range: { from: "2026-08-03", to: "2026-08-09" },
        interval: "day",
      }),
    );
    expect(bodies.at(-1).project_id).toBe("p1");
    expect(await screen.findByRole("img", { name: /chart of purchase/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "table chart" }));
    const table = await screen.findByRole("table");
    expect(within(table).getByText("2026-08-03")).toBeInTheDocument();
    expect(within(table).getByText("Total")).toBeInTheDocument();
  });

  it("only sends complete filters and a property for value metrics", async () => {
    signedIn();
    const bodies: any[] = [];
    server.use(
      http.post(API("/analytics/query"), async ({ request }) => {
        bodies.push(await request.json());
        return json(trendResult());
      }),
    );
    renderApp(<AppRoutes />, "/insights/trends");
    await screen.findByLabelText("Event 1");
    await userEvent.click(screen.getByRole("button", { name: /add filter/i })); // incomplete row
    await userEvent.click(screen.getByLabelText("Metric", { selector: "button" }));
    await userEvent.click(screen.getByRole("option", { name: "Sum of property" }));
    expect(await screen.findByText("Required for this metric")).toBeInTheDocument();
    expect(screen.getByText("Finish setting up the query")).toBeInTheDocument();
    const before = bodies.length;
    await userEvent.type(screen.getByPlaceholderText("e.g. amount"), "amount");
    await waitFor(() => expect(bodies.length).toBeGreaterThan(before));
    expect(bodies.at(-1).query).toMatchObject({ metric: "sum", metric_property: "amount", filters: [] });
  });

  it("shows an empty state and an error state with retry", async () => {
    signedIn();
    let fail = true;
    server.use(
      http.post(API("/analytics/query"), () =>
        fail
          ? err(500, "INTERNAL_ERROR", "boom")
          : json({
              ...trendResult(0),
              result: {
                ...trendResult(0).result,
                series: [{ label: "x", event: "x", breakdown_value: null, data: [0, 0], total: 0 }],
              },
            }),
      ),
    );
    renderApp(<AppRoutes />, "/insights/trends");
    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No data")).toBeInTheDocument();
  });
});

describe("Funnels page", () => {
  const funnel = {
    query_type: "funnel",
    cached: false,
    computed_at: new Date().toISOString(),
    duration_ms: 5,
    result: {
      type: "funnel",
      overall_conversion_rate: 0.21,
      conversion_window_seconds: 86400,
      date_from: "",
      date_to: "",
      timezone: "UTC",
      steps: [
        {
          order: 1,
          event: "Signup Started",
          label: "Signup Started",
          count: 10000,
          conversion_rate: null,
          dropoff_count: 0,
          dropoff_rate: 0,
          overall_conversion_rate: 1,
          avg_time_to_convert_seconds: null,
          median_time_to_convert_seconds: null,
        },
        {
          order: 2,
          event: "Signup Completed",
          label: "Signup Completed",
          count: 6500,
          conversion_rate: 0.65,
          dropoff_count: 3500,
          dropoff_rate: 0.35,
          overall_conversion_rate: 0.65,
          avg_time_to_convert_seconds: 120,
          median_time_to_convert_seconds: 90,
        },
        {
          order: 3,
          event: "Purchase",
          label: "Purchase",
          count: 2100,
          conversion_rate: 0.323,
          dropoff_count: 4400,
          dropoff_rate: 0.677,
          overall_conversion_rate: 0.21,
          avg_time_to_convert_seconds: 3600,
          median_time_to_convert_seconds: 1800,
        },
      ],
    },
  };

  it("requires every step before querying, then shows counts, conversion and drop-off", async () => {
    signedIn();
    const bodies: any[] = [];
    server.use(
      http.post(API("/analytics/query"), async ({ request }) => {
        bodies.push(await request.json());
        return json(funnel);
      }),
    );
    renderApp(<AppRoutes />, "/insights/funnels");
    await screen.findByLabelText("Step 1 event");
    expect(screen.getByText("Finish setting up the query")).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
    await userEvent.type(screen.getByLabelText("Step 2 event"), "purchase");
    expect(await screen.findByTestId("overall-conversion")).toHaveTextContent("21.0%");
    expect(screen.getByText("10,000")).toBeInTheDocument();
    expect(screen.getByText("6,500")).toBeInTheDocument();
    expect(screen.getByText(/3,500 \(35.0%\)/)).toBeInTheDocument();
    expect(bodies.at(-1).query).toMatchObject({
      type: "funnel",
      steps: [{ event: "$pageview" }, { event: "purchase" }],
      conversion_window: { value: 14, unit: "day" },
    });
  });

  it("adds and removes steps (min 2)", async () => {
    signedIn();
    server.use(http.post(API("/analytics/query"), () => json(funnel)));
    renderApp(<AppRoutes />, "/insights/funnels");
    await screen.findByLabelText("Step 1 event");
    expect(screen.queryByRole("button", { name: /remove step/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /add step/i }));
    expect(screen.getByLabelText("Step 3 event")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove step 3" }));
    expect(screen.queryByLabelText("Step 3 event")).not.toBeInTheDocument();
  });
});

describe("Retention heatmap", () => {
  it("renders percentages, averages and marks future periods as unavailable", () => {
    render(
      <RetentionHeatmap
        interval="day"
        result={{
          type: "retention",
          interval: "day",
          offsets: [0, 1, 7],
          date_from: "",
          date_to: "",
          timezone: "UTC",
          cohorts: [
            {
              period: "2026-08-03",
              size: 100,
              cells: [
                { offset: 0, count: 100, rate: 1 },
                { offset: 1, count: 42, rate: 0.42 },
                { offset: 7, count: null, rate: null },
              ],
            },
          ],
          average: [
            { offset: 0, count: 100, rate: 1 },
            { offset: 1, count: 42, rate: 0.42 },
            { offset: 7, count: null, rate: null },
          ],
        }}
      />,
    );
    const table = screen.getByRole("table", { name: "Retention heatmap" });
    expect(within(table).getByText("Day 7")).toBeInTheDocument();
    expect(within(table).getAllByText("42%").length).toBe(2);
    expect(within(table).getAllByText("–").length).toBe(2);
    expect(within(table).getByTitle("42 of 100 users")).toBeInTheDocument();
    expect(within(table).getAllByTitle("Period has not happened yet")).toHaveLength(1);
  });
});
