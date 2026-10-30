import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { PROJECTS_KEY } from "@/hooks/useProject";
import { messageFor } from "@/services/api";
import { projectApi } from "@/services/endpoints";
import { can } from "@/types";
import { COMMON_TIMEZONES } from "@/utils/dates";

export function ProjectSettingsPage() {
  const p = useWorkspaceProject();
  const qc = useQueryClient();
  const canEdit = can(p.role, "admin");
  const [name, setName] = useState(p.name);
  const [s, setS] = useState(p.settings);
  const [deny, setDeny] = useState(p.settings.property_denylist.join(", "));
  useEffect(() => {
    setName(p.name);
    setS(p.settings);
    setDeny(p.settings.property_denylist.join(", "));
  }, [p]);
  const save = useMutation({
    mutationFn: () =>
      projectApi.update(p.id, {
        name,
        settings: {
          timezone: s.timezone,
          session_timeout_minutes: s.session_timeout_minutes,
          ip_mode: s.ip_mode,
          rate_limit_per_second: s.rate_limit_per_second,
          property_denylist: deny
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success("Project settings saved");
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
    onError: (e) => toast.error(messageFor(e)),
  });
  const tzs = Array.from(new Set([s.timezone, ...COMMON_TIMEZONES]));
  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader
          title="General"
          description={canEdit ? undefined : "Read-only: you need the admin role to change settings."}
        />
        <CardBody className="space-y-4">
          <Field label="Project name">
            {(id) => <Input id={id} value={name} disabled={!canEdit} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Project ID" hint="Used in API paths and the REST API.">
            {(id) => <Input id={id} readOnly value={p.id} className="font-mono text-xs" />}
          </Field>
          <Field
            label="Default timezone"
            hint="Used for day/week/month buckets and date ranges unless you pick another timezone in the header. Events are always stored in UTC."
          >
            {(id) => (
              <Select
                id={id}
                value={s.timezone}
                disabled={!canEdit}
                onChange={(e) => setS({ ...s, timezone: e.target.value })}
              >
                {tzs.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Session timeout (minutes)" hint="A new session starts after this much inactivity.">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={1}
                max={1440}
                disabled={!canEdit}
                value={s.session_timeout_minutes}
                onChange={(e) => setS({ ...s, session_timeout_minutes: Number(e.target.value) })}
              />
            )}
          </Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Privacy & limits" />
        <CardBody className="space-y-4">
          <Field
            label="IP address storage"
            hint="Country is derived before the IP is reduced. Anonymize zeroes the last octet (IPv4) / last 80 bits (IPv6)."
          >
            {(id) => (
              <Select
                id={id}
                value={s.ip_mode}
                disabled={!canEdit}
                onChange={(e) => setS({ ...s, ip_mode: e.target.value as typeof s.ip_mode })}
              >
                <option value="anonymize">Anonymize (default)</option>
                <option value="discard">Do not store IP or user agent</option>
                <option value="store">Store full IP</option>
              </Select>
            )}
          </Field>
          <Field label="Ingestion rate limit (requests / second)">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={1}
                disabled={!canEdit}
                value={s.rate_limit_per_second}
                onChange={(e) => setS({ ...s, rate_limit_per_second: Number(e.target.value) })}
              />
            )}
          </Field>
          <Field
            label="Dropped property names"
            hint="Comma separated. Properties with these names (any nesting level) are removed before storage."
          >
            {(id) => <Textarea id={id} value={deny} disabled={!canEdit} onChange={(e) => setDeny(e.target.value)} />}
          </Field>
          {canEdit && (
            <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
              Save changes
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
