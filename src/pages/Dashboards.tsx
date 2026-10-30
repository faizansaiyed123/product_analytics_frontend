import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  LayoutDashboard,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { FunnelChart } from "@/components/charts/FunnelChart";
import { RetentionHeatmap } from "@/components/charts/Heatmap";
import {
  DistributionChart,
  TimeSeriesChart,
} from "@/components/charts/TimeSeriesChart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
} from "@/components/ui/card";
import {
  ConfirmDialog,
  Dialog,
} from "@/components/ui/dialog";
import {
  Field,
  Input,
  Select,
} from "@/components/ui/input";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/ui/misc";
import { useInsight } from "@/hooks/useInsight";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { savedApi } from "@/services/endpoints";
import { useUI } from "@/stores/ui";
import { can } from "@/types";
import type {
  AnalyticsQuery,
  AnalyticsResult,
  ChartType,
  Dashboard,
  DateRange,
  FunnelResult,
  Report,
  RetentionResult,
  TrendQuery,
  TrendResult,
  Widget,
} from "@/types";
import { fmtNum, relativeTime } from "@/utils/format";

const WIDGET_WIDTHS: [string, number][] = [
  ["Small", 4],
  ["Medium", 6],
  ["Large", 8],
  ["Full", 12],
];

const WIDGET_HEIGHTS: [string, number][] = [
  ["Short", 3],
  ["Normal", 4],
  ["Tall", 6],
];

export function DashboardsPage() {
  const project = useWorkspaceProject();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canWrite = can(project.role, "member");

  const dashboardsQuery = useQuery({
    queryKey: ["dashboards", project.id],
    queryFn: () =>
      savedApi.dashboards(project.id),
  });

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const createDashboard = useMutation({
    mutationFn: () =>
      savedApi.createDashboard(
        project.id,
        name.trim(),
      ),
    onSuccess: (dashboard) => {
      queryClient.invalidateQueries({
        queryKey: ["dashboards"],
      });
      setCreating(false);
      setName("");
      navigate(
        `/dashboards/${dashboard.id}`,
      );
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  const handleCreate = () => {
    if (name.trim()) {
      createDashboard.mutate();
    }
  };

  return (
    <>
      <PageHeader
        title="Dashboards"
        description="Collections of insights you check regularly."
        actions={
          canWrite && (
            <Button
              variant="primary"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-4 w-4" />
              New dashboard
            </Button>
          )
        }
      />

      {dashboardsQuery.isLoading ? (
        <LoadingBlock label="Loading dashboards" />
      ) : dashboardsQuery.isError ? (
        <Card>
          <ErrorState
            error={dashboardsQuery.error}
            onRetry={() =>
              dashboardsQuery.refetch()
            }
          />
        </Card>
      ) : !dashboardsQuery.data?.length ? (
        <Card>
          <EmptyState
            icon={<LayoutDashboard className="h-8 w-8" />}
            title="No dashboards yet"
            description="Create a dashboard, then add saved reports or build widgets directly."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardsQuery.data.map(
            (dashboard) => (
              <Link
                key={dashboard.id}
                to={`/dashboards/${dashboard.id}`}
                className="rounded-lg border border-border bg-card p-4 hover:border-primary/50"
              >
                <div className="font-medium">
                  {dashboard.name}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {dashboard.config.widgets.length}{" "}
                  widgets · updated{" "}
                  {relativeTime(
                    dashboard.updated_at,
                  )}
                </div>
              </Link>
            ),
          )}
        </div>
      )}

      <Dialog
        open={creating}
        onOpenChange={setCreating}
        title="New dashboard"
        footer={
          <>
            <Button
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!name.trim()}
              loading={createDashboard.isPending}
              onClick={handleCreate}
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
              onChange={(event) =>
                setName(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  name.trim()
                ) {
                  handleCreate();
                }
              }}
            />
          )}
        </Field>
      </Dialog>
    </>
  );
}

