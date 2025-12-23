-- ==============================================================================
-- JOBBRIDGE DATABASE CHANGES PLAN
-- Purpose: Implement Functional Platform, Guardian Gating, Notifications,
--          Market Branding, Privacy, Roles, and Demo Mode.
-- ==============================================================================

-- ... (Existing Phase 1 & 2 content preserved/refined below) ...

-- 1. Standardize Account Types
-- We strictly use 'youth' (Job Seeker) and 'company' (Job Provider).

-- 2. Guardian Invitations Table
CREATE TABLE IF NOT EXISTS guardian_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('active', 'redeemed', 'expired', 'revoked')) DEFAULT 'active',
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_guardian_invitations_token ON guardian_invitations(token);
CREATE INDEX IF NOT EXISTS idx_guardian_invitations_child_id ON guardian_invitations(child_id);

-- 3. Notifications System
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

-- 4. Markets & Branding (Phase 3)
-- Enhance regions_live to act as Markets
ALTER TABLE regions_live ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE regions_live ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE regions_live ADD COLUMN IF NOT EXISTS brand_prefix TEXT DEFAULT 'JobBridge';
ALTER TABLE regions_live ADD COLUMN IF NOT EXISTS centroid_lat FLOAT;
ALTER TABLE regions_live ADD COLUMN IF NOT EXISTS centroid_lng FLOAT;

-- Add market_id and theme_preference to profiles and jobs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES regions_live(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT CHECK (theme_preference IN ('light', 'dark', 'system')) DEFAULT 'system';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES regions_live(id);

-- 5. Job Privacy & Details (Phase 3)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS public_location_label TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS public_lat FLOAT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS public_lng FLOAT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS address_reveal_policy TEXT CHECK (address_reveal_policy IN ('after_apply', 'after_accept')) DEFAULT 'after_apply';

CREATE TABLE IF NOT EXISTS job_private_details (
    job_id UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
    address_full TEXT,
    private_lat FLOAT,
    private_lng FLOAT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE job_private_details ENABLE ROW LEVEL SECURITY;

-- 6. Demo Mode (Phase 3)
CREATE TABLE IF NOT EXISTS demo_sessions (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    demo_view TEXT CHECK (demo_view IN ('job_seeker', 'job_provider')) DEFAULT 'job_seeker',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS demo_jobs (LIKE jobs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS demo_applications (LIKE applications INCLUDING ALL);
CREATE TABLE IF NOT EXISTS demo_notifications (LIKE notifications INCLUDING ALL);

-- 7. Roles & Permissions (Phase 3)
-- Ensure system_roles are seeded
INSERT INTO system_roles (name, description) VALUES
('admin', 'Full system access'),
('moderator', 'Can moderate content'),
('analyst', 'Can view analytics')
ON CONFLICT (name) DO NOTHING;

-- 8. Functions (Legacy & New)
-- Redeem Guardian Invitation
CREATE OR REPLACE FUNCTION redeem_guardian_invitation(token_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    SELECT * INTO invitation_record FROM guardian_invitations 
    WHERE token = token_input AND status = 'active' AND expires_at > NOW();

    IF invitation_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired token');
    END IF;

    UPDATE guardian_invitations 
    SET status = 'redeemed', redeemed_by = auth.uid(), updated_at = NOW()
    WHERE id = invitation_record.id;

    UPDATE profiles 
    SET is_verified = true
    WHERE id = invitation_record.child_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Feed Sorting Function (Phase 3)
-- Install PostGIS if available (or use haversine formula for simple lat/lng)
CREATE EXTENSION IF NOT EXISTS "postgis"; 
-- If PostGIS is too heavy/unavailable, use this haversine helper:
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

CREATE OR REPLACE FUNCTION get_jobs_feed(
    p_market_id UUID,
    p_user_lat FLOAT DEFAULT NULL,
    p_user_lng FLOAT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    posted_by UUID,
    status job_status,
    created_at TIMESTAMPTZ,
    market_id UUID,
    public_location_label TEXT,
    distance_km FLOAT,
    market_name TEXT,
    brand_prefix TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    ref_lat FLOAT;
    ref_lng FLOAT;
BEGIN
    -- Fallback to market centroid if user location is missing
    IF p_user_lat IS NULL OR p_user_lng IS NULL THEN
        SELECT centroid_lat, centroid_lng INTO ref_lat, ref_lng 
        FROM regions_live WHERE id = p_market_id;
    ELSE
        ref_lat := p_user_lat;
        ref_lng := p_user_lng;
    END IF;

    RETURN QUERY
    SELECT 
        j.id,
        j.title,
        j.description,
        j.posted_by,
        j.status,
        j.created_at,
        j.market_id,
        j.public_location_label,
        (CASE 
            WHEN j.public_lat IS NOT NULL AND ref_lat IS NOT NULL THEN 
                calculate_distance(ref_lat, ref_lng, j.public_lat, j.public_lng)
            ELSE NULL 
        END) as distance_km,
        r.display_name as market_name,
        r.brand_prefix
    FROM jobs j
    JOIN regions_live r ON j.market_id = r.id
    WHERE j.status = 'open'
    ORDER BY 
        (j.market_id = p_market_id) DESC, -- Primary market first
        distance_km ASC NULLS LAST,       -- Then by distance
        j.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- RLS UPDATE (Excerpt)
-- Job Private Details Policy
CREATE POLICY "Owner access private details" ON job_private_details
    FOR ALL USING (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_private_details.job_id AND jobs.posted_by = auth.uid())
    );

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
