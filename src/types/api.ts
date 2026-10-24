export type Role = 'owner' | 'admin' | 'member' | 'viewer'
export const ROLE_RANK: Record<Role, number> = { viewer: 1, member: 2, admin: 3, owner: 4 }

export interface User { id: string; email: string; name: string; email_verified: boolean; created_at: string }
export interface OrgMembership { org_id: string; org_name: string; org_slug: string; role: Role }
export interface Me { user: User; organizations: OrgMembership[]; csrf_token: string }

export interface ProjectSettings {
  timezone: string
  session_timeout_minutes: number
  retention_days: number | null
  ip_mode: 'store' | 'anonymize' | 'discard'
  rate_limit_per_second: number
  property_denylist: string[]
}
export interface Project { id: string; org_id: string; name: string; settings: ProjectSettings; role: Role; created_at: string }
export interface ApiKey { id: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null; expires_at: string | null }
export interface ApiKeyCreated extends ApiKey { key: string }
export interface ProjectCreated extends Project { api_key: ApiKeyCreated }
export interface Member { user_id: string; email: string; name: string; role: Role; joined_at: string }
export interface Invitation { id: string; email: string; role: Role; created_at: string }
export interface AuditLog { id: string; action: string; user_id: string | null; project_id: string | null; target_type: string | null; target_id: string | null; metadata: Record<string, unknown>; ip: string | null; created_at: string }
export interface UsageDay { date: string; requests: number; events_accepted: number; events_rejected: number; events_duplicate: number; rate_limited: number }
export interface Usage { days: UsageDay[]; totals: Record<string, number>; rate_limit_per_second: number }

// ---- filters & queries -----------------------------------------------------------------------
export type Operator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'is_set' | 'is_not_set' | 'in' | 'not_in'
export interface PropertyFilter { type: 'event' | 'person'; property: string; operator: Operator; value?: unknown }
export interface CohortFilter { type: 'cohort'; cohort_id: string; negate?: boolean }
export type Filter = PropertyFilter | CohortFilter
export interface DateRange { from?: string | null; to?: string | null; preset?: string | null }
export interface Breakdown { type: 'event' | 'person'; property: string; limit?: number }
export type Interval = 'hour' | 'day' | 'week' | 'month'
export type TrendMetric = 'total_events' | 'unique_users' | 'avg_events_per_user' | 'frequency' | 'sum' | 'avg' | 'min' | 'max' | 'median' | 'p90'

export interface TrendSeriesDef { event: string; label?: string | null; filters: Filter[] }
export interface TrendQuery {
  type: 'trend'; series: TrendSeriesDef[]; metric: TrendMetric; metric_property?: string | null
  date_range: DateRange; interval: Interval; filters: Filter[]; breakdown?: Breakdown | null; compare_previous: boolean; timezone?: string | null
}
export interface FunnelStepDef { event: string; label?: string | null; filters: Filter[] }
export interface FunnelQuery {
  type: 'funnel'; steps: FunnelStepDef[]; date_range: DateRange
  conversion_window: { value: number; unit: 'second' | 'minute' | 'hour' | 'day' | 'week' }
  filters: Filter[]; breakdown?: Breakdown | null; timezone?: string | null
}
export interface RetentionQuery {
  type: 'retention'; initial_event: { event: string; filters: Filter[] }; return_event: { event: string; filters: Filter[] }
  cohort_type: 'first_time' | 'recurring'; interval: 'day' | 'week' | 'month'; periods: number; offsets?: number[] | null
  date_range: DateRange; filters: Filter[]; timezone?: string | null
}
export interface SessionsQuery { type: 'sessions'; date_range: DateRange; interval: Interval; filters: Filter[]; timezone?: string | null }
export interface PathsQuery {
  type: 'paths'; path_type: 'event' | 'page'; start_event?: string | null; depth: number; max_nodes_per_step: number
  date_range: DateRange; filters: Filter[]; timezone?: string | null
}
export type AnalyticsQuery = TrendQuery | FunnelQuery | RetentionQuery | SessionsQuery | PathsQuery

// ---- results ------------------------------------------------------------------------------------
export interface SeriesResult { label: string; event?: string | null; breakdown_value?: string | null; data: (number | null)[]; total: number | null }
export interface TrendResult { type: 'trend'; kind: 'time_series' | 'distribution'; interval: Interval | null; labels: string[]; series: SeriesResult[]; date_from: string; date_to: string; timezone: string; previous?: TrendResult | null }
export interface FunnelStepResult { order: number; event: string; label: string; count: number; conversion_rate: number | null; dropoff_count: number; dropoff_rate: number; overall_conversion_rate: number; avg_time_to_convert_seconds: number | null; median_time_to_convert_seconds: number | null }
export interface FunnelResult { type: 'funnel'; steps: FunnelStepResult[]; overall_conversion_rate: number; breakdowns?: { value: string; steps: FunnelStepResult[]; overall_conversion_rate: number }[] | null; conversion_window_seconds: number }
export interface RetentionCell { offset: number; count: number | null; rate: number | null }
export interface RetentionResult { type: 'retention'; interval: string; offsets: number[]; cohorts: { period: string; size: number; cells: RetentionCell[] }[]; average: RetentionCell[] }
export interface SessionSummary { sessions: number; avg_duration_seconds: number | null; avg_events_per_session: number | null; avg_pages_per_session: number | null; bounce_rate: number | null; unique_users: number }
export interface SessionsResult { type: 'sessions'; summary: SessionSummary; interval: Interval; labels: string[]; sessions_series: number[]; avg_duration_series: (number | null)[]; previous?: SessionSummary | null }
export interface PathsResult { type: 'paths'; edges: { step: number; source: string; target: string; count: number }[]; sessions: number }
export type AnalyticsResult = TrendResult | FunnelResult | RetentionResult | SessionsResult | PathsResult
export interface QueryEnvelope<R = AnalyticsResult> { query_type: string; result: R; cached: boolean; computed_at: string; duration_ms: number }

