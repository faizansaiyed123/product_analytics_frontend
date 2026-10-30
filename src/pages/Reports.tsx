import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Copy, FileBarChart } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui/misc";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { savedApi } from "@/services/endpoints";
import { can } from "@/types";
import type { Report } from "@/types";
import { relativeTime } from "@/utils/format";

export const reportPath = (report: Report) => {
  const paths = {
    trend: "trends",
    funnel: "funnels",
    retention: "retention",
    paths: "paths",
  } as const;

  const path =
    paths[
      report.query.type as keyof typeof paths
    ] ?? "trends";

  return \`/insights/\${path}?report=\${report.id}\`;
};

export function ReportsPage() {
  const project = useWorkspaceProject();
  const queryClient = useQueryClient();
  const canWrite = can(project.role, "member");

  const reportsQuery = useQuery({
    queryKey: ["reports", project.id],
    queryFn: () => savedApi.reports(project.id),
  });

  const [deleteTarget, setDeleteTarget] =
    useState<Report | null>(null);

  const refreshReports = () =>
    queryClient.invalidateQueries({
      queryKey: ["reports"],
    });

  const duplicateReport = useMutation({
    mutationFn: (report: Report) =>
      savedApi.duplicateReport(report.id),
    onSuccess: () => {
      toast.success("Report duplicated");
      refreshReports();
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  const removeReport = useMutation({
    mutationFn: (report: Report) =>
      savedApi.deleteReport(report.id),
    onSuccess: () => {
      toast.success("Report deleted");
      setDeleteTarget(null);
      refreshReports();
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  return (
    <>
      <PageHeader
        title="Reports"
        description="Saved insights. Open one to edit it, or add it to a dashboard."
      />

      <Card>
        {reportsQuery.isLoading ? (
          <CardBody>
            <LoadingBlock
              label="Loading reports"
              height="h-32"
            />
          </CardBody>
        ) : reportsQuery.isError ? (
          <ErrorState
            error={reportsQuery.error}
            onRetry={() =>
              reportsQuery.refetch()
            }
          />
        ) : !reportsQuery.data?.length ? (
          <EmptyState
            icon={
              <FileBarChart className="h-8 w-8" />
            }
            title="No saved reports"
            description="Build a trend, funnel or retention analysis and choose “Save as report”."
            action={
              <Link to="/insights/trends">
                <Button variant="primary">
                  Create a trend
                </Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Created by</Th>
                <Th>Updated</Th>
                <Th />
              </tr>
            </thead>

            <tbody>
              {reportsQuery.data.map((report) => (
                <tr key={report.id}>
                  <Td>
                    <Link
                      className="font-medium text-primary hover:underline"
                      to={reportPath(report)}
                    >
                      {report.name}
                    </Link>

                    {report.description && (
                      <div className="text-xs text-muted-foreground">
                        {report.description}
                      </div>
                    )}
                  </Td>

                  <Td>
                    <Badge>
                      {report.query.type}
                    </Badge>
                  </Td>

                  <Td>
                    {report.created_by_name ?? "–"}
                  </Td>

                  <Td>
                    {relativeTime(
                      report.updated_at,
                    )}
                  </Td>

                  <Td className="text-right">
                    {canWrite && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={\`Duplicate \${report.name}\`}
                          onClick={() =>
                            duplicateReport.mutate(
                              report,
                            )
                          }
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Duplicate
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={() =>
                            setDeleteTarget(
                              report,
                            )
                          }
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
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        danger
        title="Delete report?"
        confirmLabel="Delete"
        loading={removeReport.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            removeReport.mutate(deleteTarget);
          }
        }}
        description={\`“\${deleteTarget?.name}” will be deleted. Dashboard widgets that use it must be removed first.\`}
      />
    </>
  );
}
