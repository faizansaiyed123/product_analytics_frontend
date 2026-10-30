import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { EventPicker } from "@/components/EventPicker";
import { InsightResult } from "@/components/InsightResult";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { useInsight } from "@/hooks/useInsight";
import { useRange } from "@/hooks/useRange";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import type { PathsQuery, PathsResult } from "@/types";
import { fmtNum } from "@/utils/format";

const DEPTH_OPTIONS = [3, 4, 5, 6, 8];

export function PathsPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();

  const [pathType, setPathType] = useState<
    "event" | "page"
  >("event");
  const [start, setStart] = useState("");
  const [depth, setDepth] = useState(4);

  const query = useMemo<PathsQuery>(
    () => ({
      type: "paths",
      path_type: pathType,
      start_event: start || null,
      depth,
      max_nodes_per_step: 8,
      date_range,
      filters: [],
      timezone,
    }),
    [
      pathType,
      start,
      depth,
      date_range,
      timezone,
    ],
  );

  const insightQuery =
    useInsight<PathsResult>(
      project.id,
      query,
    );

  const handlePathTypeChange = (
    value: "event" | "page",
  ) => {
    setPathType(value);
    setStart("");
  };

  return (
    <>
      <PageHeader
        title="User journeys"
        description="The most common sequences of events (or pages) within a session."
      />

      <Card className="mb-5">
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <Field label="Follow">
            {(id) => (
              <Select
                id={id}
                value={pathType}
                onChange={(event) =>
                  handlePathTypeChange(
                    event.target.value as
                      | "event"
                      | "page",
                  )
                }
              >
                <option value="event">
                  Events
                </option>
                <option value="page">
                  Pages ($pageview paths)
                </option>
              </Select>
            )}
          </Field>

          <Field label="Starting at (optional)">
            {() =>
              pathType === "event" ? (
                <EventPicker
                  projectId={project.id}
                  value={start}
                  label="Start event"
                  onChange={setStart}
                  placeholder="Any first event"
                />
              ) : (
                <input
                  aria-label="Start page"
                  className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={start}
                  onChange={(event) =>
                    setStart(event.target.value)
                  }
                  placeholder="/pricing"
                />
              )
            }
          </Field>

          <Field label="Steps">
            {(id) => (
              <Select
                id={id}
                value={depth}
                onChange={(event) =>
                  setDepth(
                    Number(event.target.value),
                  )
                }
              >
                {DEPTH_OPTIONS.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Transitions"
          description="Most common next step from each step, across sessions"
        />

        <CardBody>
          <InsightResult
            q={insightQuery}
            ready
            emptyTitle="No journeys found"
            isEmpty={(result) =>
              result.edges.length === 0
            }
          >
            {(result) => {
              const steps = Array.from(
                new Set(
                  result.edges.map(
                    (edge) => edge.step,
                  ),
                ),
              ).sort((a, b) => a - b);

              return (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    {fmtNum(result.sessions)} sessions
                    analysed
                  </p>

                  {steps.map((step) => {
                    const edges =
                      result.edges.filter(
                        (edge) =>
                          edge.step === step,
                      );
                    const maxCount = Math.max(
                      ...edges.map(
                        (edge) => edge.count,
                      ),
                    );

                    return (
                      <section
                        key={step}
                        aria-label={`Step ${step} to ${step + 1}`}
                      >
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Step {step} → {step + 1}
                        </h3>

                        <ul className="space-y-1.5">
                          {edges
                            .slice(0, 8)
                            .map((edge) => (
                              <li
                                key={`${edge.source}>${edge.target}`}
                                className="grid grid-cols-[1fr_auto] items-center gap-3"
                              >
                                <div className="relative overflow-hidden rounded bg-muted px-2 py-1 text-sm">
                                  <div
                                    className="absolute inset-y-0 left-0 bg-primary/20"
                                    style={{
                                      width: `${(edge.count / maxCount) * 100}%`,
                                    }}
                                  />

                                  <span className="relative flex items-center gap-2">
                                    <b className="truncate">
                                      {edge.source}
                                    </b>
                                    <ArrowRight
                                      className="h-3.5 w-3.5 shrink-0"
                                      aria-label="to"
                                    />
                                    <span className="truncate">
                                      {edge.target}
                                    </span>
                                  </span>
                                </div>

                                <span className="tabular text-sm">
                                  {fmtNum(edge.count)}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              );
            }}
          </InsightResult>
        </CardBody>
      </Card>
    </>
  );
}
