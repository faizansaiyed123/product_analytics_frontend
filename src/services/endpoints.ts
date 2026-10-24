import { api } from "./api";
import type {
  Alert, AnalyticsQuery, ApiKey, ApiKeyCreated, AuditLog, Cohort, CohortDefinition, Dashboard, EventRow, ExportJob, Filter, Invitation, Me, Member,
  Notification, Overview, Page, PersonRow, Project, ProjectCreated, ProjectSettings, PropertyDef, QueryEnvelope, Report, SessionRow, Usage, DateRange, Widget,
} from "@/types";

export const authApi = {
  me: () => api<Me>("/auth/me"),
  login: (email: string, password: string) => api<Me>("/auth/login", { method: "POST", body: { email, password } }),
  register: (b: { email: string; password: string; name: string; organization_name: string }) => api<Me>("/auth/register", { method: "POST", body: b }),
  logout: () => api("/auth/logout", { method: "POST" }),
  changePassword: (current_password: string, new_password: string) => api("/auth/change-password", { method: "POST", body: { current_password, new_password } }),
  requestReset: (email: string) => api("/auth/password-reset/request", { method: "POST", body: { email } }),
  confirmReset: (token: string, new_password: string) => api("/auth/password-reset/confirm", { method: "POST", body: { token, new_password } }),
  confirmEmail: (token: string) => api("/auth/verify-email/confirm", { method: "POST", body: { token } }),
};

export const orgApi = {
  create: (name: string) => api("/organizations", { method: "POST", body: { name } }),
  members: (id: string) => api<Member[]>(`/organizations/${id}/members`),
  invitations: (id: string) => api<Invitation[]>(`/organizations/${id}/invitations`),
  addMember: (id: string, email: string, role: string) => api<{ status: "added" | "invited" }>(`/organizations/${id}/members`, { method: "POST", body: { email, role } }),
  setRole: (id: string, userId: string, role: string) => api(`/organizations/${id}/members/${userId}`, { method: "PATCH", body: { role } }),
  remove: (id: string, userId: string) => api(`/organizations/${id}/members/${userId}`, { method: "DELETE" }),
  revokeInvite: (id: string, inviteId: string) => api(`/organizations/${id}/invitations/${inviteId}`, { method: "DELETE" }),
  audit: (id: string) => api<AuditLog[]>(`/organizations/${id}/audit-logs`, { params: { limit: 100 } }),
};

export const projectApi = {
  list: () => api<Project[]>("/projects"),
  create: (org_id: string, name: string) => api<ProjectCreated>("/projects", { method: "POST", body: { org_id, name } }),
  update: (id: string, body: { name?: string; settings?: Partial<ProjectSettings> & { retention_days_set?: boolean } }) => api<Project>(`/projects/${id}`, { method: "PATCH", body }),
  remove: (id: string) => api(`/projects/${id}`, { method: "DELETE" }),
  keys: (id: string) => api<ApiKey[]>(`/projects/${id}/api-keys`),
  createKey: (id: string, name: string) => api<ApiKeyCreated>(`/projects/${id}/api-keys`, { method: "POST", body: { name } }),
  revokeKey: (id: string, keyId: string) => api<ApiKey>(`/projects/${id}/api-keys/${keyId}`, { method: "DELETE" }),
  rotateKey: (id: string, keyId: string, grace_period_hours = 0) => api<ApiKeyCreated>(`/projects/${id}/api-keys/${keyId}/rotate`, { method: "POST", body: { grace_period_hours } }),
  usage: (id: string, days = 30) => api<Usage>(`/projects/${id}/usage`, { params: { days } }),
  purge: (id: string, confirm_name: string) => api(`/projects/${id}/data/purge`, { method: "POST", body: { confirm_name } }),
  eraseUser: (id: string, personId: string) => api(`/projects/${id}/persons/${personId}`, { method: "DELETE" }),
};

export const analyticsApi = {
  query: <T = unknown>(project_id: string, query: AnalyticsQuery, refresh = false) => api<QueryEnvelope<T>>("/analytics/query", { method: "POST", body: { project_id, query, refresh } }),
  overview: (project_id: string, date_range: DateRange, timezone?: string, refresh = false) => api<Overview>("/analytics/overview", { method: "POST", body: { project_id, date_range, timezone, compare_previous: true, refresh } }),
  sessionList: (project_id: string, date_range: DateRange, offset = 0, filters: Filter[] = []) => api<{ items: SessionRow[]; next_offset: number | null }>("/analytics/sessions/list", { method: "POST", body: { project_id, date_range, offset, filters, limit: 50 } }),
};

