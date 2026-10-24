import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceLayout } from "@/layouts/WorkspaceLayout";
import { LoadingBlock } from "@/components/ui/misc";
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from "@/pages/AuthMisc";
import { CohortsPage } from "@/pages/Cohorts";
import { DashboardDetailPage, DashboardsPage } from "@/pages/Dashboards";
import { EventsPage } from "@/pages/Events";
import { FunnelsPage } from "@/pages/Funnels";
import { LoginPage } from "@/pages/Login";
import { OverviewPage } from "@/pages/Overview";
import { PathsPage } from "@/pages/Paths";
import { RegisterPage } from "@/pages/Register";
import { ReportsPage } from "@/pages/Reports";
import { RetentionPage } from "@/pages/Retention";
import { SessionsPage } from "@/pages/Sessions";
import { SettingsRoutes } from "@/pages/settings/Settings";
import { TrendsPage } from "@/pages/Trends";
import { UserDetailPage, UsersPage } from "@/pages/Users";

function Protected({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-10"><LoadingBlock label="Loading" /></div>;
  if (!me) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route element={<Protected><WorkspaceLayout /></Protected>}>
        <Route index element={<OverviewPage />} />
        <Route path="insights/trends" element={<TrendsPage />} />
        <Route path="insights/funnels" element={<FunnelsPage />} />
        <Route path="insights/retention" element={<RetentionPage />} />
        <Route path="insights/paths" element={<PathsPage />} />
        <Route path="insights/cohorts" element={<CohortsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="dashboards" element={<DashboardsPage />} />
        <Route path="dashboards/:id" element={<DashboardDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings/*" element={<SettingsRoutes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
