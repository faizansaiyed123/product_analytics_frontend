import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { BellPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EventPicker } from "@/components/EventPicker";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  Field,
  Input,
  Select,
} from "@/components/ui/input";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Table,
  Td,
  Th,
} from "@/components/ui/misc";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { savedApi } from "@/services/endpoints";
import { can } from "@/types";
import {
  fmtNum,
  relativeTime,
} from "@/utils/format";

const OPERATORS: [string, string][] = [
  ["lt", "is below"],
  ["gt", "is above"],
  ["decrease_pct", "decreases by % vs previous period"],
  ["increase_pct", "increases by % vs previous period"],
];

export function AlertsPage() {
  const project = useWorkspaceProject();
  const queryClient = useQueryClient();
  const canWrite = can(project.role, "member");

  const alertsQuery = useQuery({
    queryKey: ["alerts", project.id],
    queryFn: () => savedApi.alerts(project.id),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    event: "",
    metric: "total_events",
    operator: "lt",
    value: "",
    period: "day",
    webhook: "",
  });

  const refreshAlerts = () =>
    queryClient.invalidateQueries({
      queryKey: ["alerts", project.id],
    });

  const createAlert = useMutation({
    mutationFn: () =>
      savedApi.createAlert({
        project_id: project.id,
        name: form.name,
        query: {
          event: form.event,
          metric: form.metric,
        },
        condition: {
          operator: form.operator,
          value: Number(form.value),
        },
        period: form.period,
        webhook_url: form.webhook || null,
      }),
    onSuccess: () => {
      toast.success("Alert created");
      setOpen(false);
      refreshAlerts();
    },
    onError: (error) => toast.error(messageFor(error)),
  });

  const valid =
    form.name.trim() &&
    form.event.trim() &&
    form.value !== "" &&
    Number(form.value) >= 0;

  const evaluateAlert = async (alertId: string) => {
    try {
      await savedApi.evaluateAlert(alertId);
      toast.success("Alert evaluated");
      refreshAlerts();
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    } catch (error) {
      toast.error(messageFor(error));
    }
  };

  const deleteAlert = async (alertId: string) => {
    await savedApi.deleteAlert(alertId);
    refreshAlerts();
  };

  return (
    <Card>
      <CardHeader
        title="Alerts"
        description="Evaluated by the background worker on the last completed hour/day/week. Notifications appear in the bell menu; webhooks are optional."
        actions={
          canWrite && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setOpen(true)}
            >
              <BellPlus className="h-3.5 w-3.5" />
              New alert
            </Button>
          )
        }
      />

      {alertsQuery.isLoading ? (
        <div className="p-4">
          <LoadingBlock
            label="Loading alerts"
            height="h-24"
          />
        </div>
      ) : alertsQuery.isError ? (
        <ErrorState
          error={alertsQuery.error}
          onRetry={() => alertsQuery.refetch()}
        />
      ) : !alertsQuery.data!.length ? (
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
            {alertsQuery.data!.map((alert) => (
              <tr key={alert.id}>
                <Td className="font-medium">{alert.name}</Td>
                <Td className="text-xs">
                  {alert.query.metric.replace("_", " ")}{" "}
                  of <b>{alert.query.event}</b>{" "}
                  {OPERATORS.find(
                    ([operator]) =>
                      operator === alert.condition.operator,
                  )?.[1]}{" "}
                  {alert.condition.value} / {alert.period}
                </Td>
                <Td>
                  <Badge
                    tone={
                      alert.state === "firing"
                        ? "danger"
                        : alert.state === "ok"
                          ? "success"
                          : "neutral"
                    }
                  >
                    {alert.state}
                  </Badge>
                  {alert.last_error && (
                    <div className="mt-1 text-xs text-danger">
                      {alert.last_error}
                    </div>
                  )}
                </Td>
                <Td className="tabular">
                  {fmtNum(alert.last_value, 2)}
                </Td>
                <Td>
                  {alert.last_evaluated_at
                    ? relativeTime(alert.last_evaluated_at)
                    : "Not yet"}
                </Td>
                <Td className="text-right">
                  {canWrite && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => evaluateAlert(alert.id)}
                      >
                        Evaluate now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => deleteAlert(alert.id)}
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
            <Button onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!valid}
              loading={createAlert.isPending}
              onClick={() => createAlert.mutate()}
            >
              Create alert
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Name">
            {(id) => (
              <Input
                id={id}
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
              />
            )}
          </Field>

          <Field label="Event">
            {() => (
              <EventPicker
                projectId={project.id}
                value={form.event}
                onChange={(value) =>
                  setForm({
                    ...form,
                    event: value,
                  })
                }
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Metric">
              {(id) => (
                <Select
                  id={id}
                  value={form.metric}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      metric: event.target.value,
                    })
                  }
                >
                  <option value="total_events">
                    Total events
                  </option>
                  <option value="unique_users">
                    Unique users
                  </option>
                </Select>
              )}
            </Field>

            <Field label="Period">
              {(id) => (
                <Select
                  id={id}
                  value={form.period}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      period: event.target.value,
                    })
                  }
                >
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
                <Select
                  id={id}
                  value={form.operator}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      operator: event.target.value,
                    })
                  }
                >
                  {OPERATORS.map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </Select>
              )}
            </Field>

            <Field
              label={
                form.operator.endsWith("pct")
                  ? "Percent"
                  : "Threshold"
              }
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={form.value}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      value: event.target.value,
                    })
                  }
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
                value={form.webhook}
                onChange={(event) =>
                  setForm({
                    ...form,
                    webhook: event.target.value,
                  })
                }
                placeholder="https://"
              />
            )}
          </Field>
        </div>
      </Dialog>
    </Card>
  );
}
