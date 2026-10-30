import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Copy, GripVertical, LayoutDashboard, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { RetentionHeatmap } from "@/components/charts/Heatmap";
import { DistributionChart, TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingBlock, PageHeader } from "@/components/ui/misc";
import { useInsight } from "@/hooks/useInsight";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { savedApi } from "@/services/endpoints";
import { useUI } from "@/stores/ui";
import type {
  AnalyticsQuery,
  ChartType,
  Dashboard,
  FunnelResult,
  Report,
  RetentionResult,
  TrendQuery,
  TrendResult,
  Widget,
} from "@/types";
import { can } from "@/types";
import { fmtNum, relativeTime } from "@/utils/format";

export function DashboardsPage() {
  const project = useWorkspaceProject();
  const nav = useNavigate();
  const qc = useQueryClient();
  const canWrite = can(project.role, "member");
  const list = useQuery({ queryKey: ["dashboards", project.id], queryFn: () => savedApi.dashboards(project.id) });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => savedApi.createDashboard(project.id, name.trim()),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["dashboards"] });
      setCreating(false);
      setName("");
      nav(`/dashboards/${d.id}`);
    },
    onError: (e) => toast.error(messageFor(e)),
  });
  return (
    <>
      <PageHeader
        title="Dashboards"
        description="Collections of insights you check regularly."
        actions={
          canWrite && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              New dashboard
            </Button>
          )
        }
      />
      {list.isLoading ? (
        <LoadingBlock label="Loading dashboards" />
      ) : list.isError ? (
        <Card>
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        </Card>
      ) : !list.data!.length ? (
        <Card>
          <EmptyState
            icon={<LayoutDashboard className="h-8 w-8" />}
            title="No dashboards yet"
            description="Create a dashboard, then add saved reports or build widgets directly."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.data!.map((d) => (
            <Link
              key={d.id}
              to={`/dashboards/${d.id}`}
              className="rounded-lg border border-border bg-card p-4 hover:border-primary/50"
            >
              <div className="font-medium">{d.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {d.config.widgets.length} widgets · updated {relativeTime(d.updated_at)}
              </div>
            </Link>
          ))}
        </div>
      )}
      <Dialog
        open={creating}
        onOpenChange={setCreating}
        title="New dashboard"
        footer={
          <>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!name.trim()}
              loading={create.isPending}
              onClick={() => create.mutate()}
            >
              Create
            </Button>
          </>
        }
      >
        <Field label="Name">
          {(id) => (
            <Input
              id={id}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && create.mutate()}
            />
          )}
        </Field>
      </Dialog>
    </>
  );
}

const SIZES: [string, number][] = [
  ["Small", 4],
  ["Medium", 6],
  ["Large", 8],
  ["Full", 12],
];
const HEIGHTS: [string, number][] = [
  ["Short", 3],
  ["Normal", 4],
  ["Tall", 6],
];

function WidgetBody({
  w,
  report,
  projectId,
  dateOverride,
}: {
  w: Widget;
  report?: Report;
  projectId: string;
  dateOverride?: any;
}) {
  const base = (w.report_id ? report?.query : w.query) as AnalyticsQuery | undefined;
  const query = base ? ({ ...base, ...(dateOverride ? { date_range: dateOverride } : {}) } as AnalyticsQuery) : null;
  const chart: ChartType = w.visualization.chart ?? report?.visualization.chart ?? "line";
  const q = useInsight<any>(projectId, query, !!query);
  if (!query)
    return <EmptyState title="Report not found" description="The saved report for this widget was deleted." />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingBlock label="Loading widget" height="h-40" />;
  const r = q.data.result;
  if (r.type === "trend") {
    const t = r as TrendResult;
    return t.kind === "distribution" ? (
      <DistributionChart result={t} height={180} />
    ) : (
      <TimeSeriesChart result={t} chart={chart} height={Math.max(160, w.layout.h * 56)} />
    );
  }
  if (r.type === "funnel") return <FunnelChart result={r as FunnelResult} />;
  if (r.type === "retention")
    return <RetentionHeatmap result={r as RetentionResult} interval={(r as RetentionResult).interval} />;
  if (r.type === "sessions")
    return (
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ["Sessions", fmtNum(r.summary.sessions)],
          ["Users", fmtNum(r.summary.unique_users)],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="text-2xl font-semibold tabular">{v}</div>
          </div>
        ))}
      </div>
    );
  return <p className="text-sm text-muted-foreground">Unsupported widget type</p>;
}

function KpiBody({ w, projectId }: { w: Widget; projectId: string }) {
  const q = useInsight<TrendResult>(projectId, w.query as TrendQuery, true);
  if (!q.data) return <LoadingBlock label="Loading KPI" height="h-16" />;
  return (
    <div className="text-3xl font-semibold tabular" data-testid="kpi-widget">
      {fmtNum(q.data.result.series[0]?.total ?? 0, 2)}
    </div>
  );
}

