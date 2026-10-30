import { useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { EventPicker } from "@/components/EventPicker";
import { ExportMenu } from "@/components/ExportMenu";
import { FilterBuilder } from "@/components/FilterBuilder";
import { InsightResult } from "@/components/InsightResult";
import { RetentionHeatmap } from "@/components/charts/Heatmap";
import { SaveReportDialog } from "@/components/SaveReportDialog";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { useInsight } from "@/hooks/useInsight";
import { useRange } from "@/hooks/useRange";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { savedApi } from "@/services/endpoints";
import type {
  Filter,
  Report,
  RetentionQuery,
  RetentionResult,
} from "@/types";
import { activeFilters } from "@/utils/filters";

const PRESETS: Record<
  string,
  {
    label: string;
    interval: RetentionQuery["interval"];
    offsets: number[];
  }
> = {
  days: {
    label: "Day 0, 1, 7, 14, 30",
    interval: "day",
    offsets: [0, 1, 7, 14, 30],
  },
  daily: {
    label: "Daily (first 8 days)",
    interval: "day",
    offsets: [0, 1, 2, 3, 4, 5, 6, 7],
  },
  weekly: {
    label: "Weekly (8 weeks)",
    interval: "week",
    offsets: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  },
  monthly: {
    label: "Monthly (6 months)",
    interval: "month",
    offsets: [0, 1, 2, 3, 4, 5, 6],
  },
};

export function RetentionPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();
  const [searchParams] = useSearchParams();

  const reportId = searchParams.get("report");

  const [initialEvent, setInitialEvent] =
    useState("*");
  const [returnEvent, setReturnEvent] =
    useState("*");
  const [preset, setPreset] = useState("days");
  const [cohortType, setCohortType] = useState<
    "first_time" | "recurring"
  >("first_time");
  const [filters, setFilters] = useState<Filter[]>(
    [],
  );
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

    if (
      !report ||
      report.query.type !== "retention"
    ) {
      return;
    }

    const query = report.query;

    setExisting(report);
    setInitialEvent(query.initial_event.event);
    setReturnEvent(query.return_event.event);
    setCohortType(query.cohort_type);
    setFilters(query.filters);

    const matchingPreset = Object.entries(
      PRESETS,
    ).find(
      ([, value]) =>
        value.interval === query.interval &&
        JSON.stringify(value.offsets) ===
          JSON.stringify(query.offsets),
    );

    setPreset(matchingPreset?.[0] ?? "daily");
  }, [reportQuery.data]);

  const ready =
    !!initialEvent.trim() &&
    !!returnEvent.trim();

  const selectedPreset = PRESETS[preset];

  const query = useMemo<RetentionQuery>(
    () => ({
      type: "retention",
      initial_event: {
        event: initialEvent,
      },
      return_event: {
        event: returnEvent,
      },
      cohort_type: cohortType,
      interval: selectedPreset.interval,
      periods: Math.max(
        ...selectedPreset.offsets,
      ),
      offsets: selectedPreset.offsets,
      date_range,
      filters: activeFilters(filters),
      timezone,
    }),
    [
      initialEvent,
      returnEvent,
      cohortType,
      selectedPreset,
      date_range,
      filters,
      timezone,
    ],
  );

  const insightQuery =
    useInsight<RetentionResult>(
      project.id,
      query,
      ready,
    );

  return (
    <>
      <PageHeader
        title={existing ? existing.name : "Retention"}
        description="Of the people who start, how many come back?"
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Cohort starts with">
              {() => (
                <EventPicker
                  projectId={project.id}
                  value={initialEvent}
                  allowAll
                  label="Initial event"
                  onChange={setInitialEvent}
                />
              )}
            </Field>

            <Field label="Returns by doing">
              {() => (
                <EventPicker
                  projectId={project.id}
                  value={returnEvent}
                  allowAll
                  label="Return event"
                  onChange={setReturnEvent}
                />
              )}
            </Field>

            <Field label="Periods">
              {(id) => (
                <Select
                  id={id}
                  value={preset}
                  onChange={(event) =>
                    setPreset(
                      event.target.value,
                    )
                  }
                >
                  {Object.entries(
                    PRESETS,
                  ).map(([key, value]) => (
                    <option
                      key={key}
                      value={key}
                    >
                      {value.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field
              label="Cohort type"
              hint={
                cohortType === "first_time"
                  ? "First ever time they did the initial event"
                  : "Every period they did the initial event"
              }
            >
              {(id) => (
                <Select
                  id={id}
                  value={cohortType}
                  onChange={(event) =>
                    setCohortType(
                      event.target.value as
                        typeof cohortType,
                    )
                  }
                >
                  <option value="first_time">
                    First time
                  </option>
                  <option value="recurring">
                    Recurring
                  </option>
                </Select>
              )}
            </Field>
          </div>

          <FilterBuilder
            projectId={project.id}
            filters={filters}
            onChange={setFilters}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Retention by cohort"
          description="Cohorts are people whose first event falls in the selected date range. “–” means the period has not happened yet."
        />
        <CardBody>
          <InsightResult
            q={insightQuery}
            ready={ready}
            emptyTitle="No cohorts"
            isEmpty={(result) =>
              result.cohorts.length === 0
            }
          >
            {(result) => (
              <RetentionHeatmap
                result={result}
                interval={result.interval}
              />
            )}
          </InsightResult>
        </CardBody>
      </Card>

      {saveOpen && (
        <SaveReportDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          projectId={project.id}
          query={query}
          existing={existing}
          onSaved={setExisting}
        />
      )}
    </>
  );
}
