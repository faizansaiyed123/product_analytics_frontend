import { useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RetentionHeatmap } from "@/components/charts/Heatmap";
import { EventPicker } from "@/components/EventPicker";
import { ExportMenu } from "@/components/ExportMenu";
import { FilterBuilder } from "@/components/FilterBuilder";
import { InsightResult } from "@/components/InsightResult";
import { SaveReportDialog } from "@/components/SaveReportDialog";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { useInsight } from "@/hooks/useInsight";
import { useRange } from "@/hooks/useRange";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { savedApi } from "@/services/endpoints";
import type { Filter, Report, RetentionQuery, RetentionResult } from "@/types";
import { activeFilters } from "@/utils/filters";

const PRESETS: Record<string, { label: string; interval: RetentionQuery["interval"]; offsets: number[] }> = {
  days: { label: "Day 0, 1, 7, 14, 30", interval: "day", offsets: [0, 1, 7, 14, 30] },
  daily: { label: "Daily (first 8 days)", interval: "day", offsets: [0, 1, 2, 3, 4, 5, 6, 7] },
  weekly: { label: "Weekly (8 weeks)", interval: "week", offsets: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  monthly: { label: "Monthly (6 months)", interval: "month", offsets: [0, 1, 2, 3, 4, 5, 6] },
};

export function RetentionPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();
  const [sp] = useSearchParams();
  const reportId = sp.get("report");
  const [init, setInit] = useState("*");
  const [ret, setRet] = useState("*");
  const [preset, setPreset] = useState("days");
  const [type, setType] = useState<"first_time" | "recurring">("first_time");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [existing, setExisting] = useState<Report | null>(null);
  const loaded = useQuery({ queryKey: ["report", reportId], queryFn: () => savedApi.report(reportId!), enabled: !!reportId });
  useEffect(() => {
    const r = loaded.data;
    if (r?.query.type === "retention") { const q = r.query; setExisting(r); setInit(q.initial_event.event); setRet(q.return_event.event); setType(q.cohort_type); setFilters(q.filters);
      setPreset(Object.entries(PRESETS).find(([, p]) => p.interval === q.interval && JSON.stringify(p.offsets) === JSON.stringify(q.offsets))?.[0] ?? "daily"); }
  }, [loaded.data]);
  const ready = !!init.trim() && !!ret.trim();
  const p = PRESETS[preset];
  const query = useMemo<RetentionQuery>(() => ({ type: "retention", initial_event: { event: init }, return_event: { event: ret }, cohort_type: type, interval: p.interval, periods: Math.max(...p.offsets), offsets: p.offsets, date_range, filters: activeFilters(filters), timezone }),
    [init, ret, type, p, date_range, filters, timezone]);
  const q = useInsight<RetentionResult>(project.id, query, ready);
  return (
    <>
      <PageHeader title={existing ? existing.name : "Retention"} description="Of the people who start, how many come back?" actions={<><ExportMenu projectId={project.id} query={query} disabled={!ready} /><Button variant="primary" disabled={!ready} onClick={() => setSaveOpen(true)}><Save className="h-4 w-4" />{existing ? "Update report" : "Save as report"}</Button></>} />
      <Card className="mb-5"><CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cohort starts with">{() => <EventPicker projectId={project.id} value={init} allowAll label="Initial event" onChange={setInit} />}</Field>
          <Field label="Returns by doing">{() => <EventPicker projectId={project.id} value={ret} allowAll label="Return event" onChange={setRet} />}</Field>
          <Field label="Periods">{(id) => <Select id={id} value={preset} onChange={(e) => setPreset(e.target.value)}>{Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>}</Field>
          <Field label="Cohort type" hint={type === "first_time" ? "First ever time they did the initial event" : "Every period they did the initial event"}>{(id) => <Select id={id} value={type} onChange={(e) => setType(e.target.value as typeof type)}><option value="first_time">First time</option><option value="recurring">Recurring</option></Select>}</Field>
        </div>
        <FilterBuilder projectId={project.id} filters={filters} onChange={setFilters} />
      </CardBody></Card>
      <Card><CardHeader title="Retention by cohort" description="Cohorts are people whose first event falls in the selected date range. “–” means the period has not happened yet." />
        <CardBody><InsightResult q={q} ready={ready} emptyTitle="No cohorts" isEmpty={(r) => r.cohorts.length === 0}>{(r) => <RetentionHeatmap result={r} interval={r.interval} />}</InsightResult></CardBody></Card>
      {saveOpen && <SaveReportDialog open={saveOpen} onOpenChange={setSaveOpen} projectId={project.id} query={query} existing={existing} onSaved={setExisting} />}
    </>
  );
}
