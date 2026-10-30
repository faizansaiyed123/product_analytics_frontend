import { Plus, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChartToolbar } from "@/components/ChartToolbar";
import { DistributionChart, TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { EventPicker } from "@/components/EventPicker";
import { ExportMenu } from "@/components/ExportMenu";
import { FilterBuilder } from "@/components/FilterBuilder";
import { InsightResult } from "@/components/InsightResult";
import { SaveReportDialog } from "@/components/SaveReportDialog";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { useInsight } from "@/hooks/useInsight";
import { useRange } from "@/hooks/useRange";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { savedApi } from "@/services/endpoints";
import type { ChartType, Filter, Interval, Metric, Report, TrendQuery, TrendResult } from "@/types";
import { pickInterval } from "@/utils/dates";
import { activeFilters } from "@/utils/filters";
import { useQuery } from "@tanstack/react-query";

const METRICS: [Metric, string][] = [
  ["total_events", "Total events"],
  ["unique_users", "Unique users"],
  ["avg_events_per_user", "Average events per user"],
  ["frequency", "Frequency (users by times performed)"],
  ["sum", "Sum of property"],
  ["avg", "Average of property"],
  ["min", "Min of property"],
  ["max", "Max of property"],
  ["median", "Median of property"],
  ["p90", "90th percentile of property"],
];
const VALUE_METRICS = ["sum", "avg", "min", "max", "median", "p90"];
export const TREND_BREAKDOWN_BUILTINS = ["$country", "$browser", "$os", "$device_type"];

export function TrendsPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();
  const [sp] = useSearchParams();
  const reportId = sp.get("report");
  const [events, setEvents] = useState<string[]>(["$pageview"]);
  const [metric, setMetric] = useState<Metric>("total_events");
  const [metricProp, setMetricProp] = useState("");
  const [interval, setInterval] = useState<Interval>(pickInterval(date_range));
  const [chart, setChart] = useState<ChartType>("line");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [bType, setBType] = useState<"event" | "person">("event");
  const [bProp, setBProp] = useState("");
  const [compare, setCompare] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [existing, setExisting] = useState<Report | null>(null);
  const loaded = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => savedApi.report(reportId!),
    enabled: !!reportId,
  });
  useEffect(() => {
    const r = loaded.data;
    if (r && r.query.type === "trend") {
      const q = r.query;
      setExisting(r);
      setEvents(q.series.map((s) => s.event));
      setMetric(q.metric);
      setMetricProp(q.metric_property ?? "");
      setInterval(q.interval);
      setFilters(q.filters);
      setBProp(q.breakdown?.property ?? "");
      setBType(q.breakdown?.type ?? "event");
      setCompare(!!q.compare_previous);
      if (r.visualization.chart) setChart(r.visualization.chart);
    }
  }, [loaded.data]);
  const ready = events.every((e) => e.trim()) && (!VALUE_METRICS.includes(metric) || !!metricProp.trim());
  const query = useMemo<TrendQuery>(
    () => ({
      type: "trend",
      series: events.filter(Boolean).map((e) => ({ event: e })),
      metric,
      metric_property: VALUE_METRICS.includes(metric) ? metricProp : null,
      date_range,
      interval,
      filters: activeFilters(filters),
      breakdown: bProp && events.length === 1 ? { type: bType, property: bProp, limit: 10 } : null,
      timezone,
      compare_previous: compare && metric !== "frequency",
    }),
    [events, metric, metricProp, date_range, interval, filters, bProp, bType, timezone, compare],
  );
  const q = useInsight<TrendResult>(project.id, query, ready);
  return (
    <>
      <PageHeader
        title={existing ? existing.name : "Trends"}
        description="How often events happen over time."
        actions={
          <>
            <ExportMenu projectId={project.id} query={query} disabled={!ready} />
            <Button variant="primary" disabled={!ready} onClick={() => setSaveOpen(true)}>
              <Save className="h-4 w-4" />
              {existing ? "Update report" : "Save as report"}
            </Button>
          </>
        }
      />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <div className="space-y-2">
            {events.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                <div className="max-w-sm flex-1">
                  <EventPicker
                    projectId={project.id}
                    value={e}
                    allowAll
                    label={`Event ${i + 1}`}
                    onChange={(v) => setEvents(events.map((x, j) => (j === i ? v : x)))}
                  />
                </div>
                {events.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove event ${i + 1}`}
                    onClick={() => setEvents(events.filter((_, j) => j !== i))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {events.length < 5 && (
              <Button size="sm" onClick={() => setEvents([...events, ""])}>
                <Plus className="h-3.5 w-3.5" />
                Add series
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Metric">
              {(id) => (
                <Select id={id} value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
                  {METRICS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {VALUE_METRICS.includes(metric) && (
              <Field label="Property" error={!metricProp.trim() ? "Required for this metric" : null}>
                {(id) => (
                  <Input
                    id={id}
                    value={metricProp}
                    onChange={(e) => setMetricProp(e.target.value)}
                    placeholder="e.g. amount"
                  />
                )}
              </Field>
            )}
            <Field label="Interval">
              {(id) => (
                <Select
                  id={id}
                  value={interval}
                  disabled={metric === "frequency"}
                  onChange={(e) => setInterval(e.target.value as Interval)}
                >
                  <option value="hour">Hour</option>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </Select>
              )}
            </Field>
            <Field label="Break down by" hint={events.length > 1 ? "Single series only" : undefined}>
              {(id) => (
                <div className="flex gap-1">
                  <Select
                    aria-label="Breakdown type"
                    className="w-24"
                    disabled={events.length > 1}
                    value={bType}
                    onChange={(e) => setBType(e.target.value as "event" | "person")}
                  >
                    <option value="event">Event</option>
                    <option value="person">User</option>
                  </Select>
                  <Input
                    id={id}
                    list="bkd-builtin"
                    disabled={events.length > 1}
                    value={bProp}
                    onChange={(e) => setBProp(e.target.value)}
                    placeholder="$country, plan…"
                  />
                  <datalist id="bkd-builtin">
                    {TREND_BREAKDOWN_BUILTINS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              )}
            </Field>
          </div>
          <FilterBuilder projectId={project.id} filters={filters} onChange={setFilters} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={compare}
              disabled={metric === "frequency"}
              onChange={(e) => setCompare(e.target.checked)}
            />
            Compare with previous period
          </label>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Results" actions={<ChartToolbar value={chart} onChange={setChart} />} />
        <CardBody>
          <InsightResult
            q={q}
            ready={ready}
            emptyTitle="No data"
            isEmpty={(r) => r.series.every((s) => (s.total ?? 0) === 0 && s.data.every((d) => !d))}
            emptyHint="Choose an event (and a property for value metrics)."
          >
            {(r) =>
              r.kind === "distribution" ? (
                <DistributionChart result={r} />
              ) : (
                <TimeSeriesChart result={r} chart={chart} />
              )
            }
          </InsightResult>
        </CardBody>
      </Card>
      {saveOpen && (
        <SaveReportDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          projectId={project.id}
          query={query}
          chart={chart}
          existing={existing}
          onSaved={setExisting}
        />
      )}
    </>
  );
}
