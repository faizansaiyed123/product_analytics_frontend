import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";

import { InsightResult } from "@/components/InsightResult";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
} from "@/components/ui/card";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui/misc";
import { useInsight } from "@/hooks/useInsight";
import { useRange } from "@/hooks/useRange";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { analyticsApi } from "@/services/endpoints";
import type {
  SessionsQuery,
  SessionsResult,
} from "@/types";
import { pickInterval } from "@/utils/dates";
import {
  bucketLabel,
  fmtDateTime,
  fmtDuration,
  fmtNum,
  fmtPct,
} from "@/utils/format";

const SESSION_SUMMARY_LABELS = [
  "Sessions",
  "Avg duration",
  "Events / session",
  "Pages / session",
  "Bounce rate",
] as const;

export function SessionsPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();

  const query: SessionsQuery = {
    type: "sessions",
    date_range,
    interval: pickInterval(date_range),
    filters: [],
    timezone,
  };

  const summaryQuery =
    useInsight<SessionsResult>(
      project.id,
      query,
    );

  const sessionsQuery = useInfiniteQuery({
    queryKey: [
      "session-list",
      project.id,
      date_range,
      timezone,
    ],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      analyticsApi.sessionList(
        project.id,
        date_range,
        pageParam,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.next_offset ?? undefined,
  });

  const sessions =
    sessionsQuery.data?.pages.flatMap(
      (page) => page.items,
    ) ?? [];

  const timezoneName =
    timezone || project.settings.timezone;

  return (
    <>
      <PageHeader
        title="Sessions"
        description={\`A new session starts after \${project.settings.session_timeout_minutes} minutes of inactivity (configurable in project settings).\`}
      />

      <Card className="mb-5">
        <CardBody>
          <InsightResult
            q={summaryQuery}
            ready
            emptyTitle="No sessions"
            isEmpty={(result) =>
              result.summary.sessions === 0
            }
          >
            {(result) => (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  {SESSION_SUMMARY_LABELS.map(
                    (label) => {
                      const values: Record<
                        (typeof SESSION_SUMMARY_LABELS)[number],
                        string
                      > = {
                        Sessions:
                          fmtNum(
                            result.summary.sessions,
                          ),
                        "Avg duration":
                          fmtDuration(
                            result.summary
                              .avg_duration_seconds,
                          ),
                        "Events / session":
                          fmtNum(
                            result.summary
                              .avg_events_per_session,
                            1,
                          ),
                        "Pages / session":
                          fmtNum(
                            result.summary
                              .avg_pages_per_session,
                            1,
                          ),
                        "Bounce rate":
                          fmtPct(
                            result.summary
                              .bounce_rate,
                          ),
                      };

                      return (
                        <div key={label}>
                          <div className="text-xs text-muted-foreground">
                            {label}
                          </div>
                          <div className="text-xl font-semibold tabular">
                            {values[label]}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                <div
                  className="h-48"
                  role="img"
                  aria-label="Sessions over time"
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <AreaChart
                      data={result.labels.map(
                        (label, index) => ({
                          label,
                          value:
                            result.sessions_series[
                              index
                            ],
                        }),
                      )}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="hsl(var(--border))"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="label"
                        tickFormatter={(value) =>
                          bucketLabel(
                            String(value),
                            result.interval,
                          )
                        }
                        tick={{ fontSize: 11 }}
                        minTickGap={24}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        width={36}
                      />
                      <Tooltip />
                      <Area
                        dataKey="value"
                        name="Sessions"
                        type="monotone"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.15}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </InsightResult>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent sessions" />

        {sessionsQuery.isError ? (
          <ErrorState
            error={sessionsQuery.error}
            onRetry={() =>
              sessionsQuery.refetch()
            }
          />
        ) : sessionsQuery.isLoading ? (
          <CardBody>
            <LoadingBlock label="Loading sessions" />
          </CardBody>
        ) : !sessions.length ? (
          <EmptyState title="No sessions in this range" />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Started</Th>
                  <Th>User</Th>
                  <Th className="text-right">
                    Duration
                  </Th>
                  <Th className="text-right">
                    Events
                  </Th>
                  <Th className="text-right">
                    Pages
                  </Th>
                  <Th>Entry page</Th>
                  <Th>Exit page</Th>
                </tr>
              </thead>

              <tbody>
                {sessions.map(
                  (session, index) => (
                    <tr
                      key={\`\${session.person_id}-\${session.start}-\${index}\`}
                    >
                      <Td className="whitespace-nowrap text-xs">
                        {fmtDateTime(
                          session.start,
                          timezoneName,
                        )}
                      </Td>
                      <Td>
                        <Link
                          className="font-mono text-xs text-primary hover:underline"
                          to={\`/users/\${session.person_id}\`}
                        >
                          {session.distinct_id}
                        </Link>
                      </Td>
                      <Td className="text-right tabular">
                        {fmtDuration(
                          session.duration_seconds,
                        )}
                      </Td>
                      <Td className="text-right tabular">
                        {session.events}
                      </Td>
                      <Td className="text-right tabular">
                        {session.pages}
                      </Td>
                      <Td className="max-w-[10rem] truncate font-mono text-xs">
                        {session.entry_path ?? "–"}
                      </Td>
                      <Td className="max-w-[10rem] truncate font-mono text-xs">
                        {session.exit_path ?? "–"}
                      </Td>
                    </tr>
                  ),
                )}
              </tbody>
            </Table>

            {sessionsQuery.hasNextPage && (
              <div className="border-t border-border p-3 text-center">
                <Button
                  loading={
                    sessionsQuery.isFetchingNextPage
                  }
                  onClick={() =>
                    sessionsQuery.fetchNextPage()
                  }
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
