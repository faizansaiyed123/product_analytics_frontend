import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileBarChart } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge, EmptyState, ErrorState, LoadingBlock, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { savedApi } from "@/services/endpoints";
import type { Report } from "@/types";
import { can } from "@/types";
import { relativeTime } from "@/utils/format";

export const reportPath = (r: Report) => `/insights/${r.query.type === "trend" ? "trends" : r.query.type === "funnel" ? "funnels" : r.query.type === "retention" ? "retention" : r.query.type === "paths" ? "paths" : "trends"}?report=${r.id}`;

export function ReportsPage() {
  const project = useWorkspaceProject();
  const qc = useQueryClient();
  const canWrite = can(project.role, "member");
  const reports = useQuery({ queryKey: ["reports", project.id], queryFn: () => savedApi.reports(project.id) });
  const [del, setDel] = useState<Report | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["reports"] });
  const dup = useMutation({ mutationFn: (r: Report) => savedApi.duplicateReport(r.id), onSuccess: () => { toast.success("Report duplicated"); refresh(); }, onError: (e) => toast.error(messageFor(e)) });
  const remove = useMutation({ mutationFn: (r: Report) => savedApi.deleteReport(r.id), onSuccess: () => { toast.success("Report deleted"); setDel(null); refresh(); }, onError: (e) => toast.error(messageFor(e)) });
  return (
    <>
      <PageHeader title="Reports" description="Saved insights. Open one to edit it, or add it to a dashboard." />
      <Card>
        {reports.isLoading ? <CardBody><LoadingBlock label="Loading reports" height="h-32" /></CardBody> : reports.isError ? <ErrorState error={reports.error} onRetry={() => reports.refetch()} /> : !reports.data!.length ?
          <EmptyState icon={<FileBarChart className="h-8 w-8" />} title="No saved reports" description="Build a trend, funnel or retention analysis and choose “Save as report”." action={<Link to="/insights/trends"><Button variant="primary">Create a trend</Button></Link>} /> : (
          <Table><thead><tr><Th>Name</Th><Th>Type</Th><Th>Created by</Th><Th>Updated</Th><Th /></tr></thead><tbody>{reports.data!.map((r) => (
            <tr key={r.id}><Td><Link className="font-medium text-primary hover:underline" to={reportPath(r)}>{r.name}</Link>{r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}</Td><Td><Badge>{r.query.type}</Badge></Td><Td>{r.created_by_name ?? "–"}</Td><Td>{relativeTime(r.updated_at)}</Td>
              <Td className="text-right">{canWrite && <><Button size="sm" variant="ghost" aria-label={`Duplicate ${r.name}`} onClick={() => dup.mutate(r)}><Copy className="h-3.5 w-3.5" />Duplicate</Button><Button size="sm" variant="ghost" className="text-danger" onClick={() => setDel(r)}>Delete</Button></>}</Td></tr>))}</tbody></Table>)}
      </Card>
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} danger title="Delete report?" confirmLabel="Delete" loading={remove.isPending} onConfirm={() => del && remove.mutate(del)} description={`“${del?.name}” will be deleted. Dashboard widgets that use it must be removed first.`} />
    </>
  );
}