export const exploreApi = {
  events: (p: Record<string, unknown>) => api<Page<EventRow>>("/events", { params: p }),
  event: (project_id: string, id: string) => api<EventRow>(`/events/${id}`, { params: { project_id } }),
  users: (p: Record<string, unknown>) => api<Page<PersonRow>>("/users", { params: p }),
  user: (id: string) => api<PersonRow>(`/users/${id}`),
  timeline: (id: string, p: Record<string, unknown>) => api<Page<EventRow>>(`/users/${id}/events`, { params: p }),
  eventNames: (project_id: string) => api<{ name: string; first_seen: string; last_seen: string }[]>("/meta/event-definitions", { params: { project_id } }),
  properties: (project_id: string, kind?: string) => api<PropertyDef[]>("/meta/property-definitions", { params: { project_id, kind } }),
  propertyValues: (project_id: string, name: string, kind: string, search?: string) => api<{ value: string; count: number }[]>("/meta/property-values", { params: { project_id, name, kind, search } }),
};

export const savedApi = {
  cohorts: (project_id: string) => api<Cohort[]>("/cohorts", { params: { project_id } }),
  createCohort: (b: { project_id: string; name: string; description?: string; definition: CohortDefinition }) => api<Cohort>("/cohorts", { method: "POST", body: b }),
  deleteCohort: (id: string) => api(`/cohorts/${id}`, { method: "DELETE" }),
  previewCohort: (project_id: string, definition: CohortDefinition) => api<{ count: number }>("/cohorts/preview", { method: "POST", body: { project_id, definition } }),
  cohortMembers: (id: string) => api<{ items: PersonRow[]; total: number }>(`/cohorts/${id}/members`, { params: { limit: 25 } }),
  reports: (project_id: string) => api<Report[]>("/reports", { params: { project_id } }),
  report: (id: string) => api<Report>(`/reports/${id}`),
  createReport: (b: { project_id: string; name: string; description?: string; query: AnalyticsQuery; visualization: object }) => api<Report>("/reports", { method: "POST", body: b }),
  updateReport: (id: string, b: Partial<{ name: string; description: string; query: AnalyticsQuery; visualization: object }>) => api<Report>(`/reports/${id}`, { method: "PATCH", body: b }),
  duplicateReport: (id: string) => api<Report>(`/reports/${id}/duplicate`, { method: "POST" }),
  deleteReport: (id: string) => api(`/reports/${id}`, { method: "DELETE" }),
  dashboards: (project_id: string) => api<Dashboard[]>("/dashboards", { params: { project_id } }),
  dashboard: (id: string) => api<Dashboard>(`/dashboards/${id}`),
  createDashboard: (project_id: string, name: string) => api<Dashboard>("/dashboards", { method: "POST", body: { project_id, name } }),
  updateDashboard: (id: string, b: { name?: string; description?: string; config?: { widgets: Widget[]; date_range?: DateRange | null } }) => api<Dashboard>(`/dashboards/${id}`, { method: "PATCH", body: b }),
  duplicateDashboard: (id: string) => api<Dashboard>(`/dashboards/${id}/duplicate`, { method: "POST" }),
  deleteDashboard: (id: string) => api(`/dashboards/${id}`, { method: "DELETE" }),
  alerts: (project_id: string) => api<Alert[]>("/alerts", { params: { project_id } }),
  createAlert: (b: object) => api<Alert>("/alerts", { method: "POST", body: b }),
  deleteAlert: (id: string) => api(`/alerts/${id}`, { method: "DELETE" }),
  evaluateAlert: (id: string) => api<Alert>(`/alerts/${id}/evaluate`, { method: "POST" }),
  notifications: (project_id: string) => api<{ items: Notification[]; unread: number }>("/notifications", { params: { project_id } }),
  markRead: (project_id: string) => api("/notifications/read", { method: "POST", params: { project_id } }),
  exportJobs: (project_id: string) => api<ExportJob[]>("/export/jobs", { params: { project_id } }),
  createExportJob: (b: object) => api<ExportJob>("/export/jobs", { method: "POST", body: b }),
};