export function DashboardDetailPage() {
  const { id = "" } = useParams();
  const project = useWorkspaceProject();
  const nav = useNavigate();
  const qc = useQueryClient();
  const range = useUI((s) => s.dateRange);
  const canWrite = can(project.role, "member");
  const dash = useQuery({ queryKey: ["dashboard", id], queryFn: () => savedApi.dashboard(id) });
  const reports = useQuery({ queryKey: ["reports", project.id], queryFn: () => savedApi.reports(project.id) });
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [rename, setRename] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [useGlobalRange, setUseGlobalRange] = useState(true);
  const dragId = useRef<string | null>(null);
  useEffect(() => {
    if (dash.data) {
      setWidgets(dash.data.config.widgets);
      setDirty(false);
    }
  }, [dash.data]);
  const save = useMutation({
    mutationFn: () => savedApi.updateDashboard(id, { config: { widgets } }),
    onSuccess: (d) => {
      qc.setQueryData(["dashboard", id], d);
      setDirty(false);
      setEditing(false);
      toast.success("Dashboard saved");
    },
    onError: (e) => toast.error(messageFor(e)),
  });
  const renameM = useMutation({
    mutationFn: (name: string) => savedApi.updateDashboard(id, { name }),
    onSuccess: (d) => {
      qc.setQueryData(["dashboard", id], d);
      qc.invalidateQueries({ queryKey: ["dashboards"] });
      setRename(null);
    },
    onError: (e) => toast.error(messageFor(e)),
  });
  const dup = useMutation({
    mutationFn: () => savedApi.duplicateDashboard(id),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["dashboards"] });
      toast.success("Dashboard duplicated");
      nav(`/dashboards/${d.id}`);
    },
    onError: (e) => toast.error(messageFor(e)),
  });
  const remove = useMutation({
    mutationFn: () => savedApi.deleteDashboard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboards"] });
      toast.success("Dashboard deleted");
      nav("/dashboards");
    },
    onError: (e) => toast.error(messageFor(e)),
  });
  const change = (next: Widget[]) => {
    setWidgets(next);
    setDirty(true);
  };
  const patch = (wid: string, p: Partial<Widget>) => change(widgets.map((w) => (w.id === wid ? { ...w, ...p } : w)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= widgets.length) return;
    const n = [...widgets];
    [n[i], n[j]] = [n[j], n[i]];
    change(n);
  };
  const drop = (targetId: string) => {
    const from = widgets.findIndex((w) => w.id === dragId.current);
    const to = widgets.findIndex((w) => w.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const n = [...widgets];
    n.splice(to, 0, n.splice(from, 1)[0]);
    change(n);
  };
  if (dash.isError)
    return (
      <Card>
        <ErrorState error={dash.error} onRetry={() => dash.refetch()} />
      </Card>
    );
  if (!dash.data) return <LoadingBlock label="Loading dashboard" height="h-64" />;
  const d: Dashboard = dash.data;
  const repMap = new Map((reports.data ?? []).map((r) => [r.id, r]));
  const dateOverride = useGlobalRange ? range : undefined;
  return (
    <>
      <PageHeader
        title={d.name}
        description={d.description || `${widgets.length} widgets`}
        actions={
          <>
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={useGlobalRange} onChange={(e) => setUseGlobalRange(e.target.checked)} />
              Use header date range
            </label>
            {canWrite &&
              (editing ? (
                <>
                  <Button
                    onClick={() => {
                      setWidgets(d.config.widgets);
                      setDirty(false);
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
                    Save dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" />
                    Edit layout
                  </Button>
                  <Button onClick={() => setRename(d.name)}>Rename</Button>
                  <Button onClick={() => dup.mutate()}>
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </Button>
                  <Button variant="danger" onClick={() => setDel(true)}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              ))}
          </>
        }
      />
      {editing && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm">
          <span>Editing: drag widgets or use the arrows to reorder, pick a size, then save.</span>
          <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add widget
          </Button>
        </div>
      )}
      {!widgets.length ? (
        <Card>
          <EmptyState
            icon={<LayoutDashboard className="h-8 w-8" />}
            title="This dashboard is empty"
            description="Add a saved report to start."
            action={
              canWrite && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditing(true);
                    setAddOpen(true);
                  }}
                >
                  Add widget
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {widgets.map((w, i) => {
            const rep = w.report_id ? repMap.get(w.report_id) : undefined;
            const isKpi = w.visualization.chart === ("kpi" as ChartType);
            return (
              <section
                key={w.id}
                aria-label={w.title || rep?.name || "Widget"}
                draggable={editing}
                onDragStart={() => {
                  dragId.current = w.id;
                }}
                onDragOver={(e) => editing && e.preventDefault()}
                onDrop={() => editing && drop(w.id)}
                className={editing ? "ring-1 ring-primary/30 rounded-lg" : ""}
                style={{ gridColumn: `span ${Math.min(w.layout.w, 12)} / span ${Math.min(w.layout.w, 12)}` }}
              >
                <Card className="h-full">
                  <CardHeader
                    title={w.title || rep?.name || "Untitled"}
                    description={rep && w.title && w.title !== rep.name ? rep.name : undefined}
                    actions={
                      editing && (
                        <>
                          <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
                          <Select
                            aria-label={`Width of ${w.title || "widget"}`}
                            className="h-7 w-24 text-xs"
                            value={w.layout.w}
                            onChange={(e) => patch(w.id, { layout: { ...w.layout, w: Number(e.target.value) } })}
                          >
                            {SIZES.map(([l, v]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </Select>
                          <Select
                            aria-label={`Height of ${w.title || "widget"}`}
                            className="h-7 w-24 text-xs"
                            value={w.layout.h}
                            onChange={(e) => patch(w.id, { layout: { ...w.layout, h: Number(e.target.value) } })}
                          >
                            {HEIGHTS.map(([l, v]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Move widget up"
                            disabled={i === 0}
                            onClick={() => move(i, -1)}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Move widget down"
                            disabled={i === widgets.length - 1}
                            onClick={() => move(i, 1)}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove widget ${w.title || ""}`}
                            onClick={() => change(widgets.filter((x) => x.id !== w.id))}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </Button>
                        </>
                      )
                    }
                  />
                  <CardBody>
                    {isKpi ? (
                      <KpiBody w={w} projectId={project.id} />
                    ) : (
                      <WidgetBody w={w} report={rep} projectId={project.id} dateOverride={dateOverride} />
                    )}
                  </CardBody>
                </Card>
              </section>
            );
          })}
        </div>
      )}
      <AddWidgetDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        reports={reports.data ?? []}
        onAdd={(w) => {
          change([...widgets, { ...w, layout: { x: 0, y: widgets.length * 4, w: 6, h: 4 } }]);
          setAddOpen(false);
        }}
      />
      <Dialog
        open={rename !== null}
        onOpenChange={(o) => !o && setRename(null)}
        title="Rename dashboard"
        footer={
          <>
            <Button onClick={() => setRename(null)}>Cancel</Button>
            <Button variant="primary" disabled={!rename?.trim()} onClick={() => renameM.mutate(rename!.trim())}>
              Rename
            </Button>
          </>
        }
      >
        <Field label="Name">
          {(fid) => <Input id={fid} autoFocus value={rename ?? ""} onChange={(e) => setRename(e.target.value)} />}
        </Field>
      </Dialog>
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        danger
        title="Delete dashboard?"
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        description="The dashboard is removed. Its saved reports are not affected."
      />
    </>
  );
}

function AddWidgetDialog({
  open,
  onOpenChange,
  reports,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reports: Report[];
  onAdd: (w: Widget) => void;
}) {
  const [rid, setRid] = useState("");
  const [title, setTitle] = useState("");
  const [asKpi, setAsKpi] = useState(false);
  useEffect(() => {
    if (!open) {
      setRid("");
      setTitle("");
      setAsKpi(false);
    }
  }, [open]);
  const rep = reports.find((r) => r.id === rid);
  const kpiOk = rep?.query.type === "trend";
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add widget"
      description="Widgets show a saved report and stay in sync with it."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!rep}
            onClick={() =>
              rep &&
              onAdd(
                asKpi && kpiOk
                  ? {
                      id: crypto.randomUUID().slice(0, 12),
                      title: title || rep.name,
                      query: { ...(rep.query as TrendQuery), compare_previous: false },
                      visualization: { chart: "kpi" as ChartType },
                      layout: { x: 0, y: 0, w: 4, h: 3 },
                    }
                  : {
                      id: crypto.randomUUID().slice(0, 12),
                      title: title || rep.name,
                      report_id: rep.id,
                      visualization: {},
                      layout: { x: 0, y: 0, w: 6, h: 4 },
                    },
              )
            }
          >
            Add to dashboard
          </Button>
        </>
      }
    >
      {!reports.length ? (
        <p className="text-sm text-muted-foreground">
          You have no saved reports yet.{" "}
          <Link className="text-primary hover:underline" to="/insights/trends">
            Create one
          </Link>{" "}
          first.
        </p>
      ) : (
        <div className="space-y-3">
          <Field label="Report">
            {(fid) => (
              <Select
                id={fid}
                value={rid}
                onChange={(e) => {
                  setRid(e.target.value);
                  setTitle("");
                }}
              >
                <option value="">Select a report…</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.query.type})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Widget title (optional)">
            {(fid) => (
              <Input id={fid} value={title} placeholder={rep?.name} onChange={(e) => setTitle(e.target.value)} />
            )}
          </Field>
          {kpiOk && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={asKpi} onChange={(e) => setAsKpi(e.target.checked)} />
              Show as a single KPI number (total for the date range)
            </label>
          )}
        </div>
      )}
    </Dialog>
  );
}
