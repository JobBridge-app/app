/*
* 001_hardening.sql
* Phase 9: Database Hardening & Security
* 
* 1. Enables RLS on all public tables.
* 2. Adds strictly scoped policies for audit-flagged tables.
* 3. Restricts 'jobs' feed access (Providers see only their own).
* 4. Adds missing indexes.
*/

BEGIN;

-----------------------------------------------------------------------
-- 1. Enable RLS on all tables
-----------------------------------------------------------------------
ALTER TABLE IF EXISTS "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."user_system_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."system_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."moderation_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."demo_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."demo_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."demo_applications" ENABLE ROW LEVEL SECURITY;

-----------------------------------------------------------------------
-- 2. Policies for Notifications & Preferences (Owner Only)
-----------------------------------------------------------------------

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON "public"."notifications";
CREATE POLICY "Users can view own notifications" ON "public"."notifications"
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON "public"."notifications";
CREATE POLICY "Users can update own notifications" ON "public"."notifications"
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id); -- For marking read

-- Notification Preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON "public"."notification_preferences";
CREATE POLICY "Users can view own preferences" ON "public"."notification_preferences"
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON "public"."notification_preferences";
CREATE POLICY "Users can update own preferences" ON "public"."notification_preferences"
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON "public"."notification_preferences";
CREATE POLICY "Users can insert own preferences" ON "public"."notification_preferences"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-----------------------------------------------------------------------
-- 3. Policies for System Roles & Reports (Restricted)
-----------------------------------------------------------------------

-- System Roles (Public Read for checking staff status is okay? Or safer restricted? 
-- Let's allow Authenticated Read for now so UI can show badges)
DROP POLICY IF EXISTS "Authenticated can read system roles" ON "public"."system_roles";
CREATE POLICY "Authenticated can read system roles" ON "public"."system_roles"
    FOR SELECT TO authenticated
    USING (true);

-- User System Roles (Read own)
DROP POLICY IF EXISTS "Users can view own system roles" ON "public"."user_system_roles";
CREATE POLICY "Users can view own system roles" ON "public"."user_system_roles"
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Reports (Insert Authenticated, Select None/Staff)
DROP POLICY IF EXISTS "Users can create reports" ON "public"."reports";
CREATE POLICY "Users can create reports" ON "public"."reports"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "No public view of reports" ON "public"."reports";
-- Implicitly no select policy means no one (except service role) can select. Correct for now.

-----------------------------------------------------------------------
-- 4. Critical: Jobs Feed Restriction (Provider Restriction)
-----------------------------------------------------------------------
-- Requirement: Provider cannot see feed. Only Seeker (Youth) and Anon (if allowed).
-- Existing policy: 'jobs_select_all' (TRUE). We must drop/replace it.

DROP POLICY IF EXISTS "jobs_select_all" ON "public"."jobs";

CREATE POLICY "Public and Seekers can view open jobs, Providers see own" ON "public"."jobs"
    FOR SELECT TO public
    USING (
        -- User is the owner
        (auth.uid() = posted_by)
        OR
        -- OR User is NOT logged in (Anon feed is allowed? Assuming yes for SEO/Landing)
        (auth.role() = 'anon')
        OR
        -- OR User is logged in BUT is NOT a job provider
        (
             auth.role() = 'authenticated' 
             AND 
             NOT EXISTS (
                 SELECT 1 FROM profiles 
                 WHERE id = auth.uid() 
                 AND account_type = 'job_provider'::public.account_type
             )
        )
    );

-----------------------------------------------------------------------
-- 5. Indexes
-----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON public.jobs (posted_by);
CREATE INDEX IF NOT EXISTS idx_jobs_market_id ON public.jobs (market_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

COMMIT;
