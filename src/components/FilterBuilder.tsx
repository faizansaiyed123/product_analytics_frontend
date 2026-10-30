import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { savedApi, exploreApi } from "@/services/endpoints";
import type { Filter, PropertyFilter } from "@/types";
import { OPERATORS, coerceValue, newFilter, opMeta } from "@/utils/filters";
import { Button } from "./ui/button";
import { Input, Select } from "./ui/input";

function ValueInput({
  projectId,
  f,
  onChange,
}: {
  projectId: string;
  f: PropertyFilter;
  onChange: (v: unknown) => void;
}) {
  const listId = useId();
  const meta = opMeta(f.operator);
  const { data } = useQuery({
    queryKey: ["prop-values", projectId, f.type, f.property],
    enabled: !!f.property && meta.needsValue && !meta.numeric,
    queryFn: () => exploreApi.propertyValues(projectId, f.property, f.type),
    staleTime: 60_000,
  });
  const fromValue = Array.isArray(f.value)
    ? f.value.join(", ")
    : f.value === undefined || f.value === null
      ? ""
      : String(f.value);
  // List values keep the raw text locally so typing "a, " is not rewritten to "a" on every keystroke.
  const [raw, setRaw] = useState(fromValue);
  useEffect(() => {
    if (JSON.stringify(coerceValue(f.operator, raw)) !== JSON.stringify(f.value)) setRaw(fromValue);
  }, [f.value, f.operator]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!meta.needsValue) return <span className="px-2 text-xs text-muted-foreground">no value needed</span>;
  const text = meta.list ? raw : fromValue;
  return (
    <>
      <Input
        aria-label="Filter value"
        list={listId}
        value={text}
        inputMode={meta.numeric ? "decimal" : undefined}
        placeholder={meta.list ? "a, b, c" : "value"}
        onChange={(e) => {
          setRaw(e.target.value);
          onChange(coerceValue(f.operator, e.target.value));
        }}
      />
      {!meta.list && (
        <datalist id={listId}>
          {(data ?? []).map((v) => (
            <option key={v.value} value={v.value} />
          ))}
        </datalist>
      )}
    </>
  );
}

export function FilterBuilder({
  projectId,
  filters,
  onChange,
  allowCohorts = true,
}: {
  projectId: string;
  filters: Filter[];
  onChange: (f: Filter[]) => void;
  allowCohorts?: boolean;
}) {
  const propsId = useId();
  const { data: eventProps } = useQuery({
    queryKey: ["props", projectId],
    queryFn: () => exploreApi.properties(projectId),
    staleTime: 60_000,
  });
  const { data: cohorts } = useQuery({
    queryKey: ["cohorts", projectId],
    queryFn: () => savedApi.cohorts(projectId),
    enabled: allowCohorts,
    staleTime: 60_000,
  });
  const set = (i: number, patch: Partial<PropertyFilter>) =>
    onChange(filters.map((f, j) => (j === i && f.type !== "cohort" ? { ...f, ...patch } : f)));

  return (
    <div className="space-y-2" role="group" aria-label="Filters">
      <datalist id={propsId}>
        {(eventProps ?? []).map((p) => (
          <option key={`${p.kind}:${p.name}`} value={p.name}>
            {p.kind}
          </option>
        ))}
      </datalist>
      {filters.map((f, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2" data-testid="filter-row">
          {f.type === "cohort" ? (
            <>
              <Select
                aria-label="Cohort membership"
                className="w-32"
                value={f.negate ? "not" : "in"}
                onChange={(e) =>
                  onChange(filters.map((x, j) => (j === i ? { ...f, negate: e.target.value === "not" } : x)))
                }
              >
                <option value="in">In cohort</option>
                <option value="not">Not in cohort</option>
              </Select>
              <Select
                aria-label="Cohort"
                className="w-56"
                value={f.cohort_id}
                onChange={(e) => onChange(filters.map((x, j) => (j === i ? { ...f, cohort_id: e.target.value } : x)))}
              >
                <option value="">Select cohort…</option>
                {(cohorts ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </>
          ) : (
            <>
              <Select
                aria-label="Property type"
                className="w-28"
                value={f.type}
                onChange={(e) => set(i, { type: e.target.value as "event" | "person" })}
              >
                <option value="event">Event</option>
                <option value="person">User</option>
              </Select>
              <Input
                aria-label="Property name"
                className="w-44"
                list={propsId}
                value={f.property}
                placeholder="property"
                onChange={(e) => set(i, { property: e.target.value })}
              />
              <Select
                aria-label="Operator"
                className="w-36"
                value={f.operator}
                onChange={(e) => {
                  const op = e.target.value as PropertyFilter["operator"];
                  set(i, {
                    operator: op,
                    value: opMeta(op).needsValue
                      ? coerceValue(op, Array.isArray(f.value) ? f.value.join(",") : String(f.value ?? ""))
                      : undefined,
                  });
                }}
              >
                {OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <div className="min-w-[10rem] flex-1">
                <ValueInput projectId={projectId} f={f} onChange={(v) => set(i, { value: v })} />
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove filter"
            onClick={() => onChange(filters.filter((_, j) => j !== i))}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onChange([...filters, newFilter()])}>
          <Plus className="h-3.5 w-3.5" />
          Add filter
        </Button>
        {allowCohorts && (cohorts?.length ?? 0) > 0 && (
          <Button size="sm" onClick={() => onChange([...filters, { type: "cohort", cohort_id: "", negate: false }])}>
            <Plus className="h-3.5 w-3.5" />
            Cohort filter
          </Button>
        )}
      </div>
    </div>
  );
}