export interface Kpis { total_users: number; active_users: number; new_users: number; total_events: number; sessions: number; events_per_user: number; avg_session_duration_seconds: number | null }
export interface Overview {
  kpis: Kpis; previous_kpis: Kpis | null; interval: Interval; labels: string[]
  event_volume: number[]; active_users_series: number[]; new_users_series: number[]; user_growth_series: number[]
  top_events: { event: string; count: number; unique_users: number }[]
  top_pages: { path: string; views: number; unique_visitors: number; avg_views_per_user: number }[]
  retention: RetentionResult; date_from: string; date_to: string; timezone: string
}

// ---- explorer ------------------------------------------------------------------------------------
export interface EventRow {
  id: string; event: string; timestamp: string; received_at: string; distinct_id: string; anonymous_id: string | null; person_id: string
  insert_id: string | null; properties: Record<string, unknown>; path: string | null; hostname: string | null
  device: { browser: string | null; browser_version: string | null; os: string | null; os_version: string | null; device_type: string | null }
  country: string | null; ip: string | null; user_agent: string | null
  person?: { id: string; properties: Record<string, unknown>; first_seen: string; last_seen: string } | null
}
export interface PersonRow {
  id: string; distinct_ids: string[]; email: string | null; name: string | null; is_identified: boolean; properties: Record<string, unknown>
  first_seen: string; last_seen: string; event_count: number; sessions: number; country: string | null; browser: string | null; os: string | null; device_type: string | null
}
export interface Paged<T> { items: T[]; next_cursor: string | null }
export interface SessionRow { person_id: string; distinct_id: string; start: string; end: string; duration_seconds: number; events: number; pages: number; entry_path: string | null; exit_path: string | null }
export interface EventDefinition { name: string; first_seen: string; last_seen: string }
export interface PropertyDefinition { name: string; kind: 'event' | 'person'; value_type: string; builtin?: boolean }

// ---- saved objects ------------------------------------------------------------------------------
export interface Visualization { chart: string; options: Record<string, unknown> }
export interface Report { id: string; project_id: string; name: string; description: string; query: AnalyticsQuery; visualization: Visualization; created_by: string | null; created_by_name: string | null; created_at: string; updated_at: string }
export interface WidgetLayout { x: number; y: number; w: number; h: number }
export interface Widget { id: string; title: string; report_id?: string | null; query?: AnalyticsQuery | null; visualization: Visualization; layout: WidgetLayout }
export interface DashboardConfig { widgets: Widget[]; date_range?: DateRange | null }
export interface Dashboard { id: string; project_id: string; name: string; description: string; config: DashboardConfig; created_at: string; updated_at: string }

export type CohortCriterion =
  | { type: 'performed_event'; event: string; operator: 'at_least' | 'at_most' | 'exactly'; count: number; within_days?: number | null; filters: PropertyFilter[] }
  | { type: 'not_performed_event'; event: string; within_days?: number | null; filters: PropertyFilter[] }
  | { type: 'person_property'; property: string; operator: Operator; value?: unknown }
  | { type: 'first_seen'; operator: 'within_last_days' | 'before' | 'after'; days?: number | null; date?: string | null }
export interface CohortDefinition { match: 'all' | 'any'; criteria: CohortCriterion[] }
export interface Cohort { id: string; project_id: string; name: string; description: string; definition: CohortDefinition; last_count: number | null; last_calculated_at: string | null; created_at: string; updated_at: string }

export interface Alert {
  id: string; project_id: string; name: string; enabled: boolean
  query: { event: string; metric: string; metric_property?: string | null; filters: Filter[] }
  condition: { operator: string; value: number }; period: 'hour' | 'day' | 'week'; webhook_url: string | null
  state: 'ok' | 'firing' | 'unknown'; last_value: number | null; last_evaluated_at: string | null; last_triggered_at: string | null; last_error: string | null; created_at: string
}
export interface Notification { id: string; project_id: string; alert_id: string | null; kind: string; title: string; body: string; data: Record<string, unknown>; created_at: string; read_at: string | null }
export interface ExportJob { id: string; project_id: string; kind: string; format: string; status: string; row_count: number | null; error: string | null; created_at: string; finished_at: string | null }
