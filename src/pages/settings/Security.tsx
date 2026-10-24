import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Badge, ErrorState, LoadingBlock, Table, Td, Th } from "@/components/ui/misc";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { authApi, orgApi } from "@/services/endpoints";
import { can } from "@/types";
import { fmtDateTime } from "@/utils/format";
import { passwordProblem } from "../Register";

export function SecurityPage() {
  const { me } = useAuth();
  const p = useWorkspaceProject();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const problem = next ? passwordProblem(next) : null;
  const change = useMutation({ mutationFn: () => authApi.changePassword(cur, next), onSuccess: () => { toast.success("Password changed. Other sessions were signed out."); setCur(""); setNext(""); }, onError: (e) => toast.error(messageFor(e)) });
  const admin = can(p.role, "admin");
  const audit = useQuery({ queryKey: ["audit", p.org_id], queryFn: () => orgApi.audit(p.org_id), enabled: admin });
  return (
    <div className="space-y-5">
      <Card><CardHeader title="Account" description={me?.user.email} actions={<Badge tone={me?.user.email_verified ? "success" : "warning"}>{me?.user.email_verified ? "Email verified" : "Email not verified"}</Badge>} />
        <CardBody className="max-w-md space-y-4">
          <Field label="Current password">{(id) => <Input id={id} type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />}</Field>
          <Field label="New password" error={problem}>{(id) => <Input id={id} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}</Field>
          <Button variant="primary" disabled={!cur || !next || !!problem} loading={change.isPending} onClick={() => change.mutate()}>Change password</Button>
        </CardBody></Card>
      {admin && (
        <Card><CardHeader title="Audit log" description="Security-relevant actions in this organization." />
          {audit.isLoading ? <div className="p-4"><LoadingBlock label="Loading audit log" height="h-24" /></div> : audit.isError ? <ErrorState error={audit.error} onRetry={() => audit.refetch()} /> : (
            <Table><thead><tr><Th>When</Th><Th>Action</Th><Th>Target</Th><Th>IP</Th></tr></thead><tbody>{audit.data!.map((a) => (
              <tr key={a.id}><Td className="whitespace-nowrap">{fmtDateTime(a.created_at)}</Td><Td><code className="text-xs">{a.action}</code></Td><Td className="text-xs text-muted-foreground">{a.target_type ?? "–"}</Td><Td className="font-mono text-xs">{a.ip ?? "–"}</Td></tr>))}</tbody></Table>)}
        </Card>)}
    </div>
  );
}
