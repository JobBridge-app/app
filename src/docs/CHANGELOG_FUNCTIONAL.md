# Changelog: Functional Platform Phase

## Implemented Features

### 1. Functional Core Flows
-   **Job Creation**: Providers can now post real jobs (`/offers/new`).
-   **Applications**:
    -   Seekers can apply to jobs (Guardian Gate enforced).
    -   Providers view applications in `/app-home/applications`.
    -   Providers can **Accept/Reject** applications.
-   **Activity Dashboard**: Seekers track their applications and status in `/app-home/activity`.

### 2. Notifications System
-   **Inbox**: Centralized `/app-home/notifications` page.
-   **Preferences**: Fine-grained control over Email subscriptions at `/app-home/notifications/settings`.
-   **Triggers**:
    -   **New Application** -> Notifies Job Owner.
    -   **Status Update** -> Notifies Applicant.

### 3. Navigation & UX
-   **Responsive Header**: "Liquid Glass" header now handles mobile overflow.
-   **Nav Structure**:
    -   Seeker: Jobs, Activity, Notifications, Profile.
    -   Provider: Offers, Applications, Messages, Notifications, Profile.
-   **Theme System**: Dark/Light mode support with blue-toned aesthetics.

### 4. Database Schema
-   Added tables: `notifications`, `notification_preferences`, `guardian_invitations`.
-   Updated RLS policies for strict separation of concerns.

## Verification Steps
1.  **Provider Role**: 
    -   Post a job -> Check `/offers`.
    -   Wait for application -> Check Notifications -> Check `/applications` -> Accept/Reject.
2.  **Seeker Role**:
    -   Apply to a job -> Check `/activity`.
    -   Wait for status change -> Check Notifications.
3.  **Settings**:
    -   Toggle Dark/Light mode.
    -   Update Notification preferences.
