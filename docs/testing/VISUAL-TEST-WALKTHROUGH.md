# Product Analytics — Visual End-to-End Walkthrough

Product Analytics is a self-hosted product analytics application. A project receives product events through an ingestion API, resolves event identities into people and sessions, and uses those stored events for charts, funnels, retention, journeys, cohorts, reports, alerts and dashboards.

## How the data moves

```mermaid
flowchart LR
  U[Browser / app using SDK] -->|event + project API key| I[FastAPI ingestion API]
  I --> V[Validation, identity resolution, idempotency]
  V --> DB[(PostgreSQL)]
  W[Signed-in analyst] --> UI[React workspace]
  UI -->|cookie session + CSRF token| API[FastAPI analytics API]
  API --> P[Project access and query validation]
  P --> DB
  DB --> P
  P --> API
  API --> UI
  BG[Background worker] --> DB
  BG --> R[(Redis locks / rate limits / cache)]
```

The application has two different authentication paths. Product events use a project ingestion key; dashboard and administration actions use an authenticated session and CSRF protection. The browser and API share a same-origin path in the production Nginx configuration.

## 1. Sign in and create a workspace

![Sign in page](visuals/00-login.png)

Sign in to access your workspace. Your session is protected, and private pages ask you to sign in when needed.

![Registration form](visuals/01-register.png)

Create an account with your email, a secure password, and a workspace name to set up your organization.

![First project setup](visuals/02-first-project.png)

Create a project for the website or application being measured. The project is the scope used by analytics queries, ingestion keys, event data and saved reports.

![API key reveal with the secret redacted in the screenshot](visuals/03-api-key-redacted.png)

Your project’s ingestion key is shown once. Keep it private; the application stores a protected representation rather than the original secret.

## 2. Send events through the real ingestion API

Send events from your website or application using the project’s ingestion key. Events are validated, associated with people and sessions, and stored for analysis. In this walkthrough, the charts and lists use sample activity to demonstrate how incoming events become useful product insights.

## 3. Explore and query analytics

### Overview

![Overview dashboard](visuals/05-overview.png)

The Overview page brings together key metrics, activity volume, growth, popular events and pages. Change the date range or project to explore a different slice of activity.

### Trends

![Trends query](visuals/04-trends.png)

Trends lets you select events, a metric, interval, breakdown and filters to explore changes over time.

![Trends with ingested data](visuals/06-trends-data.png)

Save a useful Trends view as a report and return to it later from the Reports workspace.

### Funnels

![Funnels](visuals/07-funnels.png)

A funnel measures how users progress through ordered event steps. Build a funnel from ordered event steps to understand where users continue or drop off.

### Retention

![Retention](visuals/08-retention.png)

Retention analyses whether users return after an initial event. Cohort dates, interval, timezone and date range must be represented in the query sent to the backend.

### Journeys

![User journeys](visuals/09-journeys.png)

Journeys/paths explore events preceding or following an action. Explore the events that commonly happen before or after a key action, within the selected project.

## 4. Cohorts, people, and event exploration

### Cohorts

![Saved cohort](visuals/10-cohorts.png)

Create a cohort from people who performed `purchase_completed`. Preview the matching audience, save the definition, and reuse that audience in your analysis.

### Events

![Event explorer](visuals/11-events.png)

Explore event activity with date ranges, filters and pagination. Open an event to inspect its properties and the person associated with it.

### Users and timelines

![Users](visuals/12-users.png)

Browse people identified through incoming events. Each profile brings together identity details and a chronological event timeline.

### Sessions

![Sessions](visuals/13-sessions.png)

Sessions group events using project/session rules and the selected time range. Review sessions grouped by the application’s session rules and the selected time range.

## 5. Saved reports and dashboards

### Reports

![Reports](visuals/15-reports.png)

Reports save a query definition and visualization settings so you can revisit and share useful analysis.

### Dashboards

![Dashboards](visuals/14-dashboards.png)

A dashboard can contain saved-report widgets. Add a report as a widget and save the layout to keep your key metrics together.

## 6. Project and workspace administration

### Project settings

![Project settings](visuals/16-project-settings.png)

Project settings cover the project name, timezone, session timeout, IP handling, event rate limit and restricted properties. Changes are authenticated and should be re-read after saving.

### API keys

![API key settings](visuals/17-api-keys.png)

Keys can be listed and, according to the role, created, revoked or rotated. A newly created plaintext key is shown once; list responses should not reveal the stored secret.

### Team and roles

![Team settings](visuals/18-team.png)

Membership and invitations are governed by organization roles. Verify role changes, permission denials, invite revocation and the server-side rule that the final owner cannot be removed or demoted.

### Alerts and notifications

![Alerts](visuals/19-alerts.png)

An alert defines a metric, condition and evaluation period, with an optional webhook. Configure an alert around a metric and condition. When enabled, the background worker evaluates it and can generate notifications.

### Data management

![Data management](visuals/20-data-management.png)

Data management brings together usage and retention controls, event deletion requests, and person erasure. Destructive actions require the appropriate role and explicit confirmation.

### Security

![Security settings](visuals/21-security.png)

Security settings cover session and password management. Account security includes clear handling of incorrect credentials and protected session management.

![Invalid credentials are handled by the actual API](visuals/22-invalid-login.png)

![Password change completed](visuals/23-security-password-changed.png)

Changing your password keeps the current session available and revokes other sessions for added security.

![Forgot-password request](visuals/24-forgot-password.png)

For privacy, the password-reset request uses a consistent confirmation message without revealing whether an email belongs to an account.

![Reset-password form](visuals/25-reset-password.png)

![Invalid reset token error](visuals/26-reset-password-invalid-token.png)

Choose a strong password and use a valid reset link to complete password recovery.

![Invalid email-verification token](visuals/27-verify-email-invalid-token.png)

Email verification helps confirm account ownership before protected account actions.

![Old password rejected after the password change](visuals/28-old-password-rejected.png)

After changing your password, the previous password no longer works; use the new password to sign in again.


### Event detail, user detail and right-to-erasure

![Event detail and properties](visuals/29-event-detail.png)

Open an event to inspect its properties, then follow its person link to view the associated profile.

![User detail and timeline](visuals/30-user-detail.png)

The user page shows the profile and event timeline. Authorized users can request person erasure using the explicit confirmation flow.

![Erased person result](visuals/34-person-erasure-result.png)

After erasure, the interface confirms the action and returns to the user list.

### API-key rotation

![Rotated API key, with secret redacted](visuals/31-key-rotation.png)

Rotate a key when needed. The old key stops working and the newly revealed key can be used for ingestion. Treat the new secret as sensitive.

### Alert notifications and read state

![Firing alert notification](visuals/32-alert-notification.png)

Open an alert notification from the notification bell and mark it as read.

### Team invitation lifecycle

![Viewer invitation in team settings](visuals/33-team-invitations.png)

Invite a teammate with a viewer role, or revoke an invitation that is no longer needed.

