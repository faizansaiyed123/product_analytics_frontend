import { NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { PageHeader } from "@/components/ui/misc";
import { cn } from "@/utils/cn";
import { AlertsPage } from "./Alerts";
import { ApiKeysPage } from "./ApiKeys";
import { DataManagementPage } from "./DataManagement";
import { ProjectSettingsPage } from "./ProjectSettings";
import { SecurityPage } from "./Security";
import { TeamPage } from "./Team";

const TABS = [
  ["project", "Project"],
  ["api-keys", "API Keys"],
  ["team", "Team"],
  ["alerts", "Alerts"],
  ["data", "Data Management"],
  ["security", "Security"],
];

function Shell() {
  return (
    <>
      <PageHeader title="Settings" description="Manage this project, your team and your data." />
      <nav aria-label="Settings sections" className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map(([to, label]) => (
          <NavLink
            key={to}
            to={`/settings/${to}`}
            className={({ isActive }) =>
              cn(
                "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm",
                isActive
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  );
}

export function SettingsRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="project" replace />} />
        <Route path="project" element={<ProjectSettingsPage />} />
        <Route path="api-keys" element={<ApiKeysPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="data" element={<DataManagementPage />} />
        <Route path="security" element={<SecurityPage />} />
      </Route>
    </Routes>
  );
}
