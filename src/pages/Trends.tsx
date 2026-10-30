import { useQuery } from "@tanstack/react-query";
import { Plus, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ChartToolbar } from "@/components/ChartToolbar";
import {
  DistributionChart,
  TimeSeriesChart,
} from "@/components/charts/TimeSeriesChart";
import { EventPicker } from "@/components/EventPicker";
import { ExportMenu } from "@/components/ExportMenu";
import { FilterBuilder } from "@/components/FilterBuilder";
import { InsightResult } from "@/components/InsightResult";
import { SaveReportDialog } from "@/components/SaveReportDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
} from "@/components/ui/card";
import {
  Field,
  Input,
  Select,
} from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { useInsight } from "@/hooks/useInsight";
import { useRange } from "@/hooks/useRange";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { savedApi } from "@/services/endpoints";
import type {
  ChartType,
  Filter,
  Interval,
  Metric,
  Report,
  TrendQuery,
  TrendResult,
} from "@/types";
import { pickInterval } from "@/utils/dates";
import { activeFilters } from "@/utils/filters";

const METRICS: [Metric, string][] = [
  ["total_events", "Total events"],
  ["unique_users", "Unique users"],
  [
    "avg_events_per_user",
    "Average events per user",
  ],
  [
    "frequency",
    "Frequency (users by times performed)",
  ],
  ["sum", "Sum of property"],
  ["avg", "Average of property"],
  ["min", "Min of property"],
  ["max", "Max of property"],
  ["median", "Median of property"],
  ["p90", "90th percentile of property"],
];

const VALUE_METRICS = [
  "sum",
  "avg",
  "min",
  "max",
  "median",
  "p90",
];

export const TREND_BREAKDOWN_BUILTINS = [
  "$country",
  "$browser",
  "$os",
  "$device_type",
];

