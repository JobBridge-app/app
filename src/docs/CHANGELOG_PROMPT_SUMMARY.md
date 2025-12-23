# Changelog & Prompt Summary

## Implemented Features (Phase 2)
1.  **Strict Account Separation**:
    -   **Youth (Job Seeker)**: Access restricted to Jobs Feed, Activity, and Profile.
    -   **Company (Provider)**: Access restricted to Offers, Applications (Incoming), and Messages.
    -   **Navigation**: Dynamic "Liquid Glass" Header adapts tabs based on user type.

2.  **Guardian Gating**:
    -   New `is_verified` logic gated by Parent Confirmation.
    -   **Unverified Youth**: Can see jobs but CANNOT apply. See "Elternbestätigung erforderlich" banners.
    -   **Verified Youth**: Full access to apply structure.
    -   **Guardian Application**: Prepared DB structure for `guardian_invitations`.

3.  **Enhanced UX**:
    -   Removed clutter from Header (Logout moved to Profile Menu).
    -   New `ProfileChip` with Avatar and Status Badge.
    -   Simplified "Activity" page for Youth to track everything in one place.

4.  **Security**:
    -   Password Reset Flow implemented (`/auth/forgot-password` -> Email -> `/auth/update-password`).

## Deployment Instructions

### 1. Database Changes
Run the SQL script located at `src/db/jobbridge_changes_plan.sql` in your Supabase SQL Editor to:
-   Create `guardian_invitations` table.
-   Enable RLS policies for `jobs` and `applications`.
-   Create the `redeem_guardian_invitation` security definer function.

### 2. Environment / Auth Config
-   Ensure **Email Auth** is enabled in Supabase.
-   **Site URL**: Set to your production URL (e.g., `https://app.jobbridge.app`).
-   **Redirect URLs**: Add `https://app.jobbridge.app/auth/callback` and `https://app.jobbridge.app/auth/update-password` to your Supabase Auth Allow List.
-   **Email Templates**: Update "Reset Password" template to link to `{{ .SiteURL }}/auth/update-password?code={{ .Token }}` (or standard flow if using implicit link).

### 3. Verification
-   **Test User A (Youth)**: Sign up -> See Banners -> Try clicking Apply (Should see Modal).
-   **Test User B (Company)**: Sign up -> default to Offers page.
