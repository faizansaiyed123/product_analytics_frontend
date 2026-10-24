import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { FilterBuilder } from "@/components/FilterBuilder";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge, EmptyState, ErrorState, LoadingBlock, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { EventPicker } from "@/components/EventPicker";
import { useRange } from "@/hooks/useRange";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { exploreApi } from "@/services/endpoints";
import type { EventRow, Filter } from "@/types";
import { activeFilters } from "@/utils/filters";
import { fmtDateTime } from "@/utils/format";
import { downloadUrl } from "@/services/api";
import { Download } from "lucide-react";

function Json({ value }: { value: unknown }) {
  return <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">{JSON.stringify(value, null, 2)}</pre>;
}

export function EventDetail({ projectId, id, onClose, tz }: { projectId: string; id: string | null; onClose: () => void; tz: string | null }) {
  const q = useQuery({ queryKey: ["event", id], queryFn: () => exploreApi.event(projectId, id!), enabled: !!id });
  const e = q.data;
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()} wide title={e?.event ?? "Event"} description={e ? fmtDateTime(e.timestamp, tz) : undefined}>
      {q.isError ? <ErrorState error={q.error} /> : !e ? <LoadingBlock label="Loading event" height="h-40" /> : (
        <div className="space-y-4 text-sm">
          <section><h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Properties</h3><Json value={e.properties} /></section>
          <section><h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">User</h3>
            <p><Link className="text-primary hover:underline" to={`/users/${e.person_id}`}>{e.distinct_id}</Link>{e.anonymous_id && <span className="text-muted-foreground"> (anonymous id {e.anonymous_id})</span>}</p>{e.person && <Json value={e.person.properties} />}</section>
          <section className="grid grid-cols-2 gap-x-6 gap-y-1">
            <h3 className="col-span-2 mb-1 text-xs font-semibold uppercase text-muted-foreground">Request & device</h3>
            {[["Browser", [e.device.browser, e.device.browser_version].filter(Boolean).join(" ")], ["OS", [e.device.os, e.device.os_version].filter(Boolean).join(" ")], ["Device", e.device.device_type], ["Country", e.country], ["IP", e.ip], ["Path", e.path], ["Host", e.hostname], ["Received", fmtDateTime(e.received_at, tz)], ["Event ID", e.id]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-2 border-b border-border/50 py-1"><span className="text-muted-foreground">{k}</span><span className="truncate font-mono text-xs">{v || "–"}</span></div>))}
          </section>
          {e.user_agent && <p className="break-all font-mono text-xs text-muted-foreground">{e.user_agent}</p>}
        </div>)}
    </Dialog>
  );
}

export function EventsPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const active = activeFilters(filters);
  const params = { project_id: project.id, event: name || undefined, search: search || undefined, filters: active.length ? JSON.stringify(active) : undefined, timezone: timezone ?? undefined,
    ...(date_range.preset ? { preset: date_range.preset } : { date_from: date_range.from, date_to: date_range.to }) };
  const q = useInfiniteQuery({ queryKey: ["events", params], initialPageParam: undefined as string | undefined, queryFn: ({ pageParam }) => exploreApi.events({ ...params, cursor: pageParam, limit: 50 }), getNextPageParam: (l) => l.next_cursor ?? undefined });
  const rows: EventRow[] = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      <PageHeader title="Events" description="Live stream of raw events. Click a row to inspect properties, user and device metadata." actions={<a href={downloadUrl("/export/events", { project_id: project.id, format: "csv", event: name || undefined, ...(date_range.preset ? { preset: date_range.preset } : { date_from: date_range.from, date_to: date_range.to }), filters: active.length ? JSON.stringify(active) : undefined })}><Button><Download className="h-4 w-4" />Export CSV</Button></a>} />
      <Card className="mb-5"><CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-60"><EventPicker projectId={project.id} value={name} onChange={setName} label="Event name" placeholder="Any event" /></div>
          <div className="relative w-64"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search events" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, user or path" />{search && <button className="absolute right-2 top-2" aria-label="Clear search" onClick={() => setSearch("")}><X className="h-4 w-4" /></button>}</div>
        </div>
        <FilterBuilder projectId={project.id} filters={filters} onChange={setFilters} />
      </CardBody></Card>
      <Card>
        {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.isLoading ? <CardBody><LoadingBlock label="Loading events" /></CardBody> : !rows.length ? <EmptyState title="No events found" description="Nothing matches these filters in the selected date range." /> : (
          <>
            <Table><thead><tr><Th>Time</Th><Th>Event</Th><Th>User</Th><Th>Path</Th><Th>Properties</Th></tr></thead><tbody>{rows.map((e) => (
              <tr key={e.id} tabIndex={0} role="button" aria-label={`Inspect ${e.event} event`} className="cursor-pointer hover:bg-muted/60 focus-visible:bg-muted" onClick={() => setSelected(e.id)} onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), setSelected(e.id))}>
                <Td className="whitespace-nowrap tabular text-xs">{fmtDateTime(e.timestamp, timezone || project.settings.timezone)}</Td><Td><Badge tone="primary">{e.event}</Badge></Td>
                <Td className="max-w-[12rem] truncate font-mono text-xs">{e.distinct_id}</Td><Td className="max-w-[12rem] truncate font-mono text-xs">{e.path ?? "–"}</Td>
                <Td className="max-w-xs truncate font-mono text-xs text-muted-foreground">{JSON.stringify(e.properties)}</Td></tr>))}</tbody></Table>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground"><span>{rows.length} events loaded</span>{q.hasNextPage ? <Button loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>Load more</Button> : <span>End of results</span>}</div>
          </>)}
      </Card>
      <EventDetail projectId={project.id} id={selected} onClose={() => setSelected(null)} tz={timezone || project.settings.timezone} />
    </>
  );
}
