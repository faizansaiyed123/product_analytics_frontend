import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAuth, ME_KEY } from "@/hooks/useAuth";
import { PROJECTS_KEY } from "@/hooks/useProject";
import { useUI } from "@/stores/ui";
import { messageFor } from "@/services/api";
import { authApi, orgApi, projectApi } from "@/services/endpoints";
import type { ProjectCreated } from "@/types";

import { ApiKeyReveal } from "./settings/ApiKeys";

export function OnboardingPage() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const setProjectId = useUI((state) => state.setProjectId);

  const [organizationName, setOrganizationName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [createdProject, setCreatedProject] = useState<ProjectCreated | null>(null);

  const createProject = useMutation({
    mutationFn: async () => {
      let organizationId = me?.organizations[0]?.org_id;

      if (!organizationId) {
        await orgApi.create(organizationName.trim());

        const freshMe = await authApi.me();
        queryClient.setQueryData(ME_KEY, freshMe);
        organizationId = freshMe.organizations[0].org_id;
      }

      return projectApi.create(organizationId, projectName.trim());
    },
    onSuccess: (project) => {
      setCreatedProject(project);
      setProjectId(project.id);
    },
  });

  const finish = () => {
    queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    setCreatedProject(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const hasOrganization =
      me?.organizations.length || organizationName.trim();

    if (projectName.trim() && hasOrganization) {
      createProject.mutate();
    }
  };

  return (
    <div className="mx-auto max-w-lg py-16">
      <Card>
        <CardBody className="space-y-5 p-6">
          {createdProject ? (
            <>
              <div>
                <h1 className="text-lg font-semibold">
                  Your project is ready
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Copy your project API key now. For security only a hash is stored,
                  so it will not be shown again.
                </p>
              </div>

              <ApiKeyReveal apiKey={createdProject.api_key.key} />

              <Button variant="primary" onClick={finish}>
                Continue to workspace
              </Button>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h1 className="text-lg font-semibold">
                  Create your first project
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  A project holds the events, users and dashboards of one website or app.
                </p>
              </div>

              {!me?.organizations.length && (
                <Field label="Workspace name">
                  {(id) => (
                    <Input
                      id={id}
                      value={organizationName}
                      onChange={(event) =>
                        setOrganizationName(event.target.value)
                      }
                    />
                  )}
                </Field>
              )}

              <Field label="Project name">
                {(id) => (
                  <Input
                    id={id}
                    value={projectName}
                    onChange={(event) =>
                      setProjectName(event.target.value)
                    }
                    placeholder="Marketing website"
                  />
                )}
              </Field>

              {createProject.isError && (
                <p role="alert" className="text-sm text-danger">
                  {messageFor(createProject.error)}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                loading={createProject.isPending}
              >
                Create project
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
