/*
* 002_fix_demo_rls.sql
* Fixes missing policies for demo tables that were locked down in 001.
*/

BEGIN;

-- Demo Sessions: Owner can do everything
DROP POLICY IF EXISTS "Users can manage own demo session" ON "public"."demo_sessions";
CREATE POLICY "Users can manage own demo session" ON "public"."demo_sessions"
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Demo Jobs: 
-- Read: Open for all authenticated (since demo is shared or user specific? Logic seems to be per user in code?)
-- Code says: supabase.from("demo_jobs").select("*").eq("posted_by", profile.id)
-- So it seems each user has their own demo jobs? Or is it shared?
-- The schema shows `posted_by`. 
-- Let's allow users to CRUD their own demo jobs (posted_by = auth.uid())
-- AND allow reading ALL demo jobs?
-- In Seeker view: `supabase.from("demo_jobs").select("*").eq("status", "open")`.
-- So Seeker needs to read ALL open demo jobs.

DROP POLICY IF EXISTS "Manage own demo jobs" ON "public"."demo_jobs";
CREATE POLICY "Manage own demo jobs" ON "public"."demo_jobs"
    FOR ALL TO authenticated
    USING (auth.uid() = posted_by)
    WITH CHECK (auth.uid() = posted_by);

DROP POLICY IF EXISTS "Read all open demo jobs" ON "public"."demo_jobs";
CREATE POLICY "Read all open demo jobs" ON "public"."demo_jobs"
    FOR SELECT TO authenticated
    USING (true); -- Ideally status='open' but let's be permissive for demo

-- Demo Applications:
-- User can insert (apply).
-- User can read own applications.
-- Job Owner (posted_by of linked job) can read applications?
-- Since demo_applications links to demo_jobs... 
-- Schema: job_id, user_id.

DROP POLICY IF EXISTS "Manage own demo applications" ON "public"."demo_applications";
CREATE POLICY "Manage own demo applications" ON "public"."demo_applications"
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Provider needs to see applications for their jobs.
-- This requires a join policy or permissive read.
-- For Demo simplicity: Allow reading ALL demo applications if you are in demo mode?
-- Or just allow reading all authenticated for now? Data is effectively ephemeral/mock.
-- Better: "Read all demo applications" to avoid complex join RLS in demo.

DROP POLICY IF EXISTS "Read all demo applications" ON "public"."demo_applications";
CREATE POLICY "Read all demo applications" ON "public"."demo_applications"
    FOR SELECT TO authenticated
    USING (true);

COMMIT;
