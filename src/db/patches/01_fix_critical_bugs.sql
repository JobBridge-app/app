-- ==============================================================================
-- JOBBRIDGE CRITICAL FIXES (Bug 1 & 2 + Role Unification)
-- ==============================================================================

-- 1. Centralize Effective Role Logic
-- This function is the Single Source of Truth for roles in RLS and UI.
CREATE OR REPLACE FUNCTION get_effective_role(target_user_id UUID)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_demo boolean;
    demo_view text;
    override_view text;
    base_type text;
BEGIN
    -- Priority 1: Demo Mode
    SELECT enabled, demo_view
    INTO is_demo, demo_view
    FROM demo_sessions
    WHERE user_id = target_user_id;

    IF is_demo THEN
        RETURN demo_view; -- 'job_seeker' or 'job_provider'
    END IF;

    -- Priority 2: Active Role Override
    SELECT view_as
    INTO override_view
    FROM role_overrides
    WHERE user_id = target_user_id
    AND expires_at > NOW();

    IF override_view IS NOT NULL THEN
        RETURN override_view;
    END IF;

    -- Priority 3: Base Profile Type
    SELECT account_type::text INTO base_type FROM profiles WHERE id = target_user_id;

    IF base_type = 'job_provider' THEN
        RETURN 'job_provider';
    END IF;

    RETURN 'job_seeker'; -- Default fallback
END;
$$;

-- 2. Clean RLS on 'jobs' table
-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policy for Job Seekers (and everyone): View Open/Published Jobs
-- We use get_effective_role to ensure overrides work for RLS too.
DROP POLICY IF EXISTS "Public jobs are visible" ON jobs;
CREATE POLICY "Public jobs are visible" ON jobs
FOR SELECT
USING (
    status = 'open'
    OR
    posted_by = auth.uid() -- Providers see their own
);

-- Policy for Creating Jobs (Providers only)
DROP POLICY IF EXISTS "Providers can create jobs" ON jobs;
CREATE POLICY "Providers can create jobs" ON jobs
FOR INSERT
WITH CHECK (
    auth.uid() = posted_by
    AND
    get_effective_role(auth.uid()) = 'job_provider'
);

-- Policy for Updating Jobs (Owners only)
DROP POLICY IF EXISTS "Owners can update jobs" ON jobs;
CREATE POLICY "Owners can update jobs" ON jobs
FOR UPDATE
USING (auth.uid() = posted_by);

-- 3. Atomize Job Creation (Fix Bug 2)
-- Wraps insert of 'jobs' and 'job_private_details' in one transaction.

CREATE OR REPLACE FUNCTION create_job_atomic(
    p_market_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_wage_hourly FLOAT,
    p_category TEXT,
    p_address_reveal_policy TEXT,
    p_public_location_label TEXT,
    p_public_lat FLOAT,
    p_public_lng FLOAT,
    -- Private Details
    p_address_full TEXT DEFAULT NULL,
    p_private_lat FLOAT DEFAULT NULL,
    p_private_lng FLOAT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_location_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job_id UUID;
    v_job_data RECORD;
BEGIN
    -- 1. Verify Role
    IF get_effective_role(auth.uid()) <> 'job_provider' THEN
        RAISE EXCEPTION 'Only Job Providers can create jobs.';
    END IF;

    -- 2. Insert into jobs
    INSERT INTO jobs (
        posted_by,
        market_id,
        title,
        description,
        wage_hourly,
        status,
        category,
        address_reveal_policy,
        public_location_label,
        public_lat,
        public_lng
    ) VALUES (
        auth.uid(),
        p_market_id,
        p_title,
        p_description,
        p_wage_hourly,
        'open', -- Default to open for now, or pass as param
        p_category::job_category, -- Cast if enum
        p_address_reveal_policy,
        p_public_location_label,
        p_public_lat,
        p_public_lng
    )
    RETURNING * INTO v_job_data;

    v_job_id := v_job_data.id;

    -- 3. Insert into job_private_details
    INSERT INTO job_private_details (
        job_id,
        address_full,
        private_lat,
        private_lng,
        notes,
        location_id
    ) VALUES (
        v_job_id,
        p_address_full,
        p_private_lat,
        p_private_lng,
        p_notes,
        p_location_id
    );

    -- 4. Return new job data
    RETURN to_jsonb(v_job_data);

EXCEPTION WHEN OTHERS THEN
    -- Transaction automatically rolls back on exception
    RAISE;
END;
$$;

-- 4. RLS for job_private_details (Ensure Seekers can't read it by default)
ALTER TABLE job_private_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner access private details" ON job_private_details;
CREATE POLICY "Owner access private details" ON job_private_details
    USING (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_private_details.job_id AND jobs.posted_by = auth.uid())
    );

-- (Assuming 'applications' logic exists for accepted applicants, keeping existing if good)
-- Re-applying the one from plan just in case:
DROP POLICY IF EXISTS "Applicant access private details" ON job_private_details;
CREATE POLICY "Applicant access private details" ON job_private_details
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM applications 
            JOIN jobs ON applications.job_id = jobs.id
            WHERE job_private_details.job_id = applications.job_id 
            AND applications.user_id = auth.uid()
            AND (
                jobs.address_reveal_policy = 'after_apply'
                OR
                (jobs.address_reveal_policy = 'after_accept' AND applications.status = 'accepted')
            )
        )
    );
