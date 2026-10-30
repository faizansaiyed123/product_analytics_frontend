import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";

import { RetentionHeatmap } from "@/components/charts/Heatmap";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  Table,
  Td,
  Th,
} from "@/components/ui/misc";
import { useRange } from "@/hooks/useRange";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { analyticsApi } from "@/services/endpoints";
import { cn } from "@/utils/cn";
import { rangeLabel } from "@/utils/dates";
import {
  bucketLabel,
  fmtCompact,
  fmtDuration,
  fmtNum,
  fmtPct,
  pctChange,
} from "@/utils/format";
import type { Kpis, Overview } from "@/types";

type KpiProps = {
  label: string;
  value: number | null;
  prev?: number | null;
  cur?: number;
  format?: (value: number | null) => string;
};

function Kpi({
  label,
  value,
  prev,
  cur,
  format = fmtCompact,
}: KpiProps) {
  const change = cur !== undefined ? pctChange(cur, prev) : null;

  return (
    <Card className="group relative overflow-hidden rounded-2xl border-border/70 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-5">
      <div className="pointer-events-none absolute -right-7 -top-7 h-24 w-24 rounded-full bg-primary/[0.06] transition-transform duration-300 group-hover:scale-125" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </div>
          <div
            className="mt-3 text-2xl font-semibold tracking-tight tabular sm:text-3xl"
            data-testid={`kpi-${label}`}
          >
            {format(value)}
          </div>
        </div>

        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/[0.08] text-primary">
          <Activity className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <div className="relative mt-3 min-h-5 text-[11px] tabular">
        {change === null ? (
          <span className="text-muted-foreground">
            {prev === undefined ? "" : "No previous-period data"}
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex flex-wrap items-center gap-1 font-medium",
              change >= 0 ? "text-success" : "text-danger",
            )}
          >
            {change >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {fmtPct(Math.abs(change))}
            <span className="font-normal text-muted-foreground">
              vs previous period
            </span>
          </span>
        )}
      </div>
    </Card>
  );
}

const TOOLTIP_CONFIG = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 10,
    fontSize: 12,
  },
};

type MiniSeriesProps = {
  labels: string[];
  data: number[];
  interval: string;
  kind: "bar" | "area";
  name: string;
};

