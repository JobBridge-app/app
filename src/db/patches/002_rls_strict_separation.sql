-- STRICT RLS SEPARATION: Normal vs Demo
-- Enforce that:
-- 1. Normal users ONLY see 'jobs' (real data)
-- 2. Demo users ONLY see 'demo_jobs'
-- 3. Cross-access is blocked at DB level

-- =============================================================================
-- HELPER: Check if user is in Demo Mode
-- =============================================================================
CREATE OR REPLACE FUNCTION is_demo_user()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM demo_sessions
        WHERE user_id = auth.uid()
        AND enabled = true
    );
END;
$$;

-- =============================================================================
-- 1. SECURE REAL DATA (public.jobs)
-- =============================================================================
-- Drop existing broad policies to replace with strict ones
DROP POLICY IF EXISTS "Public jobs are viewable by everyone" ON jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
DROP POLICY IF EXISTS "Enable read access for all users" ON jobs; -- default supabase one if exists

-- SELECT: Only if NOT demo user (or own job)
CREATE POLICY "Strict: View Real Jobs" ON jobs
    FOR SELECT USING (
        (auth.uid() = posted_by) -- Always see own
        OR
        (status = 'open' AND NOT is_demo_user()) -- Public feed: Only if NOT demo
    );

-- INSERT/UPDATE/DELETE: Only if NOT demo user (and is owner)
CREATE POLICY "Strict: Manage Real Jobs" ON jobs
    FOR ALL USING (
        auth.uid() = posted_by
        AND NOT is_demo_user() -- Demo users cannot touch real DB
    );

-- =============================================================================
-- 2. SECURE DEMO DATA (public.demo_jobs)
-- =============================================================================
ALTER TABLE demo_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own demo jobs" ON demo_jobs;

-- SELECT: Only if IS demo user
CREATE POLICY "Strict: View Demo Jobs" ON demo_jobs
    FOR SELECT USING (
        (auth.uid() = posted_by) -- Always see own (likely created in demo mode)
        OR
        (status = 'open' AND is_demo_user()) -- Feed: Only if IS demo
    );

-- INSERT/UPDATE/DELETE: Only if IS demo user
CREATE POLICY "Strict: Manage Demo Jobs" ON demo_jobs
    FOR ALL USING (
        auth.uid() = posted_by
        AND is_demo_user()
    );

-- =============================================================================
-- 3. APPLICATIONS (Cascade logic)
-- =============================================================================
-- Real Applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strict: View Real Apps" ON applications
    FOR SELECT USING (
        (user_id = auth.uid()) -- Seeker sees own
        OR
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.posted_by = auth.uid()) -- Provider sees apps for their jobs
    );

-- Demo Applications
ALTER TABLE demo_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strict: View Demo Apps" ON demo_applications
    FOR SELECT USING (
        is_demo_user() -- Must be in demo mode to interact with demo apps
        AND (
            (user_id = auth.uid())
            OR
            EXISTS (SELECT 1 FROM demo_jobs WHERE demo_jobs.id = demo_applications.job_id AND demo_jobs.posted_by = auth.uid())
        )
    );
