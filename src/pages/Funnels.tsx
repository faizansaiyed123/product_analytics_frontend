import { useQuery } from "@tanstack/react-query";
import { Plus, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { EventPicker } from "@/components/EventPicker";
import { ExportMenu } from "@/components/ExportMenu";
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
import type { Filter, FunnelQuery, FunnelResult, Report } from "@/types";
import { activeFilters } from "@/utils/filters";

export function FunnelsPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();
  const [sp] = useSearchParams();
  const reportId = sp.get("report");
  const [steps, setSteps] = useState<string[]>(["$pageview", ""]);
  const [win, setWin] = useState(14);
  const [unit, setUnit] = useState<FunnelQuery["conversion_window"]["unit"]>("day");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [bProp, setBProp] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [existing, setExisting] = useState<Report | null>(null);
  const loaded = useQuery({ queryKey: ["report", reportId], queryFn: () => savedApi.report(reportId!), enabled: !!reportId });
  useEffect(() => {
    const r = loaded.data;
    if (r?.query.type === "funnel") { setExisting(r); setSteps(r.query.steps.map((s) => s.event)); setWin(r.query.conversion_window.value); setUnit(r.query.conversion_window.unit); setFilters(r.query.filters); setBProp(r.query.breakdown?.property ?? ""); }
  }, [loaded.data]);
  const ready = steps.length >= 2 && steps.every((s) => s.trim()) && win >= 1;
  const query = useMemo<FunnelQuery>(() => ({
    type: "funnel", steps: steps.map((event) => ({ event })), date_range, conversion_window: { value: win, unit }, filters: activeFilters(filters), breakdown: bProp ? { type: "event", property: bProp, limit: 10 } : null, timezone,
  }), [steps, date_range, win, unit, filters, bProp, timezone]);
  const q = useInsight<FunnelResult>(project.id, query, ready);
  return (
    <>
      <PageHeader title={existing ? existing.name : "Funnels"} description="Where do people drop off between steps?" actions={<><ExportMenu projectId={project.id} query={query} disabled={!ready} /><Button variant="primary" disabled={!ready} onClick={() => setSaveOpen(true)}><Save className="h-4 w-4" />{existing ? "Update report" : "Save as report"}</Button></>} />
      <Card className="mb-5"><CardBody className="space-y-4">
        <ol className="space-y-2">{steps.map((s, i) => (
          <li key={i} className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">{i + 1}</span>
            <div className="max-w-sm flex-1"><EventPicker projectId={project.id} value={s} label={`Step ${i + 1} event`} placeholder={`Step ${i + 1}`} onChange={(v) => setSteps(steps.map((x, j) => (j === i ? v : x)))} /></div>
            {steps.length > 2 && <Button variant="ghost" size="icon" aria-label={`Remove step ${i + 1}`} onClick={() => setSteps(steps.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>}</li>))}</ol>
        {steps.length < 10 && <Button size="sm" onClick={() => setSteps([...steps, ""])}><Plus className="h-3.5 w-3.5" />Add step</Button>}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Conversion window">{() => <div className="flex gap-1"><Input aria-label="Window length" type="number" min={1} className="w-20" value={win} onChange={(e) => setWin(Math.max(1, Number(e.target.value)))} />
            <Select aria-label="Window unit" value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)}>{["minute", "hour", "day", "week"].map((u) => <option key={u}>{u}</option>)}</Select></div>}</Field>
          <Field label="Break down by (first step property)">{(id) => <Input id={id} value={bProp} onChange={(e) => setBProp(e.target.value)} placeholder="e.g. $country or plan" />}</Field>
        </div>
        <FilterBuilder projectId={project.id} filters={filters} onChange={setFilters} />
      </CardBody></Card>
      <Card><CardHeader title="Funnel" description="Steps must happen in order within the conversion window, counted per person. See docs/analytics.md for the exact rules." />
        <CardBody><InsightResult q={q} ready={ready} emptyTitle="Nobody entered this funnel" isEmpty={(r) => r.steps[0].count === 0} emptyHint="Choose an event for every step.">{(r) => <FunnelChart result={r} />}</InsightResult></CardBody></Card>
      {saveOpen && <SaveReportDialog open={saveOpen} onOpenChange={setSaveOpen} projectId={project.id} query={query} existing={existing} onSaved={setExisting} />}
    </>
  );
}
