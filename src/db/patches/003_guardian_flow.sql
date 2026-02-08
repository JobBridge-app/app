-- ==============================================================================
-- JOBBRIDGE PATCH 003
-- Purpose: Implement Guardian Consent Flow Tables & Functions
-- ==============================================================================

-- 1. Reset (Ensure clean slate for new table)
DROP TABLE IF EXISTS guardian_invitations CASCADE;

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

-- 3. Update Profiles Table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guardian_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guardian_status TEXT CHECK (guardian_status IN ('none', 'pending', 'linked')) DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guardian_verified_at TIMESTAMPTZ;

-- 4. Enable RLS on guardian_invitations
ALTER TABLE guardian_invitations ENABLE ROW LEVEL SECURITY;


-- Child can view their own invitations
CREATE POLICY "Child can view own invitations" ON guardian_invitations
    FOR SELECT USING (auth.uid() = child_id);

-- Child can create invitations (server-side generation usually bypasses RLS if using service role, 
-- but if using client SDK, they need insert)
CREATE POLICY "Child can create invitations" ON guardian_invitations
    FOR INSERT WITH CHECK (auth.uid() = child_id);

-- Guardian (anyone with the token) needs to be able to read it via the function `redeem_guardian_invitation`,
-- so we might not need a public SELECT policy if we use `SECURITY DEFINER` function.

-- 3. Function to Redeem Invitation
CREATE OR REPLACE FUNCTION redeem_guardian_invitation(token_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
AS $$
DECLARE
    invitation_record RECORD;
    parent_id UUID;
BEGIN
    -- Check if user is logged in
    parent_id := auth.uid();
    IF parent_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Find valid invitation
    SELECT * INTO invitation_record FROM guardian_invitations 
    WHERE token = token_input AND status = 'active' AND expires_at > NOW();

    IF invitation_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired token');
    END IF;

    -- Prevent self-guardian (optional but good sanity check)
    IF invitation_record.child_id = parent_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot be your own guardian');
    END IF;

    -- Mark invitation as redeemed
    UPDATE guardian_invitations 
    SET status = 'redeemed', redeemed_by = parent_id, updated_at = NOW()
    WHERE id = invitation_record.id;

    -- Link guardian to child profile and set status
    UPDATE profiles 
    SET 
        guardian_id = parent_id,
        guardian_status = 'linked',
        guardian_verified_at = NOW()
    WHERE id = invitation_record.child_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
