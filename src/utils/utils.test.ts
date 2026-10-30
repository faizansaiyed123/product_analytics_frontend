import { describe, expect, it } from "vitest";
import { pickInterval, rangeLabel } from "./dates";
import { activeFilters, coerceValue, describeFilter, isComplete, newFilter } from "./filters";
import { bucketLabel, fmtCompact, fmtDuration, fmtPct, pctChange } from "./format";

describe("format", () => {
  it("formats durations", () => {
    expect(fmtDuration(45)).toBe("45s");
    expect(fmtDuration(125)).toBe("2m 5s");
    expect(fmtDuration(7260)).toBe("2h 1m");
    expect(fmtDuration(null)).toBe("–");
  });
  it("formats percentages and compact numbers", () => {
    expect(fmtPct(0.2134)).toBe("21.3%");
    expect(fmtPct(null)).toBe("–");
    expect(fmtCompact(12_500)).toBe("12.5K");
    expect(fmtCompact(42)).toBe("42");
  });
  it("computes change vs previous and never divides by zero", () => {
    expect(pctChange(150, 100)).toBe(0.5);
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(5, null)).toBeNull();
  });
  it("shortens bucket labels", () => {
    expect(bucketLabel("2026-08-03", "day")).toBe("08-03");
    expect(bucketLabel("2026-08-03T10:00", "hour")).toBe("08-03 10:00");
    expect(bucketLabel("2026-08-01", "month")).toBe("2026-08");
  });
});

describe("filters", () => {
  it("coerces values by operator", () => {
    expect(coerceValue("gt", "50")).toBe(50);
    expect(coerceValue("in", "a, b ,c")).toEqual(["a", "b", "c"]);
    expect(coerceValue("equals", "pro")).toBe("pro");
    expect(coerceValue("is_set", "x")).toBeUndefined();
  });
  it("knows when a filter is complete and only sends complete ones", () => {
    const empty = newFilter();
    const good = { ...newFilter(), property: "plan", value: "pro" };
    expect(isComplete(empty)).toBe(false);
    expect(isComplete(good)).toBe(true);
    expect(isComplete({ ...good, operator: "gt", value: "abc" as unknown as number })).toBe(false);
    expect(isComplete({ ...good, operator: "is_set", value: undefined })).toBe(true);
    expect(isComplete({ ...good, operator: "in", value: [] })).toBe(false);
    expect(isComplete({ type: "cohort", cohort_id: "" })).toBe(false);
    expect(activeFilters([empty, good])).toEqual([good]);
  });
  it("describes filters for humans", () => {
    expect(describeFilter({ ...newFilter(), property: "plan", operator: "not_equals", value: "free" })).toBe(
      "plan is not free",
    );
  });
});

describe("dates", () => {
  it("labels ranges", () => {
    expect(rangeLabel({ preset: "last_30_days" })).toBe("Last 30 days");
    expect(rangeLabel({ from: "2026-08-01", to: "2026-08-09" })).toBe("2026-08-01 → 2026-08-09");
  });
  it("picks sensible intervals", () => {
    expect(pickInterval({ preset: "today" })).toBe("hour");
    expect(pickInterval({ preset: "last_30_days" })).toBe("day");
    expect(pickInterval({ from: "2025-01-01", to: "2026-01-01" })).toBe("week");
  });
});
