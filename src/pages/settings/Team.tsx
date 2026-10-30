import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
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
import { orgApi } from "@/services/endpoints";
import type { Member, Role } from "@/types";
import { can } from "@/types";
import { fmtDate } from "@/utils/format";

const ROLES: Role[] = [
  "owner",
  "admin",
  "member",
  "viewer",
];

const ROLE_HELP: Record<Role, string> = {
  owner: "Everything, including deleting the organization",
  admin: "Projects, API keys, settings and team",
  member: "Create dashboards, reports, cohorts, alerts; export",
  viewer: "Read-only access to analytics",
};

export function TeamPage() {
  const project = useWorkspaceProject();
  const { me } = useAuth();
  const organizationId = project.org_id;
  const queryClient = useQueryClient();

  const isAdmin = can(project.role, "admin");
  const isOwner = project.role === "owner";

  const membersQuery = useQuery({
    queryKey: ["members", organizationId],
    queryFn: () => orgApi.members(organizationId),
  });

  const invitationsQuery = useQuery({
    queryKey: ["invites", organizationId],
    queryFn: () => orgApi.invitations(organizationId),
    enabled: isAdmin,
  });

  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["members", organizationId],
    });
    queryClient.invalidateQueries({
      queryKey: ["invites", organizationId],
    });
  };

  const addMember = useMutation({
    mutationFn: () =>
      orgApi.addMember(
        organizationId,
        email.trim(),
        role,
      ),
    onSuccess: (result) => {
      toast.success(
        result.status === "added"
          ? "Member added"
          : "Invitation created - it applies when they register with this email",
      );
      setAdding(false);
      setEmail("");
      refresh();
    },
    onError: (error) => toast.error(messageFor(error)),
  });

  const updateRole = useMutation({
    mutationFn: (value: { id: string; role: Role }) =>
      orgApi.setRole(
        organizationId,
        value.id,
        value.role,
      ),
    onSuccess: () => {
      toast.success("Role updated");
      refresh();
    },
    onError: (error) => {
      toast.error(messageFor(error));
      refresh();
    },
  });

  const removeMember = useMutation({
    mutationFn: (member: Member) =>
      orgApi.remove(organizationId, member.user_id),
    onSuccess: () => {
      toast.success("Member removed");
      setRemoveTarget(null);
      refresh();
    },
    onError: (error) => toast.error(messageFor(error)),
  });

  const assignableRoles = ROLES.filter(
    (value) =>
      isOwner ||
      value === "member" ||
      value === "viewer",
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Team members"
          description="People with access to this organization's projects."
          actions={
            isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setAdding(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add member
              </Button>
            )
          }
        />

        {membersQuery.isLoading ? (
          <div className="p-4">
            <LoadingBlock
              label="Loading members"
              height="h-24"
            />
          </div>
        ) : membersQuery.isError ? (
          <ErrorState
            error={membersQuery.error}
            onRetry={() => membersQuery.refetch()}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Role</Th>
                <Th>Joined</Th>
                <Th />
              </tr>
            </thead>

            <tbody>
              {membersQuery.data!.map((member) => {
                const isSelf = member.user_id === me?.user.id;
                const canEditMember =
                  isAdmin &&
                  (isOwner ||
                    (member.role !== "owner" &&
                      member.role !== "admin"));

                return (
                  <tr key={member.user_id}>
                    <Td>
                      <div className="font-medium">
                        {member.name || member.email}
                        {isSelf && (
                          <Badge className="ml-2">You</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.email}
                      </div>
                    </Td>

                    <Td>
                      {canEditMember ? (
                        <Select
                          aria-label={"Role of " + member.email}
                          className="w-32"
                          value={member.role}
                          onChange={(event) =>
                            updateRole.mutate({
                              id: member.user_id,
                              role: event.target.value as Role,
                            })
                          }
                        >
                          {ROLES.filter(
                            (value) =>
                              assignableRoles.includes(value) ||
                              value === member.role,
                          ).map((value) => (
                            <option key={value}>
                              {value}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Badge tone="primary">
                          {member.role}
                        </Badge>
                      )}
                    </Td>

                    <Td>{fmtDate(member.joined_at)}</Td>

                    <Td className="text-right">
                      {(canEditMember || isSelf) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={() => setRemoveTarget(member)}
                        >
                          {isSelf ? "Leave" : "Remove"}
                        </Button>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {isAdmin && (invitationsQuery.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader
            title="Pending invitations"
            description="Applied automatically when the person registers with this email."
          />

          <Table>
            <thead>
              <tr>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th />
              </tr>
            </thead>

            <tbody>
              {invitationsQuery.data!.map((invitation) => (
                <tr key={invitation.id}>
                  <Td>{invitation.email}</Td>
                  <Td>
                    <Badge>{invitation.role}</Badge>
                  </Td>
                  <Td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await orgApi.revokeInvite(
                          organizationId,
                          invitation.id,
                        );
                        refresh();
                      }}
                    >
                      Revoke
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Dialog
        open={adding}
        onOpenChange={setAdding}
        title="Add team member"
        description="Existing users are added immediately; for new emails an invitation is created."
        footer={
          <>
            <Button onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!/^\S+@\S+\.\S+$/.test(email)}
              loading={addMember.isPending}
              onClick={() => addMember.mutate()}
            >
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Email">
            {(id) => (
              <Input
                id={id}
                type="email"
                autoFocus
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />
            )}
          </Field>

          <Field label="Role" hint={ROLE_HELP[role]}>
            {(id) => (
              <Select
                id={id}
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as Role)
                }
              >
                {assignableRoles.map((value) => (
                  <option key={value}>
                    {value}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null);
          }
        }}
        danger
        title={
          removeTarget?.user_id === me?.user.id
            ? "Leave organization?"
            : "Remove member?"
        }
        confirmLabel="Confirm"
        loading={removeMember.isPending}
        onConfirm={() => {
          if (removeTarget) {
            removeMember.mutate(removeTarget);
          }
        }}
        description={
          String(removeTarget?.email) +
          " will lose access to all projects in this organization."
        }
      />
    </div>
  );
}
