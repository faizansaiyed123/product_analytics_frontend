import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
} from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import {
  Badge,
  ErrorState,
  LoadingBlock,
  Table,
  Td,
  Th,
} from "@/components/ui/misc";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import {
  authApi,
  orgApi,
} from "@/services/endpoints";
import { can } from "@/types";
import { fmtDateTime } from "@/utils/format";

import { passwordProblem } from "../Register";

export function SecurityPage() {
  const { me } = useAuth();
  const project = useWorkspaceProject();

  const [currentPassword, setCurrentPassword] =
    useState("");
  const [newPassword, setNewPassword] =
    useState("");

  const passwordError = newPassword
    ? passwordProblem(newPassword)
    : null;

  const changePassword = useMutation({
    mutationFn: () =>
      authApi.changePassword(
        currentPassword,
        newPassword,
      ),
    onSuccess: () => {
      toast.success(
        "Password changed. Other sessions were signed out.",
      );
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  const isAdmin = can(
    project.role,
    "admin",
  );

  const auditQuery = useQuery({
    queryKey: ["audit", project.org_id],
    queryFn: () =>
      orgApi.audit(project.org_id),
    enabled: isAdmin,
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Account"
          description={me?.user.email}
          actions={
            <Badge
              tone={
                me?.user.email_verified
                  ? "success"
                  : "warning"
              }
            >
              {me?.user.email_verified
                ? "Email verified"
                : "Email not verified"}
            </Badge>
          }
        />

        <CardBody className="max-w-md space-y-4">
          <Field label="Current password">
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(
                    event.target.value,
                  )
                }
              />
            )}
          </Field>

          <Field
            label="New password"
            error={passwordError}
          >
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value,
                  )
                }
              />
            )}
          </Field>

          <Button
            variant="primary"
            disabled={
              !currentPassword ||
              !newPassword ||
              !!passwordError
            }
            loading={changePassword.isPending}
            onClick={() =>
              changePassword.mutate()
            }
          >
            Change password
          </Button>
        </CardBody>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader
            title="Audit log"
            description="Security-relevant actions in this organization."
          />

          {auditQuery.isLoading ? (
            <div className="p-4">
              <LoadingBlock
                label="Loading audit log"
                height="h-24"
              />
            </div>
          ) : auditQuery.isError ? (
            <ErrorState
              error={auditQuery.error}
              onRetry={() =>
                auditQuery.refetch()
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Action</Th>
                  <Th>Target</Th>
                  <Th>IP</Th>
                </tr>
              </thead>

              <tbody>
                {auditQuery.data!.map((audit) => (
                  <tr key={audit.id}>
                    <Td className="whitespace-nowrap">
                      {fmtDateTime(
                        audit.created_at,
                      )}
                    </Td>
                    <Td>
                      <code className="text-xs">
                        {audit.action}
                      </code>
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      {audit.target_type ?? "–"}
                    </Td>
                    <Td className="font-mono text-xs">
                      {audit.ip ?? "–"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