function MiniSeries({
  labels,
  data,
  interval,
  kind,
  name,
}: MiniSeriesProps) {
  const rows = labels.map((label, index) => ({
    label,
    value: data[index],
  }));

  const axes = (
    <>
      <CartesianGrid
        vertical={false}
        stroke="hsl(var(--border))"
        strokeDasharray="3 5"
      />
      <XAxis
        dataKey="label"
        tickFormatter={(value) =>
          bucketLabel(String(value), interval)
        }
        tick={{ fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        minTickGap={24}
      />
      <YAxis
        tick={{ fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        width={40}
        tickFormatter={(value) => fmtCompact(Number(value))}
      />
      <Tooltip {...TOOLTIP_CONFIG} />
    </>
  );

  return (
    <div
      className="h-56 sm:h-64"
      role="img"
      aria-label={`${name} over time`}
    >
      <ResponsiveContainer width="100%" height="100%">
        {kind === "bar" ? (
          <BarChart
            data={rows}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            {axes}
            <Bar
              dataKey="value"
              name={name}
              fill="hsl(var(--primary))"
              radius={[5, 5, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        ) : (
          <AreaChart
            data={rows}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            {axes}
            <Area
              dataKey="value"
              name={name}
              type="monotone"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.13}
              strokeWidth={2.5}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function OverviewHero({
  projectName,
  dateRange,
  loading,
  onRefresh,
}: {
  projectName: string;
  dateRange: ReturnType<typeof useRange>["date_range"];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="relative isolate mb-7 overflow-hidden rounded-3xl border border-indigo-900/70 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-5 py-6 text-white shadow-sm sm:px-7 md:py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -right-16 -top-28 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-36 right-1/3 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />

        <svg
          className="absolute -right-6 bottom-0 hidden h-full w-[45%] opacity-25 md:block"
          viewBox="0 0 560 220"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M0 177L52 164L104 171L156 123L208 139L260 95L312 108L364 58L416 77L468 28L560 42"
            stroke="#C4B5FD"
            strokeWidth="2"
          />
          <path
            d="M0 177L52 164L104 171L156 123L208 139L260 95L312 108L364 58L416 77L468 28L560 42V220H0V177Z"
            fill="url(#overview-fill)"
          />
          <defs>
            <linearGradient
              id="overview-fill"
              x1="280"
              y1="28"
              x2="280"
              y2="220"
              gradientUnits="userSpaceOnUse"
            >
              <stop
                stopColor="#A78BFA"
                stopOpacity=".32"
              />
              <stop
                offset="1"
                stopColor="#A78BFA"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {[52, 104, 156, 208, 260, 312, 364, 416, 468, 520].map(
            (x) => (
              <path
                key={x}
                d={`M${x} 0V220`}
                stroke="#C4B5FD"
                strokeOpacity=".16"
                strokeDasharray="3 7"
              />
            ),
          )}
        </svg>
      </div>

      <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Product intelligence
            <span className="h-1 w-1 rounded-full bg-emerald-300" />
            Workspace overview
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl md:text-[2.35rem]">
            Understand what moves your product.
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100/80">
            {projectName}
            <span className="mx-2 text-white/35">/</span>
            {rangeLabel(dateRange)}
            <span className="mx-2 text-white/35">/</span>
            A focused view of users, activity, and the journeys behind
            growth.
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          className="relative shrink-0 border-white/15 bg-white/10 text-white shadow-none hover:bg-white/15"
          loading={loading}
          onClick={onRefresh}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh data
        </Button>
      </div>
    </section>
  );
}

function TopEventsTable({ events }: { events: Overview["top_events"] }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
      <CardHeader
        title="Top events"
        description="The actions people trigger most often"
        className="px-5 py-4"
      />

      <Table>
        <thead>
          <tr>
            <Th className="pl-5">Event</Th>
            <Th className="text-right">Count</Th>
            <Th className="pr-5 text-right">Users</Th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.event}
              className="transition-colors hover:bg-muted/40"
            >
              <Td className="pl-5 font-medium">{event.event}</Td>
              <Td className="text-right tabular">
                {fmtNum(event.count)}
              </Td>
              <Td className="pr-5 text-right tabular">
                {fmtNum(event.unique_users)}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function TopPagesTable({ pages }: { pages: Overview["top_pages"] }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
      <CardHeader
        title="Top pages"
        description="Pages attracting the most visits"
        className="px-5 py-4"
      />

      {!pages.length ? (
        <EmptyState
          title="No page views"
          description="Call Analytics.page() or enable autocapture in the SDK."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="pl-5">Path</Th>
              <Th className="text-right">Views</Th>
              <Th className="text-right">Visitors</Th>
              <Th className="pr-5 text-right">Views / user</Th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr
                key={page.path}
                className="transition-colors hover:bg-muted/40"
              >
                <Td className="max-w-[16rem] truncate pl-5 font-mono text-xs">
                  {page.path}
                </Td>
                <Td className="text-right tabular">
                  {fmtNum(page.views)}
                </Td>
                <Td className="text-right tabular">
                  {fmtNum(page.unique_visitors)}
                </Td>
                <Td className="pr-5 text-right tabular">
                  {fmtNum(page.avg_views_per_user, 1)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function RetentionCard({ overview }: { overview: Overview }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
      <CardHeader
        title="Retention overview"
        description={`Daily retention of people first seen in this period · avg session ${fmtDuration(overview.kpis.avg_session_duration_seconds)}`}
        actions={
          <Link
            to="/insights/retention"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-accent"
          >
            Open retention
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
        className="px-5 py-4"
      />

      <CardBody className="p-4 sm:p-5">
        {overview.retention.cohorts.length ? (
          <RetentionHeatmap
            result={overview.retention}
            interval="day"
          />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No new users in this period.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

export function OverviewPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();
  const queryClient = useQueryClient();

  const overviewKey = [
    "overview",
    project.id,
    date_range,
    timezone,
  ];

  const overviewQuery = useQuery<Overview>({
    queryKey: overviewKey,
    queryFn: () =>
      analyticsApi.overview(
        project.id,
        date_range,
        timezone ?? undefined,
      ),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const refreshOverview = useMutation({
    mutationFn: () =>
      analyticsApi.overview(
        project.id,
        date_range,
        timezone ?? undefined,
        true,
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(overviewKey, data);
      toast.success("Overview refreshed");
    },
    onError: () =>
      toast.error("Could not refresh overview. Please try again."),
  });

  const overview = overviewQuery.data;

  const currentKpi = (key: keyof Kpis) =>
    overview?.kpis[key] ?? null;

  const previousKpi = (key: keyof Kpis) =>
    overview
      ? (overview.previous_kpis?.[key] ?? null)
      : undefined;

  return (
    <>
      <OverviewHero
        projectName={project.name}
        dateRange={date_range}
        loading={refreshOverview.isPending}
        onRefresh={() => refreshOverview.mutate()}
      />

      {overviewQuery.isError ? (
        <Card className="rounded-2xl border-border/70 p-2 shadow-sm">
          <ErrorState
            error={overviewQuery.error}
            onRetry={() => overviewQuery.refetch()}
          />
        </Card>
      ) : !overview ? (
        <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
          <LoadingBlock
            label="Loading overview"
            height="h-96"
          />
        </Card>
      ) : overview.kpis.total_events === 0 &&
        overview.kpis.total_users === 0 ? (
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="text-sm font-semibold">
              Your analytics workspace
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Once the first events arrive, your product activity
              will appear here.
            </p>
          </div>

          <EmptyState
            title="No data yet"
            description={
              <>
                Install the tracking SDK and send your first event.
                See{" "}
                <Link
                  className="font-medium text-primary hover:underline"
                  to="/settings/api-keys"
                >
                  API Keys
                </Link>{" "}
                for your project key and the SDK docs for a 3-line
                setup.
              </>
            }
          />
        </Card>
      ) : (
        <div
          className="space-y-7"
          aria-busy={overviewQuery.isFetching}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                At a glance
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The key signals for this reporting period.
              </p>
            </div>

            <div className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
              <span className="font-medium text-foreground">
                Period
              </span>
              <span className="mx-2">·</span>
              {rangeLabel(date_range)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Kpi
              label="Total users"
              value={currentKpi("total_users")}
            />
            <Kpi
              label="Active users"
              value={currentKpi("active_users")}
              cur={overview.kpis.active_users}
              prev={previousKpi("active_users")}
            />
            <Kpi
              label="New users"
              value={currentKpi("new_users")}
              cur={overview.kpis.new_users}
              prev={previousKpi("new_users")}
            />
            <Kpi
              label="Total events"
              value={currentKpi("total_events")}
              cur={overview.kpis.total_events}
              prev={previousKpi("total_events")}
            />
            <Kpi
              label="Sessions"
              value={currentKpi("sessions")}
              cur={overview.kpis.sessions}
              prev={previousKpi("sessions")}
            />
            <Kpi
              label="Events / user"
              value={currentKpi("events_per_user")}
              cur={overview.kpis.events_per_user}
              prev={previousKpi("events_per_user")}
              format={(value) => fmtNum(value, 1)}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
              <CardHeader
                title="Event volume"
                description="How activity changes across the selected period"
                className="px-5 py-4"
              />
              <CardBody className="px-3 pb-4 pt-3 sm:px-5">
                <MiniSeries
                  labels={overview.labels}
                  data={overview.event_volume}
                  interval={overview.interval}
                  kind="bar"
                  name="Events"
                />
              </CardBody>
            </Card>

            <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
              <CardHeader
                title="User growth"
                description="Cumulative people first seen"
                className="px-5 py-4"
              />
              <CardBody className="px-3 pb-4 pt-3 sm:px-5">
                <MiniSeries
                  labels={overview.labels}
                  data={overview.user_growth_series}
                  interval={overview.interval}
                  kind="area"
                  name="Total users"
                />
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <TopEventsTable events={overview.top_events} />
            <TopPagesTable pages={overview.top_pages} />
          </div>

          <RetentionCard overview={overview} />
        </div>
      )}
    </>
  );
}
