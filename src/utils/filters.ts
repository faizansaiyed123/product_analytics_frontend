import type { Filter, Operator, PropertyFilter } from "@/types";

export const OPERATORS: { value: Operator; label: string; needsValue: boolean; numeric?: boolean; list?: boolean }[] = [
  { value: "equals", label: "is", needsValue: true }, { value: "not_equals", label: "is not", needsValue: true },
  { value: "contains", label: "contains", needsValue: true }, { value: "not_contains", label: "does not contain", needsValue: true },
  { value: "gt", label: ">", needsValue: true, numeric: true }, { value: "gte", label: "≥", needsValue: true, numeric: true },
  { value: "lt", label: "<", needsValue: true, numeric: true }, { value: "lte", label: "≤", needsValue: true, numeric: true },
  { value: "in", label: "is one of", needsValue: true, list: true }, { value: "not_in", label: "is none of", needsValue: true, list: true },
  { value: "is_set", label: "is set", needsValue: false }, { value: "is_not_set", label: "is not set", needsValue: false },
];
export const opMeta = (op: Operator) => OPERATORS.find((o) => o.value === op)!;

/** Parse the text the user typed into the value type the backend expects. */
export function coerceValue(op: Operator, raw: string): unknown {
  const meta = opMeta(op);
  if (!meta.needsValue) return undefined;
  if (meta.list) return raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (meta.numeric) return raw.trim() === "" ? raw : Number(raw);
  return raw;
}

export function isComplete(f: Filter): boolean {
  if (f.type === "cohort") return !!f.cohort_id;
  if (!f.property.trim()) return false;
  const m = opMeta(f.operator);
  if (!m.needsValue) return true;
  if (m.list) return Array.isArray(f.value) && f.value.length > 0;
  if (m.numeric) return typeof f.value === "number" && Number.isFinite(f.value);
  return f.value !== undefined && f.value !== "";
}

/** Only complete filters are sent to the API (an unfinished row in the builder must not break a query). */
export const activeFilters = (fs: Filter[]): Filter[] => fs.filter(isComplete);

export function describeFilter(f: Filter): string {
  if (f.type === "cohort") return `${f.negate ? "not in" : "in"} cohort`;
  const m = opMeta(f.operator);
  const v = Array.isArray(f.value) ? f.value.join(", ") : String(f.value ?? "");
  return `${f.property} ${m.label}${m.needsValue ? " " + v : ""}`;
}

export const newFilter = (type: PropertyFilter["type"] = "event"): PropertyFilter => ({ type, property: "", operator: "equals", value: "" });
