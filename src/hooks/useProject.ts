import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { projectApi } from "@/services/endpoints";
import { useUI } from "@/stores/ui";
import type { Project } from "@/types";

export const PROJECTS_KEY = ["projects"];

export function useProjects() {
  return useQuery({ queryKey: PROJECTS_KEY, queryFn: projectApi.list });
}

/** The active project (falls back to the first accessible one). */
export function useProject(): { project: Project | null; projects: Project[]; isLoading: boolean } {
  const { data, isLoading } = useProjects();
  const { projectId, setProjectId } = useUI();
  const projects = data ?? [];
  const project = projects.find((p) => p.id === projectId) ?? projects[0] ?? null;
  useEffect(() => {
    if (project && project.id !== projectId) setProjectId(project.id);
  }, [project, projectId, setProjectId]);
  return { project, projects, isLoading };
}