function WidgetBody({
  widget,
  report,
  projectId,
  dateOverride,
}: {
  widget: Widget;
  report?: Report;
  projectId: string;
  dateOverride?: DateRange;
}) {
  const baseQuery = (
    widget.report_id ? report?.query : widget.query
  ) as AnalyticsQuery | undefined;

  const query = baseQuery
    ? {
        ...baseQuery,
        ...(dateOverride
          ? { date_range: dateOverride }
          : {}),
      }
    : null;

  const chart: ChartType =
    widget.visualization.chart ??
    report?.visualization.chart ??
    "line";

  const insightQuery = useInsight<AnalyticsResult>(
    projectId,
    query,
    !!query,
  );

  if (!query) {
    return (
      <EmptyState
        title="Report not found"
        description="The saved report for this widget was deleted."
      />
    );
  }

  if (insightQuery.isError) {
    return (
      <ErrorState
        error={insightQuery.error}
        onRetry={() =>
          insightQuery.refetch()
        }
      />
    );
  }

  if (!insightQuery.data) {
    return (
      <LoadingBlock
        label="Loading widget"
        height="h-40"
      />
    );
  }

  const result = insightQuery.data.result;

  switch (result.type) {
    case "trend":
      return result.kind === "distribution" ? (
        <DistributionChart
          result={result}
          height={180}
        />
      ) : (
        <TimeSeriesChart
          result={result}
          chart={chart}
          height={Math.max(
            160,
            widget.layout.h * 56,
          )}
        />
      );

    case "funnel":
      return (
        <FunnelChart
          result={result as FunnelResult}
        />
      );

    case "retention":
      return (
        <RetentionHeatmap
          result={result as RetentionResult}
          interval={result.interval}
        />
      );

    case "sessions":
      return (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">
              Sessions
            </div>
            <div className="text-2xl font-semibold tabular">
              {fmtNum(result.summary.sessions)}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">
              Users
            </div>
            <div className="text-2xl font-semibold tabular">
              {fmtNum(
                result.summary.unique_users,
              )}
            </div>
          </div>
        </div>
      );

    default:
      return (
        <p className="text-sm text-muted-foreground">
          Unsupported widget type
        </p>
      );
  }
}

function KpiBody({
  widget,
  projectId,
}: {
  widget: Widget;
  projectId: string;
}) {
  const insightQuery = useInsight<TrendResult>(
    projectId,
    widget.query as TrendQuery,
    true,
  );

  if (!insightQuery.data) {
    return (
      <LoadingBlock
        label="Loading KPI"
        height="h-16"
      />
    );
  }

  return (
    <div
      className="text-3xl font-semibold tabular"
      data-testid="kpi-widget"
    >
      {fmtNum(
        insightQuery.data.result.series[0]?.total ??
          0,
        2,
      )}
    </div>
  );
}

function DashboardEditBanner({
  onAddWidget,
}: {
  onAddWidget: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm">
      <span>
        Editing: drag widgets or use the arrows to
        reorder, pick a size, then save.
      </span>

      <Button
        size="sm"
        variant="primary"
        onClick={onAddWidget}
      >
        <Plus className="h-3.5 w-3.5" />
        Add widget
      </Button>
    </div>
  );
}

