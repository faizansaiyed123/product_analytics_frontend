import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge, ErrorState, LoadingBlock, Table, Td, Th } from "@/components/ui/misc";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { orgApi } from "@/services/endpoints";
import type { Member, Role } from "@/types";
import { can } from "@/types";
import { fmtDate } from "@/utils/format";

const ROLES: Role[] = ["owner", "admin", "member", "viewer"];
const HELP: Record<Role, string> = {
  owner: "Everything, including deleting the organization",
  admin: "Projects, API keys, settings and team",
  member: "Create dashboards, reports, cohorts, alerts; export",
  viewer: "Read-only access to analytics",
};

export function TeamPage() {
  const project = useWorkspaceProject();
  const { me } = useAuth();
  const orgId = project.org_id;
  const qc = useQueryClient();
  const admin = can(project.role, "admin");
  const owner = project.role === "owner";
  const members = useQuery({ queryKey: ["members", orgId], queryFn: () => orgApi.members(orgId) });
  const invites = useQuery({ queryKey: ["invites", orgId], queryFn: () => orgApi.invitations(orgId), enabled: admin });
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [toRemove, setToRemove] = useState<Member | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["members", orgId] });
    qc.invalidateQueries({ queryKey: ["invites", orgId] });
  };
  const add = useMutation({
    mutationFn: () => orgApi.addMember(orgId, email.trim(), role),
    onSuccess: (r) => {
      toast.success(
        r.status === "added" ? "Member added" : "Invitation created - it applies when they register with this email",
      );
      setAdding(false);
      setEmail("");
      refresh();
    },
    onError: (e) => toast.error(messageFor(e)),
  });
  const setRoleM = useMutation({
    mutationFn: (v: { id: string; role: Role }) => orgApi.setRole(orgId, v.id, v.role),
    onSuccess: () => {
      toast.success("Role updated");
      refresh();
    },
    onError: (e) => {
      toast.error(messageFor(e));
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (m: Member) => orgApi.remove(orgId, m.user_id),
    onSuccess: () => {
      toast.success("Member removed");
      setToRemove(null);
      refresh();
    },
    onError: (e) => toast.error(messageFor(e)),
  });
  const assignable = ROLES.filter((r) => owner || r === "member" || r === "viewer");
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Team members"
          description="People with access to this organization's projects."
          actions={
            admin && (
              <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                Add member
              </Button>
            )
          }
        />
        {members.isLoading ? (
          <div className="p-4">
            <LoadingBlock label="Loading members" height="h-24" />
          </div>
        ) : members.isError ? (
          <ErrorState error={members.error} onRetry={() => members.refetch()} />
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
              {members.data!.map((m) => {
                const self = m.user_id === me?.user.id;
                const editable = admin && (owner || (m.role !== "owner" && m.role !== "admin"));
                return (
                  <tr key={m.user_id}>
                    <Td>
                      <div className="font-medium">
                        {m.name || m.email}
                        {self && <Badge className="ml-2">You</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </Td>
                    <Td>
                      {editable ? (
                        <Select
                          aria-label={`Role of ${m.email}`}
                          className="w-32"
                          value={m.role}
                          onChange={(e) => setRoleM.mutate({ id: m.user_id, role: e.target.value as Role })}
                        >
                          {ROLES.filter((r) => assignable.includes(r) || r === m.role).map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </Select>
                      ) : (
                        <Badge tone="primary">{m.role}</Badge>
                      )}
                    </Td>
                    <Td>{fmtDate(m.joined_at)}</Td>
                    <Td className="text-right">
                      {(editable || self) && (
                        <Button size="sm" variant="ghost" className="text-danger" onClick={() => setToRemove(m)}>
                          {self ? "Leave" : "Remove"}
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
      {admin && (invites.data?.length ?? 0) > 0 && (
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
              {invites.data!.map((i) => (
                <tr key={i.id}>
                  <Td>{i.email}</Td>
                  <Td>
                    <Badge>{i.role}</Badge>
                  </Td>
                  <Td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await orgApi.revokeInvite(orgId, i.id);
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
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!/^\S+@\S+\.\S+$/.test(email)}
              loading={add.isPending}
              onClick={() => add.mutate()}
            >
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Email">
            {(id) => <Input id={id} type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <Field label="Role" hint={HELP[role]}>
            {(id) => (
              <Select id={id} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {assignable.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Dialog>
      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        danger
        title={toRemove?.user_id === me?.user.id ? "Leave organization?" : "Remove member?"}
        confirmLabel="Confirm"
        loading={remove.isPending}
        onConfirm={() => toRemove && remove.mutate(toRemove)}
        description={`${toRemove?.email} will lose access to all projects in this organization.`}
      />
    </div>
  );
}
