-- ==============================================================================
-- JOBBRIDGE PATCH 002: DEMO MODE FIXES
-- Purpose: Ensure all demo tables exist (idempotent) and have strict RLS policies.
-- ==============================================================================

-- 1. Ensure Demo Tables Exist
-- We use CREATE TABLE IF NOT EXISTS. If they exist with slightly different schema,
-- this might not update them, but we assume they were created via `LIKE` recently or are empty.

CREATE TABLE IF NOT EXISTS demo_jobs (LIKE jobs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS demo_applications (LIKE applications INCLUDING ALL);

-- This was missing in previous migration
CREATE TABLE IF NOT EXISTS demo_job_private_details (
    job_id UUID PRIMARY KEY REFERENCES demo_jobs(id) ON DELETE CASCADE,
    address_full TEXT,
    private_lat FLOAT,
    private_lng FLOAT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Demo Settings Table (for Staff Controls)
CREATE TABLE IF NOT EXISTS demo_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_demo_jobs_to_public BOOLEAN DEFAULT false,
    last_reset_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row if not exists
INSERT INTO demo_settings (show_demo_jobs_to_public)
SELECT false WHERE NOT EXISTS (SELECT 1 FROM demo_settings);

-- 3. Enable RLS
ALTER TABLE demo_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_job_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_settings ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- >>> DEMO JOBS <<<
-- Demo Users can SELECT, INSERT, UPDATE, DELETE their own demo jobs
-- Context: We assume 'demo_sessions.enabled' = true means user is in Demo Mode.
-- For simplicity in policies, we might just check if they are the owner (posted_by).

-- Policy: View Demo Jobs
-- 1. Owner can always see.
-- 2. Other Demo Users can see (if we want a shared demo market).
-- 3. Public/Normal users: ONLY if demo_settings.show_demo_jobs_to_public is true.

DROP POLICY IF EXISTS "Demo Users can View Demo Jobs" ON demo_jobs;
CREATE POLICY "Demo Users can View Demo Jobs" ON demo_jobs
    FOR SELECT USING (
        -- User is the owner
        auth.uid() = posted_by
        OR
        -- Or User is in Demo Mode (we need a way to check this cheaply)
        -- checking `exists (select 1 from demo_sessions where user_id = auth.uid() and enabled = true)`
        -- is good.
        EXISTS (SELECT 1 FROM demo_sessions WHERE user_id = auth.uid() AND enabled = true)
        OR
        -- Or Global "Show Demo Jobs" is on
        EXISTS (SELECT 1 FROM demo_settings WHERE show_demo_jobs_to_public = true)
    );

DROP POLICY IF EXISTS "Demo Users can Insert Demo Jobs" ON demo_jobs;
CREATE POLICY "Demo Users can Insert Demo Jobs" ON demo_jobs
    FOR INSERT WITH CHECK (
        -- Must be logged in
        auth.uid() = posted_by
        AND
        -- Must be in Demo Mode
        EXISTS (SELECT 1 FROM demo_sessions WHERE user_id = auth.uid() AND enabled = true)
    );

DROP POLICY IF EXISTS "Demo Users can Update Own Demo Jobs" ON demo_jobs;
CREATE POLICY "Demo Users can Update Own Demo Jobs" ON demo_jobs
    FOR UPDATE USING (
        auth.uid() = posted_by
    );

DROP POLICY IF EXISTS "Demo Users can Delete Own Demo Jobs" ON demo_jobs;
CREATE POLICY "Demo Users can Delete Own Demo Jobs" ON demo_jobs
    FOR DELETE USING (
        auth.uid() = posted_by
    );


-- >>> DEMO JOB PRIVATE DETAILS <<<
-- Same logic as real private details, but for demo table

DROP POLICY IF EXISTS "Provider sees own demo private details" ON demo_job_private_details;
CREATE POLICY "Provider sees own demo private details" ON demo_job_private_details
    FOR ALL USING (
        EXISTS (SELECT 1 FROM demo_jobs WHERE demo_jobs.id = demo_job_private_details.job_id AND demo_jobs.posted_by = auth.uid())
    );

DROP POLICY IF EXISTS "Seeker sees demo private details if applied" ON demo_job_private_details;
CREATE POLICY "Seeker sees demo private details if applied" ON demo_job_private_details
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM demo_applications 
            JOIN demo_jobs ON demo_applications.job_id = demo_jobs.id
            WHERE demo_job_private_details.job_id = demo_applications.job_id 
            AND demo_applications.user_id = auth.uid()
            AND (
                demo_jobs.address_reveal_policy = 'after_apply'
                OR
                (demo_jobs.address_reveal_policy = 'after_accept' AND demo_applications.status = 'accepted')
            )
        )
    );


-- >>> DEMO APPLICATIONS <<<

DROP POLICY IF EXISTS "Users can view related demo applications" ON demo_applications;
CREATE POLICY "Users can view related demo applications" ON demo_applications
    FOR SELECT USING (
        -- Applicant
        auth.uid() = user_id
        OR
        -- Job Provider (owner of the job)
        EXISTS (SELECT 1 FROM demo_jobs WHERE demo_jobs.id = demo_applications.job_id AND demo_jobs.posted_by = auth.uid())
    );

DROP POLICY IF EXISTS "Demo Users can create applications" ON demo_applications;
CREATE POLICY "Demo Users can create applications" ON demo_applications
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND
        -- Must be in Demo Mode? Optionally enforce this.
        EXISTS (SELECT 1 FROM demo_sessions WHERE user_id = auth.uid() AND enabled = true)
    );

-- >>> DEMO SETTINGS <<<
-- Only admins can update, but everyone can read (to check visibility)
DROP POLICY IF EXISTS "Everyone can read demo settings" ON demo_settings;
CREATE POLICY "Everyone can read demo settings" ON demo_settings
    FOR SELECT USING (true);