function WidgetEditorActions({
  widget,
  index,
  widgetCount,
  onPatch,
  onMove,
  onRemove,
}: {
  widget: Widget;
  index: number;
  widgetCount: number;
  onPatch: (
    widgetId: string,
    patch: Partial<Widget>,
  ) => void;
  onMove: (
    index: number,
    direction: -1 | 1,
  ) => void;
  onRemove: (widgetId: string) => void;
}) {
  const widgetTitle =
    widget.title || "widget";

  return (
    <>
      <GripVertical
        className="h-4 w-4 cursor-grab text-muted-foreground"
        aria-hidden
      />

      <Select
        aria-label={`Width of ${widgetTitle}`}
        className="h-7 w-24 text-xs"
        value={widget.layout.w}
        onChange={(event) =>
          onPatch(widget.id, {
            layout: {
              ...widget.layout,
              w: Number(event.target.value),
            },
          })
        }
      >
        {WIDGET_WIDTHS.map(
          ([label, value]) => (
            <option
              key={value}
              value={value}
            >
              {label}
            </option>
          ),
        )}
      </Select>

      <Select
        aria-label={`Height of ${widgetTitle}`}
        className="h-7 w-24 text-xs"
        value={widget.layout.h}
        onChange={(event) =>
          onPatch(widget.id, {
            layout: {
              ...widget.layout,
              h: Number(event.target.value),
            },
          })
        }
      >
        {WIDGET_HEIGHTS.map(
          ([label, value]) => (
            <option
              key={value}
              value={value}
            >
              {label}
            </option>
          ),
        )}
      </Select>

      <Button
        size="icon"
        variant="ghost"
        aria-label="Move widget up"
        disabled={index === 0}
        onClick={() =>
          onMove(index, -1)
        }
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        aria-label="Move widget down"
        disabled={
          index === widgetCount - 1
        }
        onClick={() =>
          onMove(index, 1)
        }
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        aria-label={`Remove widget ${widget.title || ""}`}
        onClick={() => onRemove(widget.id)}
      >
        <Trash2 className="h-3.5 w-3.5 text-danger" />
      </Button>
    </>
  );
}

function DashboardWidget({
  widget,
  report,
  projectId,
  dateOverride,
  editing,
  index,
  widgetCount,
  onPatch,
  onMove,
  onRemove,
  onDragStart,
  onDrop,
}: {
  widget: Widget;
  report?: Report;
  projectId: string;
  dateOverride?: DateRange;
  editing: boolean;
  index: number;
  widgetCount: number;
  onPatch: (
    widgetId: string,
    patch: Partial<Widget>,
  ) => void;
  onMove: (
    index: number,
    direction: -1 | 1,
  ) => void;
  onRemove: (widgetId: string) => void;
  onDragStart: (widgetId: string) => void;
  onDrop: (widgetId: string) => void;
}) {
  const isKpi =
    widget.visualization.chart ===
    ("kpi" as ChartType);

  const title =
    widget.title ||
    report?.name ||
    "Widget";

  return (
    <section
      aria-label={title}
      draggable={editing}
      onDragStart={() =>
        onDragStart(widget.id)
      }
      onDragOver={(event) => {
        if (editing) {
          event.preventDefault();
        }
      }}
      onDrop={() => {
        if (editing) {
          onDrop(widget.id);
        }
      }}
      className={
        editing
          ? "rounded-lg ring-1 ring-primary/30"
          : ""
      }
      style={{
        gridColumn: `span ${Math.min(
          widget.layout.w,
          12,
        )} / span ${Math.min(
          widget.layout.w,
          12,
        )}`,
      }}
    >
      <Card className="h-full">
        <CardHeader
          title={title}
          description={
            report &&
            widget.title &&
            widget.title !== report.name
              ? report.name
              : undefined
          }
          actions={
            editing ? (
              <WidgetEditorActions
                widget={widget}
                index={index}
                widgetCount={widgetCount}
                onPatch={onPatch}
                onMove={onMove}
                onRemove={onRemove}
              />
            ) : undefined
          }
        />

        <CardBody>
          {isKpi ? (
            <KpiBody
              widget={widget}
              projectId={projectId}
            />
          ) : (
            <WidgetBody
              widget={widget}
              report={report}
              projectId={projectId}
              dateOverride={dateOverride}
            />
          )}
        </CardBody>
      </Card>
    </section>
  );
}

