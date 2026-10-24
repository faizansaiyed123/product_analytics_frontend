import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge, EmptyState, LoadingBlock } from "@/components/ui/misc";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { PROJECTS_KEY } from "@/hooks/useProject";
import { downloadUrl, messageFor } from "@/services/api";
import { projectApi, savedApi } from "@/services/endpoints";
import { can } from "@/types";
import { fmtNum, relativeTime } from "@/utils/format";

const RETENTION = [["", "Keep forever"], ["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["180", "180 days"], ["365", "365 days"]];

export function DataManagementPage() {
  const p = useWorkspaceProject();
  const qc = useQueryClient();
  const admin = can(p.role, "admin"), owner = p.role === "owner", member = can(p.role, "member");
  const usage = useQuery({ queryKey: ["usage", p.id], queryFn: () => projectApi.usage(p.id, 30) });
  const jobs = useQuery({ queryKey: ["export-jobs", p.id], queryFn: () => savedApi.exportJobs(p.id), enabled: member, refetchInterval: (q) => (q.state.data?.some((j) => j.status === "pending" || j.status === "running") ? 3000 : false) });
  const [ret, setRet] = useState(p.settings.retention_days === null ? "" : String(p.settings.retention_days));
  const [purge, setPurge] = useState(false);
  const [confirm, setConfirm] = useState("");
  const saveRet = useMutation({ mutationFn: () => projectApi.update(p.id, { settings: { retention_days: ret === "" ? null : Number(ret), retention_days_set: true } }), onSuccess: () => { toast.success("Retention updated. Cleanup runs hourly in the worker."); qc.invalidateQueries({ queryKey: PROJECTS_KEY }); }, onError: (e) => toast.error(messageFor(e)) });
  const doPurge = useMutation({ mutationFn: () => projectApi.purge(p.id, confirm), onSuccess: () => { toast.success("Purge scheduled - data is deleted in the background"); setPurge(false); setConfirm(""); }, onError: (e) => toast.error(messageFor(e)) });
  const job = useMutation({ mutationFn: (kind: "events" | "users") => savedApi.createExportJob({ project_id: p.id, kind, format: "csv", params: kind === "events" ? { date_range: { preset: "last_90_days" } } : {} }), onSuccess: () => { toast.success("Export queued"); qc.invalidateQueries({ queryKey: ["export-jobs"] }); }, onError: (e) => toast.error(messageFor(e)) });
  const t = usage.data?.totals;
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="API usage" description="Last 30 days of ingestion traffic." />
        <CardBody>
          {usage.isLoading ? <LoadingBlock label="Loading usage" height="h-40" /> : !usage.data?.days.length ? <EmptyState title="No ingestion yet" description="Send an event with your project API key and usage appears here." /> : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{[["Requests", t?.requests], ["Accepted", t?.events_accepted], ["Rejected", t?.events_rejected], ["Duplicates", t?.events_duplicate], ["Rate limited", t?.rate_limited]].map(([l, v]) => (
                <div key={l as string}><div className="text-xs text-muted-foreground">{l}</div><div className="text-lg font-semibold tabular">{fmtNum(v as number)}</div></div>))}</div>
              <div className="h-44" role="img" aria-label="Events accepted per day"><ResponsiveContainer width="100%" height="100%"><BarChart data={usage.data.days}><CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => String(d).slice(5)} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={40} /><Tooltip /><Bar dataKey="events_accepted" name="Events accepted" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
            </>)}
          <p className="mt-2 text-xs text-muted-foreground">Rate limit: {usage.data?.rate_limit_per_second ?? p.settings.rate_limit_per_second} requests/second per project.</p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Data retention" description="Events older than this are deleted by a scheduled job. People without remaining events are removed too." />
        <CardBody className="flex flex-wrap items-end gap-3">
          <Field label="Keep events for">{(id) => <Select id={id} className="w-48" value={ret} disabled={!admin} onChange={(e) => setRet(e.target.value)}>{RETENTION.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
          {admin && <Button variant="primary" loading={saveRet.isPending} onClick={() => saveRet.mutate()}>Save retention</Button>}
        </CardBody>
      </Card>
      {member && (
        <Card>
          <CardHeader title="Export data" description="Stream a download now, or queue a background job for very large datasets." />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <a href={downloadUrl("/export/events", { project_id: p.id, format: "csv", preset: "last_30_days" })}><Button>Events (CSV, 30 days)</Button></a>
              <a href={downloadUrl("/export/events", { project_id: p.id, format: "json", preset: "last_30_days" })}><Button>Events (JSON, 30 days)</Button></a>
              <a href={downloadUrl("/export/users", { project_id: p.id, format: "csv" })}><Button>Users (CSV)</Button></a>
              <a href={downloadUrl("/export/reports", { project_id: p.id, format: "json" })}><Button>Reports (JSON)</Button></a>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4"><Button loading={job.isPending} onClick={() => job.mutate("events")}>Queue events export (90 days)</Button><Button onClick={() => job.mutate("users")}>Queue users export</Button></div>
            {!!jobs.data?.length && <ul className="divide-y divide-border rounded-md border border-border text-sm">{jobs.data.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3 px-3 py-2"><span>{j.kind} · {j.format.toUpperCase()} · {relativeTime(j.created_at)}</span>
                <span className="flex items-center gap-2"><Badge tone={j.status === "done" ? "success" : j.status === "failed" ? "danger" : "warning"}>{j.status}</Badge>{j.status === "done" && <a className="text-primary hover:underline" href={downloadUrl(`/export/jobs/${j.id}/download`, {})}>Download ({fmtNum(j.row_count)} rows)</a>}{j.error && <span className="text-xs text-danger">{j.error}</span>}</span></li>))}</ul>}
          </CardBody>
        </Card>
      )}
      {owner && (
        <Card className="border-danger/40">
          <CardHeader title="Danger zone" />
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-medium">Delete all events and users</div><div className="text-xs text-muted-foreground">Removes every event and person in this project. Settings, dashboards and reports are kept.</div></div><Button variant="danger" onClick={() => setPurge(true)}>Delete all data</Button></div>
          </CardBody>
        </Card>
      )}
      <Dialog open={purge} onOpenChange={setPurge} title="Delete all project data?" description="This cannot be undone." footer={<><Button onClick={() => setPurge(false)}>Cancel</Button><Button variant="danger" disabled={confirm !== p.name} loading={doPurge.isPending} onClick={() => doPurge.mutate()}>Delete all data</Button></>}>
        <Field label={`Type "${p.name}" to confirm`}>{(id) => <Input id={id} value={confirm} onChange={(e) => setConfirm(e.target.value)} />}</Field>
      </Dialog>
    </div>
  );
}
