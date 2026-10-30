import { useQuery } from "@tanstack/react-query";
import { Plus, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { EventPicker } from "@/components/EventPicker";
import { ExportMenu } from "@/components/ExportMenu";
import { FunnelChart } from "@/components/charts/FunnelChart";
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
import type {
  Filter,
  FunnelQuery,
  FunnelResult,
  Report,
} from "@/types";
import { activeFilters } from "@/utils/filters";

export function FunnelsPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();
  const [searchParams] = useSearchParams();

  const reportId = searchParams.get("report");

  const [steps, setSteps] = useState<string[]>([
    "$pageview",
    "",
  ]);
  const [conversionWindow, setConversionWindow] =
    useState(14);
  const [conversionUnit, setConversionUnit] =
    useState<
      FunnelQuery["conversion_window"]["unit"]
    >("day");
  const [filters, setFilters] = useState<Filter[]>(
    [],
  );
  const [breakdownProperty, setBreakdownProperty] =
    useState("");
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

    if (!report || report.query.type !== "funnel") {
      return;
    }

    const query = report.query;

    setExisting(report);
    setSteps(
      query.steps.map((step) => step.event),
    );
    setConversionWindow(
      query.conversion_window.value,
    );
    setConversionUnit(
      query.conversion_window.unit,
    );
    setFilters(query.filters);
    setBreakdownProperty(
      query.breakdown?.property ?? "",
    );
  }, [reportQuery.data]);

  const ready =
    steps.length >= 2 &&
    steps.every((step) => step.trim()) &&
    conversionWindow >= 1;

  const query = useMemo<FunnelQuery>(
    () => ({
      type: "funnel",
      steps: steps.map((event) => ({ event })),
      date_range,
      conversion_window: {
        value: conversionWindow,
        unit: conversionUnit,
      },
      filters: activeFilters(filters),
      breakdown: breakdownProperty
        ? {
            type: "event",
            property: breakdownProperty,
            limit: 10,
          }
        : null,
      timezone,
    }),
    [
      steps,
      date_range,
      conversionWindow,
      conversionUnit,
      filters,
      breakdownProperty,
      timezone,
    ],
  );

  const insightQuery = useInsight<FunnelResult>(
    project.id,
    query,
    ready,
  );

  const updateStep = (
    index: number,
    value: string,
  ) => {
    setSteps(
      steps.map((step, itemIndex) =>
        itemIndex === index ? value : step,
      ),
    );
  };

  const removeStep = (index: number) => {
    setSteps(
      steps.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  };

  return (
    <>
      <PageHeader
        title={existing ? existing.name : "Funnels"}
        description="Where do people drop off between steps?"
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
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li
                key={index}
                className="flex items-center gap-2"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </span>

                <div className="max-w-sm flex-1">
                  <EventPicker
                    projectId={project.id}
                    value={step}
                    label={`Step ${index + 1} event`}
                    placeholder={`Step ${index + 1}`}
                    onChange={(value) =>
                      updateStep(index, value)
                    }
                  />
                </div>

                {steps.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove step ${index + 1}`}
                    onClick={() =>
                      removeStep(index)
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ol>

          {steps.length < 10 && (
            <Button
              size="sm"
              onClick={() =>
                setSteps([...steps, ""])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add step
            </Button>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Conversion window">
              {() => (
                <div className="flex gap-1">
                  <Input
                    aria-label="Window length"
                    type="number"
                    min={1}
                    className="w-20"
                    value={conversionWindow}
                    onChange={(event) =>
                      setConversionWindow(
                        Math.max(
                          1,
                          Number(
                            event.target.value,
                          ),
                        ),
                      )
                    }
                  />

                  <Select
                    aria-label="Window unit"
                    value={conversionUnit}
                    onChange={(event) =>
                      setConversionUnit(
                        event.target.value as
                          typeof conversionUnit,
                      )
                    }
                  >
                    {[
                      "minute",
                      "hour",
                      "day",
                      "week",
                    ].map((unit) => (
                      <option
                        key={unit}
                        value={unit}
                      >
                        {unit}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </Field>

            <Field label="Break down by (first step property)">
              {(id) => (
                <Input
                  id={id}
                  value={breakdownProperty}
                  onChange={(event) =>
                    setBreakdownProperty(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. $country or plan"
                />
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
          title="Funnel"
          description="Steps must happen in order within the conversion window, counted per person. See docs/analytics.md for the exact rules."
        />
        <CardBody>
          <InsightResult
            q={insightQuery}
            ready={ready}
            emptyTitle="Nobody entered this funnel"
            isEmpty={(result) =>
              result.steps[0].count === 0
            }
            emptyHint="Choose an event for every step."
          >
            {(result) => (
              <FunnelChart result={result} />
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