function DashboardDialogs({
  rename,
  setRename,
  renameDashboard,
  deleteOpen,
  setDeleteOpen,
  deleteLoading,
  removeDashboard,
  addWidgetOpen,
  setAddWidgetOpen,
  reports,
  onAddWidget,
}: {
  rename: string | null;
  setRename: (name: string | null) => void;
  renameDashboard: (name: string) => void;
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  deleteLoading: boolean;
  removeDashboard: () => void;
  addWidgetOpen: boolean;
  setAddWidgetOpen: (open: boolean) => void;
  reports: Report[];
  onAddWidget: (widget: Widget) => void;
}) {
  return (
    <>
      <AddWidgetDialog
        open={addWidgetOpen}
        onOpenChange={setAddWidgetOpen}
        reports={reports}
        onAdd={onAddWidget}
      />

      <Dialog
        open={rename !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRename(null);
          }
        }}
        title="Rename dashboard"
        footer={
          <>
            <Button
              onClick={() => setRename(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!rename?.trim()}
              onClick={() =>
                renameDashboard(rename!.trim())
              }
            >
              Rename
            </Button>
          </>
        }
      >
        <Field label="Name">
          {(fieldId) => (
            <Input
              id={fieldId}
              autoFocus
              value={rename ?? ""}
              onChange={(event) =>
                setRename(event.target.value)
              }
            />
          )}
        </Field>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        danger
        title="Delete dashboard?"
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={removeDashboard}
        description="The dashboard is removed. Its saved reports are not affected."
      />
    </>
  );
}

