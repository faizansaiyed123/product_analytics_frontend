import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
} from "@/components/ui/card";
import {
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/input";
import { PROJECTS_KEY } from "@/hooks/useProject";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { projectApi } from "@/services/endpoints";
import { can } from "@/types";
import { COMMON_TIMEZONES } from "@/utils/dates";

export function ProjectSettingsPage() {
  const project = useWorkspaceProject();
  const queryClient = useQueryClient();
  const canEdit = can(
    project.role,
    "admin",
  );

  const [name, setName] =
    useState(project.name);
  const [settings, setSettings] =
    useState(project.settings);
  const [denylist, setDenylist] = useState(
    project.settings.property_denylist.join(", "),
  );

  useEffect(() => {
    setName(project.name);
    setSettings(project.settings);
    setDenylist(
      project.settings.property_denylist.join(
        ", ",
      ),
    );
  }, [project]);

  const saveSettings = useMutation({
    mutationFn: () =>
      projectApi.update(project.id, {
        name,
        settings: {
          timezone: settings.timezone,
          session_timeout_minutes:
            settings.session_timeout_minutes,
          ip_mode: settings.ip_mode,
          rate_limit_per_second:
            settings.rate_limit_per_second,
          property_denylist: denylist
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success(
        "Project settings saved",
      );
      queryClient.invalidateQueries({
        queryKey: PROJECTS_KEY,
      });
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  const timezones = Array.from(
    new Set([
      settings.timezone,
      ...COMMON_TIMEZONES,
    ]),
  );

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader
          title="General"
          description={
            canEdit
              ? undefined
              : "Read-only: you need the admin role to change settings."
          }
        />

        <CardBody className="space-y-4">
          <Field label="Project name">
            {(id) => (
              <Input
                id={id}
                value={name}
                disabled={!canEdit}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
              />
            )}
          </Field>

          <Field
            label="Project ID"
            hint="Used in API paths and the REST API."
          >
            {(id) => (
              <Input
                id={id}
                readOnly
                value={project.id}
                className="font-mono text-xs"
              />
            )}
          </Field>

          <Field
            label="Default timezone"
            hint="Used for day/week/month buckets and date ranges unless you pick another timezone in the header. Events are always stored in UTC."
          >
            {(id) => (
              <Select
                id={id}
                value={settings.timezone}
                disabled={!canEdit}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    timezone:
                      event.target.value,
                  })
                }
              >
                {timezones.map(
                  (timezone) => (
                    <option
                      key={timezone}
                    >
                      {timezone}
                    </option>
                  ),
                )}
              </Select>
            )}
          </Field>

          <Field
            label="Session timeout (minutes)"
            hint="A new session starts after this much inactivity."
          >
            {(id) => (
              <Input
                id={id}
                type="number"
                min={1}
                max={1440}
                disabled={!canEdit}
                value={
                  settings.session_timeout_minutes
                }
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    session_timeout_minutes:
                      Number(
                        event.target.value,
                      ),
                  })
                }
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
                value={settings.ip_mode}
                disabled={!canEdit}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    ip_mode:
                      event.target.value as
                        typeof settings.ip_mode,
                  })
                }
              >
                <option value="anonymize">
                  Anonymize (default)
                </option>
                <option value="discard">
                  Do not store IP or user agent
                </option>
                <option value="store">
                  Store full IP
                </option>
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
                value={
                  settings.rate_limit_per_second
                }
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    rate_limit_per_second:
                      Number(
                        event.target.value,
                      ),
                  })
                }
              />
            )}
          </Field>

          <Field
            label="Dropped property names"
            hint="Comma separated. Properties with these names (any nesting level) are removed before storage."
          >
            {(id) => (
              <Textarea
                id={id}
                value={denylist}
                disabled={!canEdit}
                onChange={(event) =>
                  setDenylist(
                    event.target.value,
                  )
                }
              />
            )}
          </Field>

          {canEdit && (
            <Button
              variant="primary"
              loading={saveSettings.isPending}
              onClick={() =>
                saveSettings.mutate()
              }
            >
              Save changes
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
