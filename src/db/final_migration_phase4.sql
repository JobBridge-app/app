    -- ==============================================================================
-- JOBBRIDGE PHASE 4 FINAL MIGRATION
-- Purpose: Implement Theme, Notification Prefs, Job Details, and Policies.
-- Run this in Supabase SQL Editor.
-- ==============================================================================

-- 1. Updates to PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES regions_live(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT CHECK (theme_preference IN ('light', 'dark', 'system')) DEFAULT 'system';

-- 2. Updates to JOBS
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES regions_live(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS public_location_label TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS public_lat FLOAT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS public_lng FLOAT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS address_reveal_policy TEXT CHECK (address_reveal_policy IN ('after_apply', 'after_accept')) DEFAULT 'after_apply';

-- 3. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    email_application_updates BOOLEAN DEFAULT true,
    email_messages BOOLEAN DEFAULT true,
    email_job_updates BOOLEAN DEFAULT true, 
    digest_frequency TEXT CHECK (digest_frequency IN ('instant', 'daily', 'weekly')) DEFAULT 'instant',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, 
    title TEXT NOT NULL,
    body TEXT,
    data JSONB, 
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- 5. Job Private Details
CREATE TABLE IF NOT EXISTS job_private_details (
    job_id UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
    address_full TEXT,
    private_lat FLOAT,
    private_lng FLOAT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE job_private_details ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Provider sees their own private details
CREATE POLICY "Provider Private Details" ON job_private_details
    FOR ALL USING (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_private_details.job_id AND jobs.posted_by = auth.uid())
    );

-- Seeker sees private details only if applied + allowed
CREATE POLICY "Seeker Private Details" ON job_private_details
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

-- 7. Demo Mode
CREATE TABLE IF NOT EXISTS demo_sessions (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    demo_view TEXT CHECK (demo_view IN ('job_seeker', 'job_provider')) DEFAULT 'job_seeker',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS demo_jobs (LIKE jobs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS demo_applications (LIKE applications INCLUDING ALL);

-- 8. PostGIS / Geo Helpers (Haversine fallback)
CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float LANGUAGE plpgsql AS $$
DECLARE
    R float := 6371;
    dLat float := radians(lat2 - lat1);
    dLon float := radians(lon2 - lon1);
    a float := sin(dLat / 2) * sin(dLat / 2) +
               cos(radians(lat1)) * cos(radians(lat2)) *
               sin(dLon / 2) * sin(dLon / 2);
    c float := 2 * atan2(sqrt(a), sqrt(1 - a));
BEGIN
    RETURN R * c;
END;
$$;
