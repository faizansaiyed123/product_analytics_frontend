import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingBlock, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { useInsight } from "@/hooks/useInsight";
import { useRange } from "@/hooks/useRange";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { analyticsApi } from "@/services/endpoints";
import type { SessionsQuery, SessionsResult } from "@/types";
import { pickInterval } from "@/utils/dates";
import { bucketLabel, fmtDateTime, fmtDuration, fmtNum, fmtPct } from "@/utils/format";
import { InsightResult } from "@/components/InsightResult";

export function SessionsPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();
  const query: SessionsQuery = { type: "sessions", date_range, interval: pickInterval(date_range), filters: [], timezone };
  const sum = useInsight<SessionsResult>(project.id, query);
  const list = useInfiniteQuery({ queryKey: ["session-list", project.id, date_range, timezone], initialPageParam: 0, queryFn: ({ pageParam }) => analyticsApi.sessionList(project.id, date_range, pageParam), getNextPageParam: (l) => l.next_offset ?? undefined });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      <PageHeader title="Sessions" description={`A new session starts after ${project.settings.session_timeout_minutes} minutes of inactivity (configurable in project settings).`} />
      <Card className="mb-5"><CardBody>
        <InsightResult q={sum} ready emptyTitle="No sessions" isEmpty={(r) => r.summary.sessions === 0}>{(r) => (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">{[["Sessions", fmtNum(r.summary.sessions)], ["Avg duration", fmtDuration(r.summary.avg_duration_seconds)], ["Events / session", fmtNum(r.summary.avg_events_per_session, 1)], ["Pages / session", fmtNum(r.summary.avg_pages_per_session, 1)], ["Bounce rate", fmtPct(r.summary.bounce_rate)]].map(([l, v]) => <div key={l}><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-semibold tabular">{v}</div></div>)}</div>
            <div className="h-48" role="img" aria-label="Sessions over time"><ResponsiveContainer width="100%" height="100%"><AreaChart data={r.labels.map((l, i) => ({ l, v: r.sessions_series[i] }))}><CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" /><XAxis dataKey="l" tickFormatter={(v) => bucketLabel(String(v), r.interval)} tick={{ fontSize: 11 }} minTickGap={24} /><YAxis tick={{ fontSize: 11 }} width={36} /><Tooltip /><Area dataKey="v" name="Sessions" type="monotone" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>
          </div>)}</InsightResult>
      </CardBody></Card>
      <Card><CardHeader title="Recent sessions" />
        {list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : list.isLoading ? <CardBody><LoadingBlock label="Loading sessions" /></CardBody> : !rows.length ? <EmptyState title="No sessions in this range" /> : (
          <><Table><thead><tr><Th>Started</Th><Th>User</Th><Th className="text-right">Duration</Th><Th className="text-right">Events</Th><Th className="text-right">Pages</Th><Th>Entry page</Th><Th>Exit page</Th></tr></thead><tbody>{rows.map((s, i) => (
            <tr key={`${s.person_id}-${s.start}-${i}`}><Td className="whitespace-nowrap text-xs">{fmtDateTime(s.start, timezone || project.settings.timezone)}</Td><Td><Link className="font-mono text-xs text-primary hover:underline" to={`/users/${s.person_id}`}>{s.distinct_id}</Link></Td>
              <Td className="text-right tabular">{fmtDuration(s.duration_seconds)}</Td><Td className="text-right tabular">{s.events}</Td><Td className="text-right tabular">{s.pages}</Td><Td className="max-w-[10rem] truncate font-mono text-xs">{s.entry_path ?? "–"}</Td><Td className="max-w-[10rem] truncate font-mono text-xs">{s.exit_path ?? "–"}</Td></tr>))}</tbody></Table>
            {list.hasNextPage && <div className="border-t border-border p-3 text-center"><Button loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>Load more</Button></div>}</>)}
      </Card>
    </>
  );
}
