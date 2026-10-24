import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth, ME_KEY } from "@/hooks/useAuth";
import { PROJECTS_KEY } from "@/hooks/useProject";
import { messageFor } from "@/services/api";
import { authApi, orgApi, projectApi } from "@/services/endpoints";
import { useUI } from "@/stores/ui";
import type { ProjectCreated } from "@/types";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { ApiKeyReveal } from "./settings/ApiKeys";

/** First-run screen: create (or pick) an organization, then the first project and show its API key once. */
export function OnboardingPage() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const setProjectId = useUI((s) => s.setProjectId);
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [created, setCreated] = useState<ProjectCreated | null>(null);
  const m = useMutation({
    mutationFn: async () => {
      let orgId = me?.organizations[0]?.org_id;
      if (!orgId) { await orgApi.create(orgName.trim()); const fresh = await authApi.me(); qc.setQueryData(ME_KEY, fresh); orgId = fresh.organizations[0].org_id; }
      return projectApi.create(orgId, name.trim());
    },
    onSuccess: (p) => { setCreated(p); setProjectId(p.id); },
  });
  const done = () => { qc.invalidateQueries({ queryKey: PROJECTS_KEY }); setCreated(null); };
  return (
    <div className="mx-auto max-w-lg py-16">
      <Card><CardBody className="space-y-5 p-6">
        {created ? (
          <>
            <div><h1 className="text-lg font-semibold">Your project is ready</h1><p className="mt-1 text-sm text-muted-foreground">Copy your project API key now. For security only a hash is stored, so it will not be shown again.</p></div>
            <ApiKeyReveal apiKey={created.api_key.key} />
            <Button variant="primary" onClick={done}>Continue to workspace</Button>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (name.trim() && (me?.organizations.length || orgName.trim())) m.mutate(); }} className="space-y-4">
            <div><h1 className="text-lg font-semibold">Create your first project</h1><p className="mt-1 text-sm text-muted-foreground">A project holds the events, users and dashboards of one website or app.</p></div>
            {!me?.organizations.length && <Field label="Workspace name">{(id) => <Input id={id} value={orgName} onChange={(e) => setOrgName(e.target.value)} />}</Field>}
            <Field label="Project name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Marketing website" />}</Field>
            {m.isError && <p role="alert" className="text-sm text-danger">{messageFor(m.error)}</p>}
            <Button type="submit" variant="primary" loading={m.isPending}>Create project</Button>
          </form>
        )}
      </CardBody></Card>
    </div>
  );
}
