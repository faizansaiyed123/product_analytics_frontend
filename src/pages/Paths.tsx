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

export function PathsPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();
  const [type, setType] = useState<"event" | "page">("event");
  const [start, setStart] = useState("");
  const [depth, setDepth] = useState(4);
  const query = useMemo<PathsQuery>(() => ({ type: "paths", path_type: type, start_event: start || null, depth, max_nodes_per_step: 8, date_range, filters: [], timezone }), [type, start, depth, date_range, timezone]);
  const q = useInsight<PathsResult>(project.id, query);
  return (
    <>
      <PageHeader title="User journeys" description="The most common sequences of events (or pages) within a session." />
      <Card className="mb-5"><CardBody className="grid gap-3 sm:grid-cols-3">
        <Field label="Follow">{(id) => <Select id={id} value={type} onChange={(e) => { setType(e.target.value as typeof type); setStart(""); }}><option value="event">Events</option><option value="page">Pages ($pageview paths)</option></Select>}</Field>
        <Field label="Starting at (optional)">{() => type === "event" ? <EventPicker projectId={project.id} value={start} label="Start event" onChange={setStart} placeholder="Any first event" /> : <input aria-label="Start page" className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm" value={start} onChange={(e) => setStart(e.target.value)} placeholder="/pricing" />}</Field>
        <Field label="Steps">{(id) => <Select id={id} value={depth} onChange={(e) => setDepth(Number(e.target.value))}>{[3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n}</option>)}</Select>}</Field>
      </CardBody></Card>
      <Card><CardHeader title="Transitions" description="Most common next step from each step, across sessions" />
        <CardBody><InsightResult q={q} ready emptyTitle="No journeys found" isEmpty={(r) => r.edges.length === 0}>{(r) => {
          const steps = Array.from(new Set(r.edges.map((e) => e.step))).sort((a, b) => a - b);
          return <div className="space-y-5"><p className="text-sm text-muted-foreground">{fmtNum(r.sessions)} sessions analysed</p>
            {steps.map((s) => { const edges = r.edges.filter((e) => e.step === s); const max = Math.max(...edges.map((e) => e.count)); return (
              <section key={s} aria-label={`Step ${s} to ${s + 1}`}><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step {s} → {s + 1}</h3>
                <ul className="space-y-1.5">{edges.slice(0, 8).map((e) => (
                  <li key={`${e.source}>${e.target}`} className="grid grid-cols-[1fr_auto] items-center gap-3"><div className="relative overflow-hidden rounded bg-muted px-2 py-1 text-sm"><div className="absolute inset-y-0 left-0 bg-primary/20" style={{ width: `${(e.count / max) * 100}%` }} /><span className="relative flex items-center gap-2"><b className="truncate">{e.source}</b><ArrowRight className="h-3.5 w-3.5 shrink-0" aria-label="to" /><span className="truncate">{e.target}</span></span></div><span className="tabular text-sm">{fmtNum(e.count)}</span></li>))}</ul></section>); })}</div>; }}</InsightResult></CardBody></Card>
    </>
  );
}
