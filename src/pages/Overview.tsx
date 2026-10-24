import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RetentionHeatmap } from "@/components/charts/Heatmap";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingBlock, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { useRange } from "@/hooks/useRange";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { analyticsApi } from "@/services/endpoints";
import { bucketLabel, fmtCompact, fmtDuration, fmtNum, fmtPct, pctChange } from "@/utils/format";
import { rangeLabel } from "@/utils/dates";
import { Link } from "react-router-dom";
import type { Kpis, Overview } from "@/types";
import { cn } from "@/utils/cn";

function Kpi({ label, value, prev, cur, format = fmtCompact }: { label: string; value: number | null; cur?: number; prev?: number | null; format?: (n: number | null) => string }) {
  const ch = cur !== undefined ? pctChange(cur, prev) : null;
  return (
    <Card className="p-4"><div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular" data-testid={`kpi-${label}`}>{format(value)}</div>
      <div className="mt-1 h-4 text-xs tabular">{ch === null ? <span className="text-muted-foreground">{prev === undefined ? "" : "no previous data"}</span> :
        <span className={cn("inline-flex items-center gap-0.5", ch >= 0 ? "text-success" : "text-danger")}>{ch >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{fmtPct(Math.abs(ch))} <span className="text-muted-foreground">vs previous period</span></span>}</div>
    </Card>
  );
}

const tip = { contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 } };
function MiniSeries({ labels, data, interval, kind, name }: { labels: string[]; data: number[]; interval: string; kind: "bar" | "area"; name: string }) {
  const rows = labels.map((l, i) => ({ l, v: data[i] }));
  const axes = <><CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" /><XAxis dataKey="l" tickFormatter={(v) => bucketLabel(String(v), interval)} tick={{ fontSize: 11 }} tickLine={false} minTickGap={24} /><YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => fmtCompact(Number(v))} /><Tooltip {...tip} /></>;
  return <div className="h-56" role="img" aria-label={`${name} over time`}><ResponsiveContainer width="100%" height="100%">{kind === "bar"
    ? <BarChart data={rows}>{axes}<Bar dataKey="v" name={name} fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart>
    : <AreaChart data={rows}>{axes}<Area dataKey="v" name={name} type="monotone" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} isAnimationActive={false} /></AreaChart>}</ResponsiveContainer></div>;
}

export function OverviewPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();
  const queryClient = useQueryClient();
  const overviewKey = ["overview", project.id, date_range, timezone];
  const q = useQuery<Overview>({ queryKey: overviewKey, queryFn: () => analyticsApi.overview(project.id, date_range, timezone ?? undefined), placeholderData: keepPreviousData, staleTime: 30_000 });
  const refreshOverview = useMutation({
    mutationFn: () => analyticsApi.overview(project.id, date_range, timezone ?? undefined, true),
    onSuccess: (data) => {
      queryClient.setQueryData(overviewKey, data);
      toast.success("Overview refreshed");
    },
    onError: () => toast.error("Could not refresh overview. Please try again."),
  });
  const o = q.data;
  const k = (key: keyof Kpis) => o?.kpis[key] ?? null;
  const pk = (key: keyof Kpis) => (o ? (o.previous_kpis?.[key] ?? null) : undefined);
  return (
    <>
      <PageHeader title="Overview" description={`${project.name} · ${rangeLabel(date_range)}`} actions={<Button size="sm" loading={refreshOverview.isPending} onClick={() => refreshOverview.mutate()}><RefreshCw className="h-3.5 w-3.5" aria-hidden />Refresh data</Button>} />
      {q.isError ? <Card><ErrorState error={q.error} onRetry={() => q.refetch()} /></Card> : !o ? <LoadingBlock label="Loading overview" height="h-96" /> : o.kpis.total_events === 0 && o.kpis.total_users === 0 ? (
        <Card><EmptyState title="No data yet" description={<>Install the tracking SDK and send your first event. See <Link className="text-primary hover:underline" to="/settings/api-keys">API Keys</Link> for your project key and the SDK docs for a 3-line setup.</>} /></Card>
      ) : (
        <div className="space-y-5" aria-busy={q.isFetching}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Total users" value={k("total_users")} />
            <Kpi label="Active users" value={k("active_users")} cur={o.kpis.active_users} prev={pk("active_users")} />
            <Kpi label="New users" value={k("new_users")} cur={o.kpis.new_users} prev={pk("new_users")} />
            <Kpi label="Total events" value={k("total_events")} cur={o.kpis.total_events} prev={pk("total_events")} />
            <Kpi label="Sessions" value={k("sessions")} cur={o.kpis.sessions} prev={pk("sessions")} />
            <Kpi label="Events / user" value={k("events_per_user")} cur={o.kpis.events_per_user} prev={pk("events_per_user")} format={(n) => fmtNum(n, 1)} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><CardHeader title="Event volume" /><CardBody><MiniSeries labels={o.labels} data={o.event_volume} interval={o.interval} kind="bar" name="Events" /></CardBody></Card>
            <Card><CardHeader title="User growth" description="Cumulative people first seen" /><CardBody><MiniSeries labels={o.labels} data={o.user_growth_series} interval={o.interval} kind="area" name="Total users" /></CardBody></Card>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><CardHeader title="Top events" /><Table><thead><tr><Th>Event</Th><Th className="text-right">Count</Th><Th className="text-right">Users</Th></tr></thead><tbody>{o.top_events.map((e) => <tr key={e.event}><Td className="font-medium">{e.event}</Td><Td className="text-right tabular">{fmtNum(e.count)}</Td><Td className="text-right tabular">{fmtNum(e.unique_users)}</Td></tr>)}</tbody></Table></Card>
            <Card><CardHeader title="Top pages" description="Page views" />{!o.top_pages.length ? <EmptyState title="No page views" description="Call Analytics.page() or enable autocapture in the SDK." /> :
              <Table><thead><tr><Th>Path</Th><Th className="text-right">Views</Th><Th className="text-right">Visitors</Th><Th className="text-right">Views / user</Th></tr></thead><tbody>{o.top_pages.map((p) => <tr key={p.path}><Td className="max-w-[16rem] truncate font-mono text-xs">{p.path}</Td><Td className="text-right tabular">{fmtNum(p.views)}</Td><Td className="text-right tabular">{fmtNum(p.unique_visitors)}</Td><Td className="text-right tabular">{fmtNum(p.avg_views_per_user, 1)}</Td></tr>)}</tbody></Table>}</Card>
          </div>
          <Card><CardHeader title="Retention overview" description={`Daily retention of people first seen in this period · avg session ${fmtDuration(o.kpis.avg_session_duration_seconds)}`} actions={<Link to="/insights/retention" className="text-xs text-primary hover:underline">Open retention</Link>} />
            <CardBody>{o.retention.cohorts.length ? <RetentionHeatmap result={o.retention} interval="day" /> : <p className="text-sm text-muted-foreground">No new users in this period.</p>}</CardBody></Card>
        </div>
      )}
    </>
  );
}
