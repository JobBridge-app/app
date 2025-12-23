-- ALIGN DEMO_JOBS WITH JOBS TABLE
-- This patch adds missing columns to demo_jobs to ensure the demo creation flow works identical to production.

-- 1. Wage (Hourly)
ALTER TABLE demo_jobs ADD COLUMN IF NOT EXISTS wage_hourly numeric;

-- 2. Public Location Details
ALTER TABLE demo_jobs ADD COLUMN IF NOT EXISTS public_location_label TEXT;
ALTER TABLE demo_jobs ADD COLUMN IF NOT EXISTS public_lat FLOAT;
ALTER TABLE demo_jobs ADD COLUMN IF NOT EXISTS public_lng FLOAT;

-- 3. Privacy & Categories
ALTER TABLE demo_jobs ADD COLUMN IF NOT EXISTS address_reveal_policy TEXT CHECK (address_reveal_policy IN ('after_apply', 'after_accept')) DEFAULT 'after_apply';
-- Using TEXT for category to avoid dependency on specific Enum type existence/naming
ALTER TABLE demo_jobs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';

-- 4. Ensure demo_jobs has RLS enabled (best practice)
ALTER TABLE demo_jobs ENABLE ROW LEVEL SECURITY;

-- 5. Add policy if missing (Simplified for demo: posted_by owner access)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'demo_jobs' AND policyname = 'Users manage their own demo jobs'
    ) THEN
        CREATE POLICY "Users manage their own demo jobs" ON demo_jobs
            FOR ALL USING (posted_by = auth.uid());
    END IF;
END
$$;