function EventSeriesRow({
  projectId,
  event,
  index,
  events,
  onChange,
  onRemove,
}: {
  projectId: string;
  event: string;
  index: number;
  events: string[];
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const canRemove = events.length > 1;

  return (
    <div className="flex items-center gap-2">
      <span className="w-5 text-xs text-muted-foreground">
        {String.fromCharCode(65 + index)}
      </span>

      <div className="max-w-sm flex-1">
        <EventPicker
          projectId={projectId}
          value={event}
          allowAll
          label={`Event ${index + 1}`}
          onChange={(value) =>
            onChange(index, value)
          }
        />
      </div>

      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove event ${index + 1}`}
          onClick={() => onRemove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function TrendsPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();
  const [searchParams] = useSearchParams();

  const reportId = searchParams.get("report");

  const [events, setEvents] = useState<string[]>([
    "$pageview",
  ]);
  const [metric, setMetric] = useState<Metric>(
    "total_events",
  );
  const [metricProp, setMetricProp] = useState("");
  const [interval, setInterval] = useState<Interval>(
    pickInterval(date_range),
  );
  const [chart, setChart] =
    useState<ChartType>("line");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [breakdownType, setBreakdownType] = useState<
    "event" | "person"
  >("event");
  const [breakdownProperty, setBreakdownProperty] =
    useState("");
  const [compare, setCompare] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [existing, setExisting] =
    useState<Report | null>(null);

  const reportQuery = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => savedApi.report(reportId!),
    enabled: !!reportId,
  });

  useEffect(() => {
    const report = reportQuery.data;

    if (!report || report.query.type !== "trend") {
      return;
    }

    const query = report.query;

    setExisting(report);
    setEvents(
      query.series.map((series) => series.event),
    );
    setMetric(query.metric);
    setMetricProp(query.metric_property ?? "");
    setInterval(query.interval);
    setFilters(query.filters);
    setBreakdownProperty(
      query.breakdown?.property ?? "",
    );
    setBreakdownType(
      query.breakdown?.type ?? "event",
    );
    setCompare(!!query.compare_previous);

    if (report.visualization.chart) {
      setChart(report.visualization.chart);
    }
  }, [reportQuery.data]);

  const ready =
    events.every((event) => event.trim()) &&
    (!VALUE_METRICS.includes(metric) ||
      !!metricProp.trim());

  const query = useMemo<TrendQuery>(
    () => ({
      type: "trend",
      series: events
        .filter(Boolean)
        .map((event) => ({ event })),
      metric,
      metric_property: VALUE_METRICS.includes(metric)
        ? metricProp
        : null,
      date_range,
      interval,
      filters: activeFilters(filters),
      breakdown:
        breakdownProperty && events.length === 1
          ? {
              type: breakdownType,
              property: breakdownProperty,
              limit: 10,
            }
          : null,
      timezone,
      compare_previous:
        compare && metric !== "frequency",
    }),
    [
      events,
      metric,
      metricProp,
      date_range,
      interval,
      filters,
      breakdownProperty,
      breakdownType,
      timezone,
      compare,
    ],
  );

  const insightQuery = useInsight<TrendResult>(
    project.id,
    query,
    ready,
  );

  const addSeries = () => {
    setEvents([...events, ""]);
  };

  const updateSeries = (
    index: number,
    value: string,
  ) => {
    setEvents(
      events.map((event, itemIndex) =>
        itemIndex === index ? value : event,
      ),
    );
  };

  const removeSeries = (index: number) => {
    setEvents(
      events.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  };

  return (
    <>
      <PageHeader
        title={existing ? existing.name : "Trends"}
        description="How often events happen over time."
        actions={
          <>
            <ExportMenu
              projectId={project.id}
              query={query}
              disabled={!ready}
            />
            <Button
              variant="primary"
              disabled={!ready}
              onClick={() => setSaveOpen(true)}
            >
              <Save className="h-4 w-4" />
              {existing
                ? "Update report"
                : "Save as report"}
            </Button>
          </>
        }
      />

      <Card className="mb-5">
        <CardBody className="space-y-4">
          <div className="space-y-2">
            {events.map((event, index) => (
              <EventSeriesRow
                key={index}
                projectId={project.id}
                event={event}
                index={index}
                events={events}
                onChange={updateSeries}
                onRemove={removeSeries}
              />
            ))}

            {events.length < 5 && (
              <Button
                size="sm"
                onClick={addSeries}
              >
                <Plus className="h-3.5 w-3.5" />
                Add series
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Metric">
              {(id) => (
                <Select
                  id={id}
                  value={metric}
                  onChange={(event) =>
                    setMetric(
                      event.target.value as Metric,
                    )
                  }
                >
                  {METRICS.map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ),
                  )}
                </Select>
              )}
            </Field>

            {VALUE_METRICS.includes(metric) && (
              <Field
                label="Property"
                error={
                  !metricProp.trim()
                    ? "Required for this metric"
                    : null
                }
              >
                {(id) => (
                  <Input
                    id={id}
                    value={metricProp}
                    onChange={(event) =>
                      setMetricProp(
                        event.target.value,
                      )
                    }
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
                  onChange={(event) =>
                    setInterval(
                      event.target.value as Interval,
                    )
                  }
                >
                  <option value="hour">Hour</option>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </Select>
              )}
            </Field>

            <Field
              label="Break down by"
              hint={
                events.length > 1
                  ? "Single series only"
                  : undefined
              }
            >
              {(id) => (
                <div className="flex gap-1">
                  <Select
                    aria-label="Breakdown type"
                    className="w-24"
                    disabled={events.length > 1}
                    value={breakdownType}
                    onChange={(event) =>
                      setBreakdownType(
                        event.target.value as
                          | "event"
                          | "person",
                      )
                    }
                  >
                    <option value="event">
                      Event
                    </option>
                    <option value="person">
                      User
                    </option>
                  </Select>

                  <Input
                    id={id}
                    list="bkd-builtin"
                    disabled={events.length > 1}
                    value={breakdownProperty}
                    onChange={(event) =>
                      setBreakdownProperty(
                        event.target.value,
                      )
                    }
                    placeholder="$country, plan…"
                  />

                  <datalist id="bkd-builtin">
                    {TREND_BREAKDOWN_BUILTINS.map(
                      (builtin) => (
                        <option
                          key={builtin}
                          value={builtin}
                        />
                      ),
                    )}
                  </datalist>
                </div>
              )}
            </Field>
          </div>

          <FilterBuilder
            projectId={project.id}
            filters={filters}
            onChange={setFilters}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={compare}
              disabled={metric === "frequency"}
              onChange={(event) =>
                setCompare(event.target.checked)
              }
            />
            Compare with previous period
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Results"
          actions={
            <ChartToolbar
              value={chart}
              onChange={setChart}
            />
          }
        />

        <CardBody>
          <InsightResult
            q={insightQuery}
            ready={ready}
            emptyTitle="No data"
            isEmpty={(result) =>
              result.series.every(
                (series) =>
                  (series.total ?? 0) === 0 &&
                  series.data.every((value) => !value),
              )
            }
            emptyHint="Choose an event (and a property for value metrics)."
          >
            {(result) =>
              result.kind === "distribution" ? (
                <DistributionChart result={result} />
              ) : (
                <TimeSeriesChart
                  result={result}
                  chart={chart}
                />
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