export function DashboardDetailPage() {
  const { id = "" } = useParams();
  const project = useWorkspaceProject();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const range = useUI(
    (state) => state.dateRange,
  );
  const canWrite = can(project.role, "member");

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", id],
    queryFn: () => savedApi.dashboard(id),
  });

  const reportsQuery = useQuery({
    queryKey: ["reports", project.id],
    queryFn: () =>
      savedApi.reports(project.id),
  });

  const [widgets, setWidgets] =
    useState<Widget[]>([]);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] =
    useState(false);
  const [addWidgetOpen, setAddWidgetOpen] =
    useState(false);
  const [rename, setRename] =
    useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] =
    useState(false);
  const [useGlobalRange, setUseGlobalRange] =
    useState(true);

  const dragId =
    useRef<string | null>(null);

  useEffect(() => {
    if (dashboardQuery.data) {
      setWidgets(
        dashboardQuery.data.config.widgets,
      );
      setDirty(false);
    }
  }, [dashboardQuery.data]);

  const saveDashboard = useMutation({
    mutationFn: () =>
      savedApi.updateDashboard(id, {
        config: { widgets },
      }),
    onSuccess: (dashboard) => {
      queryClient.setQueryData(
        ["dashboard", id],
        dashboard,
      );
      setDirty(false);
      setEditing(false);
      toast.success("Dashboard saved");
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  const renameDashboard = useMutation({
    mutationFn: (name: string) =>
      savedApi.updateDashboard(id, { name }),
    onSuccess: (dashboard) => {
      queryClient.setQueryData(
        ["dashboard", id],
        dashboard,
      );
      queryClient.invalidateQueries({
        queryKey: ["dashboards"],
      });
      setRename(null);
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  const duplicateDashboard = useMutation({
    mutationFn: () =>
      savedApi.duplicateDashboard(id),
    onSuccess: (dashboard) => {
      queryClient.invalidateQueries({
        queryKey: ["dashboards"],
      });
      toast.success("Dashboard duplicated");
      navigate(
        `/dashboards/${dashboard.id}`,
      );
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  const removeDashboard = useMutation({
    mutationFn: () =>
      savedApi.deleteDashboard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dashboards"],
      });
      toast.success("Dashboard deleted");
      navigate("/dashboards");
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  const changeWidgets = (
    nextWidgets: Widget[],
  ) => {
    setWidgets(nextWidgets);
    setDirty(true);
  };

  const patchWidget = (
    widgetId: string,
    patch: Partial<Widget>,
  ) => {
    changeWidgets(
      widgets.map((widget) =>
        widget.id === widgetId
          ? { ...widget, ...patch }
          : widget,
      ),
    );
  };

  const moveWidget = (
    index: number,
    direction: -1 | 1,
  ) => {
    const nextIndex = index + direction;

    if (
      nextIndex < 0 ||
      nextIndex >= widgets.length
    ) {
      return;
    }

    const nextWidgets = [...widgets];

    [
      nextWidgets[index],
      nextWidgets[nextIndex],
    ] = [
      nextWidgets[nextIndex],
      nextWidgets[index],
    ];

    changeWidgets(nextWidgets);
  };

  const dropWidget = (
    targetId: string,
  ) => {
    const sourceIndex =
      widgets.findIndex(
        (widget) =>
          widget.id === dragId.current,
      );

    const targetIndex =
      widgets.findIndex(
        (widget) => widget.id === targetId,
      );

    if (
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex === targetIndex
    ) {
      return;
    }

    const nextWidgets = [...widgets];

    nextWidgets.splice(
      targetIndex,
      0,
      nextWidgets.splice(sourceIndex, 1)[0],
    );

    changeWidgets(nextWidgets);
  };

  const cancelEditing = () => {
    if (!dashboardQuery.data) {
      return;
    }

    setWidgets(
      dashboardQuery.data.config.widgets,
    );
    setDirty(false);
    setEditing(false);
  };

  const addWidget = (widget: Widget) => {
    changeWidgets([
      ...widgets,
      {
        ...widget,
        layout: {
          x: 0,
          y: widgets.length * 4,
          w: 6,
          h: 4,
        },
      },
    ]);
    setAddWidgetOpen(false);
  };

  if (dashboardQuery.isError) {
    return (
      <Card>
        <ErrorState
          error={dashboardQuery.error}
          onRetry={() =>
            dashboardQuery.refetch()
          }
        />
      </Card>
    );
  }

  if (!dashboardQuery.data) {
    return (
      <LoadingBlock
        label="Loading dashboard"
        height="h-64"
      />
    );
  }

  const dashboard: Dashboard =
    dashboardQuery.data;

  const reportMap = new Map(
    (reportsQuery.data ?? []).map(
      (report) => [report.id, report],
    ),
  );

  const dateOverride = useGlobalRange
    ? range
    : undefined;

  return (
    <>
      <PageHeader
        title={dashboard.name}
        description={
          dashboard.description ||
          `${widgets.length} widgets`
        }
        actions={
          <>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={useGlobalRange}
                onChange={(event) =>
                  setUseGlobalRange(
                    event.target.checked,
                  )
                }
              />
              Use header date range
            </label>

            {canWrite &&
              (editing ? (
                <>
                  <Button onClick={cancelEditing}>
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    disabled={!dirty}
                    loading={
                      saveDashboard.isPending
                    }
                    onClick={() =>
                      saveDashboard.mutate()
                    }
                  >
                    Save dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() =>
                      setEditing(true)
                    }
                  >
                    <Pencil className="h-4 w-4" />
                    Edit layout
                  </Button>

                  <Button
                    onClick={() =>
                      setRename(dashboard.name)
                    }
                  >
                    Rename
                  </Button>

                  <Button
                    onClick={() =>
                      duplicateDashboard.mutate()
                    }
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </Button>

                  <Button
                    variant="danger"
                    onClick={() =>
                      setDeleteOpen(true)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              ))}
          </>
        }
      />

      {editing && (
        <DashboardEditBanner
          onAddWidget={() =>
            setAddWidgetOpen(true)
          }
        />
      )}

      {!widgets.length ? (
        <Card>
          <EmptyState
            icon={
              <LayoutDashboard className="h-8 w-8" />
            }
            title="This dashboard is empty"
            description="Add a saved report to start."
            action={
              canWrite && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditing(true);
                    setAddWidgetOpen(true);
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
          {widgets.map(
            (widget, index) => (
              <DashboardWidget
                key={widget.id}
                widget={widget}
                report={
                  widget.report_id
                    ? reportMap.get(
                        widget.report_id,
                      )
                    : undefined
                }
                projectId={project.id}
                dateOverride={dateOverride}
                editing={editing}
                index={index}
                widgetCount={widgets.length}
                onPatch={patchWidget}
                onMove={moveWidget}
                onRemove={(widgetId) =>
                  changeWidgets(
                    widgets.filter(
                      (item) =>
                        item.id !== widgetId,
                    ),
                  )
                }
                onDragStart={(widgetId) => {
                  dragId.current = widgetId;
                }}
                onDrop={dropWidget}
              />
            ),
          )}
        </div>
      )}

      <DashboardDialogs
        rename={rename}
        setRename={setRename}
        renameDashboard={(name) =>
          renameDashboard.mutate(name)
        }
        deleteOpen={deleteOpen}
        setDeleteOpen={setDeleteOpen}
        deleteLoading={
          removeDashboard.isPending
        }
        removeDashboard={() =>
          removeDashboard.mutate()
        }
        addWidgetOpen={addWidgetOpen}
        setAddWidgetOpen={setAddWidgetOpen}
        reports={reportsQuery.data ?? []}
        onAddWidget={addWidget}
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
  onOpenChange: (open: boolean) => void;
  reports: Report[];
  onAdd: (widget: Widget) => void;
}) {
  const [reportId, setReportId] =
    useState("");
  const [title, setTitle] = useState("");
  const [asKpi, setAsKpi] =
    useState(false);

  useEffect(() => {
    if (!open) {
      setReportId("");
      setTitle("");
      setAsKpi(false);
    }
  }, [open]);

  const selectedReport = reports.find(
    (report) => report.id === reportId,
  );

  const canCreateKpi =
    selectedReport?.query.type === "trend";

  const handleReportChange = (
    nextReportId: string,
  ) => {
    setReportId(nextReportId);
    setTitle("");
  };

  const createWidget = () => {
    if (!selectedReport) {
      return;
    }

    if (asKpi && canCreateKpi) {
      onAdd({
        id: crypto
          .randomUUID()
          .slice(0, 12),
        title:
          title || selectedReport.name,
        query: {
          ...(selectedReport.query as TrendQuery),
          compare_previous: false,
        },
        visualization: {
          chart: "kpi" as ChartType,
        },
        layout: {
          x: 0,
          y: 0,
          w: 4,
          h: 3,
        },
      });
      return;
    }

    onAdd({
      id: crypto
        .randomUUID()
        .slice(0, 12),
      title:
        title || selectedReport.name,
      report_id: selectedReport.id,
      visualization: {},
      layout: {
        x: 0,
        y: 0,
        w: 6,
        h: 4,
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add widget"
      description="Widgets show a saved report and stay in sync with it."
      footer={
        <>
          <Button
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            disabled={!selectedReport}
            onClick={createWidget}
          >
            Add to dashboard
          </Button>
        </>
      }
    >
      {!reports.length ? (
        <p className="text-sm text-muted-foreground">
          You have no saved reports yet.{" "}
          <Link
            className="text-primary hover:underline"
            to="/insights/trends"
          >
            Create one
          </Link>{" "}
          first.
        </p>
      ) : (
        <div className="space-y-3">
          <Field label="Report">
            {(fieldId) => (
              <Select
                id={fieldId}
                value={reportId}
                onChange={(event) =>
                  handleReportChange(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Select a report…
                </option>

                {reports.map((report) => (
                  <option
                    key={report.id}
                    value={report.id}
                  >
                    {report.name} (
                    {report.query.type})
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Widget title (optional)">
            {(fieldId) => (
              <Input
                id={fieldId}
                value={title}
                placeholder={
                  selectedReport?.name
                }
                onChange={(event) =>
                  setTitle(event.target.value)
                }
              />
            )}
          </Field>

          {canCreateKpi && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={asKpi}
                onChange={(event) =>
                  setAsKpi(
                    event.target.checked,
                  )
                }
              />
              Show as a single KPI number
              (total for the date range)
            </label>
          )}
        </div>
      )}
    </Dialog>
  );
}
