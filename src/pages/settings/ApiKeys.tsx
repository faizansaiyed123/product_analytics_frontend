import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Badge, EmptyState, ErrorState, LoadingBlock, Table, Td, Th } from "@/components/ui/misc";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { projectApi } from "@/services/endpoints";
import type { ApiKey, ApiKeyCreated } from "@/types";
import { can } from "@/types";
import { fmtDateTime, relativeTime } from "@/utils/format";

export function ApiKeyReveal({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { toast.error("Copy failed - select the key and copy it manually"); } };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted p-2"><code data-testid="api-key-value" className="flex-1 break-all font-mono text-xs">{apiKey}</code>
        <Button size="sm" onClick={copy} aria-label="Copy API key">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</Button></div>
      <p className="text-xs text-warning">This key is shown only once. It is a public ingestion key: it can only send events, so it is safe to embed in your website's JavaScript.</p>
    </div>
  );
}

export function ApiKeysPage() {
  const project = useWorkspaceProject();
  const qc = useQueryClient();
  const admin = can(project.role, "admin");
  const keys = useQuery({ queryKey: ["keys", project.id], queryFn: () => projectApi.keys(project.id), enabled: admin });
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<ApiKeyCreated | null>(null);
  const [toRevoke, setToRevoke] = useState<ApiKey | null>(null);
  const [toRotate, setToRotate] = useState<ApiKey | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["keys", project.id] });
  const create = useMutation({ mutationFn: () => projectApi.createKey(project.id, name.trim() || "Key"), onSuccess: (k) => { setRevealed(k); setCreating(false); setName(""); refresh(); }, onError: (e) => toast.error(messageFor(e)) });
  const revoke = useMutation({ mutationFn: (k: ApiKey) => projectApi.revokeKey(project.id, k.id), onSuccess: () => { toast.success("Key revoked"); setToRevoke(null); refresh(); }, onError: (e) => toast.error(messageFor(e)) });
  const rotate = useMutation({ mutationFn: (k: ApiKey) => projectApi.rotateKey(project.id, k.id, 0), onSuccess: (k) => { setToRotate(null); setRevealed(k); refresh(); }, onError: (e) => toast.error(messageFor(e)) });
  if (!admin) return <Card><EmptyState title="Admins only" description="You need the admin role to view and manage API keys." /></Card>;
  return (
    <Card>
      <CardHeader title="Project API keys" description="Keys authenticate event ingestion for this project. Only a hash is stored." actions={<Button variant="primary" size="sm" onClick={() => setCreating(true)}><KeyRound className="h-3.5 w-3.5" />New key</Button>} />
      {keys.isLoading ? <CardBody><LoadingBlock label="Loading keys" height="h-24" /></CardBody> : keys.isError ? <ErrorState error={keys.error} onRetry={() => keys.refetch()} /> : (
        <Table>
          <thead><tr><Th>Name</Th><Th>Key</Th><Th>Created</Th><Th>Last used</Th><Th>Status</Th><Th /></tr></thead>
          <tbody>{keys.data!.map((k) => (
            <tr key={k.id}><Td className="font-medium">{k.name}</Td><Td><code className="font-mono text-xs">{k.key_prefix}…</code></Td><Td>{fmtDateTime(k.created_at)}</Td><Td>{k.last_used_at ? relativeTime(k.last_used_at) : "Never"}</Td>
              <Td>{k.revoked_at ? <Badge tone="danger">Revoked</Badge> : k.expires_at ? <Badge tone="warning">Expires {fmtDateTime(k.expires_at)}</Badge> : <Badge tone="success">Active</Badge>}</Td>
              <Td className="text-right">{!k.revoked_at && <><Button size="sm" variant="ghost" onClick={() => setToRotate(k)}>Rotate</Button><Button size="sm" variant="ghost" className="text-danger" onClick={() => setToRevoke(k)}>Revoke</Button></>}</Td></tr>))}</tbody>
        </Table>
      )}
      <Dialog open={creating} onOpenChange={setCreating} title="Create API key" footer={<><Button onClick={() => setCreating(false)}>Cancel</Button><Button variant="primary" loading={create.isPending} onClick={() => create.mutate()}>Create key</Button></>}>
        <Field label="Name" hint="For example: website, mobile app, backend">{(id) => <Input id={id} autoFocus value={name} onChange={(e) => setName(e.target.value)} />}</Field>
      </Dialog>
      <Dialog open={!!revealed} onOpenChange={(o) => !o && setRevealed(null)} title="Your new API key" description="Copy it now - it will not be shown again." footer={<Button variant="primary" onClick={() => setRevealed(null)}>Done</Button>}>{revealed && <ApiKeyReveal apiKey={revealed.key} />}</Dialog>
      <ConfirmDialog open={!!toRevoke} onOpenChange={(o) => !o && setToRevoke(null)} danger title="Revoke API key?" confirmLabel="Revoke key" loading={revoke.isPending} onConfirm={() => toRevoke && revoke.mutate(toRevoke)}
        description={<>Anything still using <code>{toRevoke?.key_prefix}…</code> will immediately stop being able to send events.</>} />
      <ConfirmDialog open={!!toRotate} onOpenChange={(o) => !o && setToRotate(null)} title="Rotate API key?" confirmLabel="Rotate key" loading={rotate.isPending} onConfirm={() => toRotate && rotate.mutate(toRotate)}
        description="A new key is generated and the old one is revoked immediately. Update your SDK configuration with the new key." />
    </Card>
  );
}
