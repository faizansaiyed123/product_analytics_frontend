import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EventPicker } from "@/components/EventPicker";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge, EmptyState, ErrorState, LoadingBlock, Table, Td, Th } from "@/components/ui/misc";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { savedApi } from "@/services/endpoints";
import { can } from "@/types";
import { fmtNum, relativeTime } from "@/utils/format";

const OPS: [string, string][] = [
  ["lt", "is below"],
  ["gt", "is above"],
  ["decrease_pct", "decreases by % vs previous period"],
  ["increase_pct", "increases by % vs previous period"],
];

export function AlertsPage() {
  const p = useWorkspaceProject();
  const qc = useQueryClient();
  const canWrite = can(p.role, "member");
  const alerts = useQuery({ queryKey: ["alerts", p.id], queryFn: () => savedApi.alerts(p.id) });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: "",
    event: "",
    metric: "total_events",
    operator: "lt",
    value: "",
    period: "day",
    webhook: "",
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["alerts", p.id] });
  const create = useMutation({
    mutationFn: () =>
      savedApi.createAlert({
        project_id: p.id,
        name: f.name,
        query: { event: f.event, metric: f.metric },
        condition: { operator: f.operator, value: Number(f.value) },
        period: f.period,
        webhook_url: f.webhook || null,
      }),
    onSuccess: () => {
      toast.success("Alert created");
      setOpen(false);
      refresh();
    },
    onError: (e) => toast.error(messageFor(e)),
  });
  const valid = f.name.trim() && f.event.trim() && f.value !== "" && Number(f.value) >= 0;
  return (
    <Card>
      <CardHeader
        title="Alerts"
        description="Evaluated by the background worker on the last completed hour/day/week. Notifications appear in the bell menu; webhooks are optional."
        actions={
          canWrite && (
            <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
              <BellPlus className="h-3.5 w-3.5" />
              New alert
            </Button>
          )
        }
      />
      {alerts.isLoading ? (
        <div className="p-4">
          <LoadingBlock label="Loading alerts" height="h-24" />
        </div>
      ) : alerts.isError ? (
        <ErrorState error={alerts.error} onRetry={() => alerts.refetch()} />
      ) : !alerts.data!.length ? (
        <EmptyState
          title="No alerts yet"
          description="Get notified when daily active users drop below a threshold, or when purchases fall by 20%."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Condition</Th>
              <Th>State</Th>
              <Th>Last value</Th>
              <Th>Evaluated</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {alerts.data!.map((a) => (
              <tr key={a.id}>
                <Td className="font-medium">{a.name}</Td>
                <Td className="text-xs">
                  {a.query.metric.replace("_", " ")} of <b>{a.query.event}</b>{" "}
                  {OPS.find((o) => o[0] === a.condition.operator)?.[1]} {a.condition.value} / {a.period}
                </Td>
                <Td>
                  <Badge tone={a.state === "firing" ? "danger" : a.state === "ok" ? "success" : "neutral"}>
                    {a.state}
                  </Badge>
                  {a.last_error && <div className="mt-1 text-xs text-danger">{a.last_error}</div>}
                </Td>
                <Td className="tabular">{fmtNum(a.last_value, 2)}</Td>
                <Td>{a.last_evaluated_at ? relativeTime(a.last_evaluated_at) : "Not yet"}</Td>
                <Td className="text-right">
                  {canWrite && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await savedApi.evaluateAlert(a.id);
                            toast.success("Alert evaluated");
                            refresh();
                            qc.invalidateQueries({ queryKey: ["notifications"] });
                          } catch (e) {
                            toast.error(messageFor(e));
                          }
                        }}
                      >
                        Evaluate now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={async () => {
                          await savedApi.deleteAlert(a.id);
                          refresh();
                        }}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="New alert"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!valid} loading={create.isPending} onClick={() => create.mutate()}>
              Create alert
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Name">
            {(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
          </Field>
          <Field label="Event">
            {() => <EventPicker projectId={p.id} value={f.event} onChange={(v) => setF({ ...f, event: v })} />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Metric">
              {(id) => (
                <Select id={id} value={f.metric} onChange={(e) => setF({ ...f, metric: e.target.value })}>
                  <option value="total_events">Total events</option>
                  <option value="unique_users">Unique users</option>
                </Select>
              )}
            </Field>
            <Field label="Period">
              {(id) => (
                <Select id={id} value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })}>
                  <option value="hour">Hour</option>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                </Select>
              )}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fires when value">
              {(id) => (
                <Select id={id} value={f.operator} onChange={(e) => setF({ ...f, operator: e.target.value })}>
                  {OPS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={f.operator.endsWith("pct") ? "Percent" : "Threshold"}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={f.value}
                  onChange={(e) => setF({ ...f, value: e.target.value })}
                />
              )}
            </Field>
          </div>
          <Field
            label="Webhook URL (optional)"
            hint="A JSON POST is sent when the alert starts firing. Private network addresses are blocked."
          >
            {(id) => (
              <Input
                id={id}
                type="url"
                value={f.webhook}
                onChange={(e) => setF({ ...f, webhook: e.target.value })}
                placeholder="https://"
              />
            )}
          </Field>
        </div>
      </Dialog>
    </Card>
  );
}
