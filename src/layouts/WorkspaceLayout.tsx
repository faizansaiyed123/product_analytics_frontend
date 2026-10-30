import { Activity, BarChart3, Bell, ChevronDown, Filter as FunnelIcon, FileBarChart, GitBranch, LayoutDashboard, LineChart, List, LogOut, Menu as MenuIcon, Moon, Repeat, Settings, Sun, Timer, Users, UsersRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { DateRangePicker } from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { LoadingBlock } from "@/components/ui/misc";
import { OnboardingPage } from "@/pages/Onboarding";
import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/hooks/useProject";
import { savedApi } from "@/services/endpoints";
import { useUI } from "@/stores/ui";
import { cn } from "@/utils/cn";

type NavigationItem = {
  to: string;
  label: string;
  icon: typeof Activity;
};

type NavigationGroup = {
  label?: string;
  items: NavigationItem[];
};

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    items: [{ to: "/", label: "Overview", icon: Activity }],
  },
  {
    label: "Insights",
    items: [
      { to: "/insights/trends", label: "Trends", icon: LineChart },
      { to: "/insights/funnels", label: "Funnels", icon: FunnelIcon },
      { to: "/insights/retention", label: "Retention", icon: Repeat },
      { to: "/insights/paths", label: "Journeys", icon: GitBranch },
      { to: "/insights/cohorts", label: "Cohorts", icon: UsersRound },
    ],
  },
  {
    label: "Data",
    items: [
      { to: "/events", label: "Events", icon: List },
      { to: "/users", label: "Users", icon: Users },
      { to: "/sessions", label: "Sessions", icon: Timer },
    ],
  },
  {
    label: "Library",
    items: [
      { to: "/dashboards", label: "Dashboards", icon: LayoutDashboard },
      { to: "/reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    label: "Manage",
    items: [{ to: "/settings", label: "Settings", icon: Settings }],
  },
];

const BREADCRUMB_LABELS: Record<string, string> = {
  insights: "Insights",
  trends: "Trends",
  funnels: "Funnels",
  retention: "Retention",
  paths: "Journeys",
  cohorts: "Cohorts",
  events: "Events",
  users: "Users",
  sessions: "Sessions",
  dashboards: "Dashboards",
  reports: "Reports",
  settings: "Settings",
  project: "Project",
  "api-keys": "API Keys",
  team: "Team",
  data: "Data Management",
  security: "Security",
  alerts: "Alerts",
};

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  if (!parts.length) {
    return <span className="text-sm font-medium">Overview</span>;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      {parts.map((part, index) => {
        const isCurrent = index === parts.length - 1;
        const label =
          BREADCRUMB_LABELS[part] ?? (part.length > 12 ? "Details" : part);

        return (
          <span
            key={index}
            className="flex items-center gap-1.5"
          >
            {index > 0 && (
              <span aria-hidden>/</span>
            )}
            <span
              className={isCurrent ? "font-medium text-foreground" : ""}
              aria-current={isCurrent ? "page" : undefined}
            >
              {label}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

function Notifications({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications", projectId],
    queryFn: () => savedApi.notifications(projectId),
    refetchInterval: 60_000,
  });

  const unread = data?.unread ?? 0;

  const handleMarkAllAsRead = async () => {
    await savedApi.markRead(projectId);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <Menu
      trigger={
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
          )}
        </Button>
      }
    >
      <MenuLabel>Notifications</MenuLabel>

      {!data?.items.length && (
        <div className="px-2.5 py-3 text-xs text-muted-foreground">
          No notifications yet. Alerts you create will appear here.
        </div>
      )}

      {data?.items.slice(0, 6).map((notification) => (
        <div
          key={notification.id}
          className="max-w-xs px-2.5 py-1.5 text-xs"
        >
          <div
            className={cn(
              "font-medium",
              !notification.read_at && "text-primary",
            )}
          >
            {notification.title}
          </div>
          <div className="text-muted-foreground">
            {notification.body}
          </div>
        </div>
      ))}

      {unread > 0 && (
        <>
          <MenuSeparator />
          <MenuItem onSelect={handleMarkAllAsRead}>
            Mark all as read
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav
      aria-label="Main"
      className="flex-1 space-y-4 overflow-y-auto px-3 py-3"
    >
      {NAVIGATION_GROUPS.map((group, groupIndex) => (
        <div key={groupIndex}>
          {group.label && (
            <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
          )}

          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                      isActive
                        ? "bg-accent font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function WorkspaceLoading() {
  return (
    <div className="p-10">
      <LoadingBlock label="Loading workspace" />
    </div>
  );
}

function DesktopSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <Link
        to="/"
        className="flex h-14 items-center gap-2 border-b border-border px-4 font-semibold"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BarChart3 className="h-4 w-4" />
        </span>
        Analytics
      </Link>
      <Sidebar />
    </aside>
  );
}

function MobileNavigation({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card">
        <div className="flex h-14 items-center border-b border-border px-4 font-semibold">
          Analytics
        </div>
        <Sidebar onNavigate={onClose} />
      </aside>
    </div>
  );
}

function ProjectMenu({
  project,
  projects,
  onProjectSelect,
  onProjectSettings,
}: {
  project: NonNullable<ReturnType<typeof useProject>["project"]>;
  projects: ReturnType<typeof useProject>["projects"];
  onProjectSelect: (projectId: string) => void;
  onProjectSettings: () => void;
}) {
  return (
    <Menu
      align="start"
      trigger={
        <Button aria-label={`Project: ${project.name}`}>
          <span className="max-w-[10rem] truncate">
            {project.name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      }
    >
      <MenuLabel>Switch project</MenuLabel>

      {projects.map((item) => (
        <MenuItem
          key={item.id}
          onSelect={() => onProjectSelect(item.id)}
        >
          {item.name}
          {item.id === project.id && " ✓"}
        </MenuItem>
      ))}

      <MenuSeparator />
      <MenuItem onSelect={onProjectSettings}>
        Project settings
      </MenuItem>
    </Menu>
  );
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={onToggle}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

function AccountMenu({
  me,
  onSecurity,
  onSignOut,
}: {
  me: ReturnType<typeof useAuth>["me"];
  onSecurity: () => void;
  onSignOut: () => Promise<void>;
}) {
  const displayInitial = (me?.user.name || me?.user.email || "?")[0].toUpperCase();

  return (
    <Menu
      trigger={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Account menu"
          className="rounded-full bg-muted text-xs font-semibold"
        >
          {displayInitial}
        </Button>
      }
    >
      <MenuLabel>{me?.user.email}</MenuLabel>
      <MenuSeparator />

      <MenuItem onSelect={onSecurity}>Security</MenuItem>
      <MenuItem onSelect={onSignOut}>
        <LogOut className="h-4 w-4" />
        Sign out
      </MenuItem>
    </Menu>
  );
}

export function WorkspaceLayout(): ReactNode {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const { project, projects, isLoading } = useProject();
  const { theme, toggleTheme, setProjectId } = useUI();

  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  if (isLoading) {
    return <WorkspaceLoading />;
  }

  if (!project) {
    return <OnboardingPage />;
  }

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-2"
      >
        Skip to content
      </a>

      <DesktopSidebar />

      <MobileNavigation
        open={mobileNavigationOpen}
        onClose={() => setMobileNavigationOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur md:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileNavigationOpen(true)}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>

          <ProjectMenu
            project={project}
            projects={projects}
            onProjectSelect={setProjectId}
            onProjectSettings={() => navigate("/settings/project")}
          />

          <div className="hidden min-w-0 flex-1 px-2 md:block">
            <Breadcrumbs />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <DateRangePicker />

            <Notifications projectId={project.id} />

            <ThemeToggle
              theme={theme}
              onToggle={toggleTheme}
            />

            <AccountMenu
              me={me}
              onSecurity={() => navigate("/settings/security")}
              onSignOut={handleSignOut}
            />
          </div>
        </header>

        <main
          id="main"
          className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6"
        >
          <div className="mb-4 md:hidden">
            <Breadcrumbs />
          </div>
          <Outlet context={{ project }} />
        </main>
      </div>
    </div>
  );
}

export const useWorkspaceProject = () => {
  const { project } = useProject();

  if (!project) {
    throw new Error("no project");
  }

  return project;
};
