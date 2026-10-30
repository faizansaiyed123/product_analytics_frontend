import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { messageFor } from "@/services/api";
import { savedApi } from "@/services/endpoints";
import type { AnalyticsQuery, ChartType, Report } from "@/types";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Field, Input, Textarea } from "./ui/input";

export function SaveReportDialog({
  open,
  onOpenChange,
  projectId,
  query,
  chart,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  query: AnalyticsQuery;
  chart?: ChartType;
  existing?: Report | null;
  onSaved?: (r: Report) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const m = useMutation({
    mutationFn: () =>
      existing
        ? savedApi.updateReport(existing.id, { name, description, query, visualization: { chart } })
        : savedApi.createReport({ project_id: projectId, name, description, query, visualization: { chart } }),
    onSuccess: (r) => {
      toast.success(existing ? "Report updated" : "Report saved");
      qc.invalidateQueries({ queryKey: ["reports"] });
      onSaved?.(r);
      onOpenChange(false);
    },
    onError: (e) => toast.error(messageFor(e)),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={existing ? "Update report" : "Save as report"}
      description="Saved reports can be reopened, duplicated and added to dashboards."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} loading={m.isPending} onClick={() => m.mutate()}>
            {existing ? "Update" : "Save report"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name">
          {(id) => <Input id={id} autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />}
        </Field>
        <Field label="Description (optional)">
          {(id) => (
            <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          )}
        </Field>
      </div>
    </Dialog>
  );
}
