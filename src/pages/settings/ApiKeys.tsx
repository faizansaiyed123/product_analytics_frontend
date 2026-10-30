import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Check,
  Copy,
  KeyRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
} from "@/components/ui/card";
import {
  ConfirmDialog,
  Dialog,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
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
import { projectApi } from "@/services/endpoints";
import type {
  ApiKey,
  ApiKeyCreated,
} from "@/types";
import { can } from "@/types";
import {
  fmtDateTime,
  relativeTime,
} from "@/utils/format";

export function ApiKeyReveal({
  apiKey,
}: {
  apiKey: string;
}) {
  const [copied, setCopied] =
    useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        apiKey,
      );
      setCopied(true);
      setTimeout(
        () => setCopied(false),
        2000,
      );
    } catch {
      toast.error(
        "Copy failed - select the key and copy it manually",
      );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted p-2">
        <code
          data-testid="api-key-value"
          className="flex-1 break-all font-mono text-xs"
        >
          {apiKey}
        </code>

        <Button
          size="sm"
          onClick={copy}
          aria-label="Copy API key"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <p className="text-xs text-warning">
        This key is shown only once. It is a public
        ingestion key: it can only send events, so it
        is safe to embed in your website's JavaScript.
      </p>
    </div>
  );
}

export function ApiKeysPage() {
  const project =
    useWorkspaceProject();
  const queryClient =
    useQueryClient();
  const isAdmin = can(
    project.role,
    "admin",
  );

  const keysQuery = useQuery({
    queryKey: ["keys", project.id],
    queryFn: () =>
      projectApi.keys(project.id),
    enabled: isAdmin,
  });

  const [name, setName] =
    useState("");
  const [creating, setCreating] =
    useState(false);
  const [revealed, setRevealed] =
    useState<ApiKeyCreated | null>(
      null,
    );
  const [revokeTarget, setRevokeTarget] =
    useState<ApiKey | null>(null);
  const [rotateTarget, setRotateTarget] =
    useState<ApiKey | null>(null);

  const refreshKeys = () =>
    queryClient.invalidateQueries({
      queryKey: ["keys", project.id],
    });

  const createKey = useMutation({
    mutationFn: () =>
      projectApi.createKey(
        project.id,
        name.trim() || "Key",
      ),
    onSuccess: (key) => {
      setRevealed(key);
      setCreating(false);
      setName("");
      refreshKeys();
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  const revokeKey = useMutation({
    mutationFn: (key: ApiKey) =>
      projectApi.revokeKey(
        project.id,
        key.id,
      ),
    onSuccess: () => {
      toast.success("Key revoked");
      setRevokeTarget(null);
      refreshKeys();
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  const rotateKey = useMutation({
    mutationFn: (key: ApiKey) =>
      projectApi.rotateKey(
        project.id,
        key.id,
        0,
      ),
    onSuccess: (key) => {
      setRotateTarget(null);
      setRevealed(key);
      refreshKeys();
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  if (!isAdmin) {
    return (
      <Card>
        <EmptyState
          title="Admins only"
          description="You need the admin role to view and manage API keys."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Project API keys"
        description="Keys authenticate event ingestion for this project. Only a hash is stored."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreating(true)}
          >
            <KeyRound className="h-3.5 w-3.5" />
            New key
          </Button>
        }
      />

      {keysQuery.isLoading ? (
        <CardBody>
          <LoadingBlock
            label="Loading keys"
            height="h-24"
          />
        </CardBody>
      ) : keysQuery.isError ? (
        <ErrorState
          error={keysQuery.error}
          onRetry={() =>
            keysQuery.refetch()
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Key</Th>
              <Th>Created</Th>
              <Th>Last used</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>

          <tbody>
            {keysQuery.data!.map((key) => (
              <tr key={key.id}>
                <Td className="font-medium">
                  {key.name}
                </Td>
                <Td>
                  <code className="font-mono text-xs">
                    {key.key_prefix}…
                  </code>
                </Td>
                <Td>
                  {fmtDateTime(
                    key.created_at,
                  )}
                </Td>
                <Td>
                  {key.last_used_at
                    ? relativeTime(
                        key.last_used_at,
                      )
                    : "Never"}
                </Td>
                <Td>
                  {key.revoked_at ? (
                    <Badge tone="danger">
                      Revoked
                    </Badge>
                  ) : key.expires_at ? (
                    <Badge tone="warning">
                      Expires{" "}
                      {fmtDateTime(
                        key.expires_at,
                      )}
                    </Badge>
                  ) : (
                    <Badge tone="success">
                      Active
                    </Badge>
                  )}
                </Td>
                <Td className="text-right">
                  {!key.revoked_at && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setRotateTarget(
                            key,
                          )
                        }
                      >
                        Rotate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() =>
                          setRevokeTarget(
                            key,
                          )
                        }
                      >
                        Revoke
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
        open={creating}
        onOpenChange={setCreating}
        title="Create API key"
        footer={
          <>
            <Button
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createKey.isPending}
              onClick={() =>
                createKey.mutate()
              }
            >
              Create key
            </Button>
          </>
        }
      >
        <Field
          label="Name"
          hint="For example: website, mobile app, backend"
        >
          {(id) => (
            <Input
              id={id}
              autoFocus
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
            />
          )}
        </Field>
      </Dialog>

      <Dialog
        open={!!revealed}
        onOpenChange={(open) => {
          if (!open) {
            setRevealed(null);
          }
        }}
        title="Your new API key"
        description="Copy it now - it will not be shown again."
        footer={
          <Button
            variant="primary"
            onClick={() =>
              setRevealed(null)
            }
          >
            Done
          </Button>
        }
      >
        {revealed && (
          <ApiKeyReveal
            apiKey={revealed.key}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
          }
        }}
        danger
        title="Revoke API key?"
        confirmLabel="Revoke key"
        loading={revokeKey.isPending}
        onConfirm={() => {
          if (revokeTarget) {
            revokeKey.mutate(
              revokeTarget,
            );
          }
        }}
        description={
          <>
            Anything still using{" "}
            <code>
              {revokeTarget?.key_prefix}…
            </code>{" "}
            will immediately stop being able
            to send events.
          </>
        }
      />

      <ConfirmDialog
        open={!!rotateTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRotateTarget(null);
          }
        }}
        title="Rotate API key?"
        confirmLabel="Rotate key"
        loading={rotateKey.isPending}
        onConfirm={() => {
          if (rotateTarget) {
            rotateKey.mutate(
              rotateTarget,
            );
          }
        }}
        description="A new key is generated and the old one is revoked immediately. Update your SDK configuration with the new key."
      />
    </Card>
  );
}
