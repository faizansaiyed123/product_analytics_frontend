import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, BarChart3, Bell, ChevronDown, Filter as FunnelIcon, GitBranch, LayoutDashboard, LineChart, List, LogOut, Menu as MenuIcon, Moon, Repeat, Settings, Sun, Timer, Users, UsersRound, FileBarChart } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { DateRangePicker } from "@/components/DateRangePicker";
import { LoadingBlock } from "@/components/ui/misc";
import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/hooks/useProject";
import { savedApi } from "@/services/endpoints";
import { useUI } from "@/stores/ui";
import { OnboardingPage } from "@/pages/Onboarding";
import { cn } from "@/utils/cn";

const NAV: { label?: string; items: { to: string; label: string; icon: typeof Activity }[] }[] = [
  { items: [{ to: "/", label: "Overview", icon: Activity }] },
  { label: "Insights", items: [
    { to: "/insights/trends", label: "Trends", icon: LineChart }, { to: "/insights/funnels", label: "Funnels", icon: FunnelIcon },
    { to: "/insights/retention", label: "Retention", icon: Repeat }, { to: "/insights/paths", label: "Journeys", icon: GitBranch }, { to: "/insights/cohorts", label: "Cohorts", icon: UsersRound } ] },
  { label: "Data", items: [{ to: "/events", label: "Events", icon: List }, { to: "/users", label: "Users", icon: Users }, { to: "/sessions", label: "Sessions", icon: Timer }] },
  { label: "Library", items: [{ to: "/dashboards", label: "Dashboards", icon: LayoutDashboard }, { to: "/reports", label: "Reports", icon: FileBarChart }] },
  { label: "Manage", items: [{ to: "/settings", label: "Settings", icon: Settings }] },
];

const CRUMBS: Record<string, string> = { insights: "Insights", trends: "Trends", funnels: "Funnels", retention: "Retention", paths: "Journeys", cohorts: "Cohorts", events: "Events", users: "Users", sessions: "Sessions", dashboards: "Dashboards", reports: "Reports", settings: "Settings", project: "Project", "api-keys": "API Keys", team: "Team", data: "Data Management", security: "Security", alerts: "Alerts" };

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) return <span className="text-sm font-medium">Overview</span>;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {parts.map((p, i) => <span key={i} className="flex items-center gap-1.5">{i > 0 && <span aria-hidden>/</span>}<span className={i === parts.length - 1 ? "font-medium text-foreground" : ""} aria-current={i === parts.length - 1 ? "page" : undefined}>{CRUMBS[p] ?? (p.length > 12 ? "Details" : p)}</span></span>)}
    </nav>
  );
}

function Notifications({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["notifications", projectId], queryFn: () => savedApi.notifications(projectId), refetchInterval: 60_000 });
  const unread = data?.unread ?? 0;
  return (
    <Menu trigger={<Button variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative"><Bell className="h-4 w-4" />{unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />}</Button>}>
      <MenuLabel>Notifications</MenuLabel>
      {!data?.items.length && <div className="px-2.5 py-3 text-xs text-muted-foreground">No notifications yet. Alerts you create will appear here.</div>}
      {data?.items.slice(0, 6).map((n) => <div key={n.id} className="max-w-xs px-2.5 py-1.5 text-xs"><div className={cn("font-medium", !n.read_at && "text-primary")}>{n.title}</div><div className="text-muted-foreground">{n.body}</div></div>)}
      {unread > 0 && <><MenuSeparator /><MenuItem onSelect={async () => { await savedApi.markRead(projectId); qc.invalidateQueries({ queryKey: ["notifications"] }); }}>Mark all as read</MenuItem></>}
    </Menu>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
      {NAV.map((g, i) => (
        <div key={i}>
          {g.label && <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{g.label}</div>}
          <ul className="space-y-0.5">{g.items.map((it) => (
            <li key={it.to}><NavLink to={it.to} end={it.to === "/"} onClick={onNavigate} className={({ isActive }) => cn("flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm", isActive ? "bg-accent font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><it.icon className="h-4 w-4" aria-hidden />{it.label}</NavLink></li>
          ))}</ul>
        </div>
      ))}
    </nav>
  );
}

export function WorkspaceLayout(): ReactNode {
  const { me, logout } = useAuth();
  const nav = useNavigate();
  const { project, projects, isLoading } = useProject();
  const { theme, toggleTheme, setProjectId } = useUI();
  const [open, setOpen] = useState(false);
  if (isLoading) return <div className="p-10"><LoadingBlock label="Loading workspace" /></div>;
  if (!project) return <OnboardingPage />;
  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-2">Skip to content</a>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
        <Link to="/" className="flex h-14 items-center gap-2 border-b border-border px-4 font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground"><BarChart3 className="h-4 w-4" /></span>Analytics</Link>
        <Sidebar />
      </aside>
      {open && <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation"><div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card"><div className="flex h-14 items-center border-b border-border px-4 font-semibold">Analytics</div><Sidebar onNavigate={() => setOpen(false)} /></aside></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur md:px-5">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}><MenuIcon className="h-5 w-5" /></Button>
          <Menu align="start" trigger={<Button aria-label={`Project: ${project.name}`}><span className="max-w-[10rem] truncate">{project.name}</span><ChevronDown className="h-3.5 w-3.5 opacity-60" /></Button>}>
            <MenuLabel>Switch project</MenuLabel>
            {projects.map((p) => <MenuItem key={p.id} onSelect={() => setProjectId(p.id)}>{p.name}{p.id === project.id && " ✓"}</MenuItem>)}
            <MenuSeparator /><MenuItem onSelect={() => nav("/settings/project")}>Project settings</MenuItem>
          </Menu>
          <div className="hidden min-w-0 flex-1 px-2 md:block"><Breadcrumbs /></div>
          <div className="ml-auto flex items-center gap-2"><DateRangePicker /><Notifications projectId={project.id} />
            <Button variant="ghost" size="icon" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleTheme}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
            <Menu trigger={<Button variant="ghost" size="icon" aria-label="Account menu" className="rounded-full bg-muted text-xs font-semibold">{(me?.user.name || me?.user.email || "?")[0].toUpperCase()}</Button>}>
              <MenuLabel>{me?.user.email}</MenuLabel><MenuSeparator />
              <MenuItem onSelect={() => nav("/settings/security")}>Security</MenuItem>
              <MenuItem onSelect={async () => { await logout(); nav("/login"); }}><LogOut className="h-4 w-4" />Sign out</MenuItem>
            </Menu>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6"><div className="mb-4 md:hidden"><Breadcrumbs /></div><Outlet context={{ project }} /></main>
      </div>
    </div>
  );
}

export const useWorkspaceProject = () => {
  const { project } = useProject();
  if (!project) throw new Error("no project");
  return project;
};

