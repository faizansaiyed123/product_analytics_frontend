import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { FilterBuilder } from "@/components/FilterBuilder";
import type { Filter } from "@/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { signedIn } from "./utils";

let latest: Filter[] = [];
function Harness() {
  const [f, setF] = useState<Filter[]>([]);
  latest = f;
  return <FilterBuilder projectId="p1" filters={f} onChange={setF} />;
}
const setup = () => { signedIn(); return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Harness /></QueryClientProvider>); };

describe("FilterBuilder", () => {
  it("builds a structured filter without any SQL", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /add filter/i }));
    const row = screen.getByTestId("filter-row");
    await userEvent.type(within(row).getByLabelText("Property name"), "amount");
    await userEvent.click(within(row).getByLabelText("Operator", { selector: "button" }));
    await userEvent.click(within(row).getByRole("option", { name: ">", exact: true }));
    await userEvent.type(within(row).getByLabelText("Filter value"), "50");
    expect(latest).toEqual([{ type: "event", property: "amount", operator: "gt", value: 50 }]);
  });

  it("supports user properties, list operators and operators with no value", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /add filter/i }));
    const row = screen.getByTestId("filter-row");
    await userEvent.click(within(row).getByLabelText("Property type", { selector: "button" }));
    await userEvent.click(within(row).getByRole("option", { name: "User", exact: true }));
    await userEvent.type(within(row).getByLabelText("Property name"), "plan");
    await userEvent.click(within(row).getByLabelText("Operator", { selector: "button" }));
    await userEvent.click(within(row).getByRole("option", { name: "is one of", exact: true }));
    await userEvent.type(within(row).getByLabelText("Filter value"), "pro, team");
    expect(latest[0]).toMatchObject({ type: "person", property: "plan", operator: "in", value: ["pro", "team"] });
    await userEvent.click(within(row).getByLabelText("Operator", { selector: "button" }));
    await userEvent.click(within(row).getByRole("option", { name: "is set", exact: true }));
    expect(within(row).queryByLabelText("Filter value")).not.toBeInTheDocument();
    expect(latest[0].type !== "cohort" && latest[0].value).toBeUndefined();
  });

  it("removes filters and is keyboard accessible", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /add filter/i }));
    await userEvent.click(screen.getByRole("button", { name: /add filter/i }));
    expect(screen.getAllByTestId("filter-row")).toHaveLength(2);
    screen.getAllByRole("button", { name: "Remove filter" })[0].focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getAllByTestId("filter-row")).toHaveLength(1);
  });
});
