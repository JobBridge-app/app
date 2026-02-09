-- 005_multiple_guardians.sql

-- 1. Create the many-to-many relationship table
CREATE TABLE IF NOT EXISTS guardian_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    guardian_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active', -- 'active', 'revoked'
    UNIQUE(child_id, guardian_id)
);

-- 2. Enable RLS
ALTER TABLE guardian_relationships ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Guardians can see relationships where they are the guardian
CREATE POLICY "Guardians can view their relationships"
    ON guardian_relationships FOR SELECT
    USING (auth.uid() = guardian_id);

-- Children can see relationships where they are the child
CREATE POLICY "Children can view their guardians"
    ON guardian_relationships FOR SELECT
    USING (auth.uid() = child_id);

-- 4. Migrate existing data from profiles table (if any)
INSERT INTO guardian_relationships (child_id, guardian_id)
SELECT id, guardian_id
FROM profiles
WHERE guardian_id IS NOT NULL
ON CONFLICT (child_id, guardian_id) DO NOTHING;

-- 5. Update redeem_guardian_invitation to use the new table
CREATE OR REPLACE FUNCTION redeem_guardian_invitation(token_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID; 
    existing_profile_id UUID;
    child_profile_id UUID;
    already_linked BOOLEAN;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nicht angemeldet. Bitte melde dich an.');
    END IF;

    -- Find valid invitation
    SELECT * INTO invitation_record FROM guardian_invitations
    WHERE token = token_input AND status = 'active' AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger oder abgelaufener Link.');
    END IF;

    child_profile_id := invitation_record.child_id;

    -- Prevent self-confirmation (Guardian cannot be the child)
    IF current_user_id = child_profile_id THEN
         RETURN jsonb_build_object('success', false, 'error', 'Du kannst dich nicht selbst als Elternteil bestätigen.');
    END IF;

    -- Ensure Guardian Profile Exists
    SELECT id INTO existing_profile_id FROM profiles WHERE id = current_user_id;

    IF existing_profile_id IS NULL THEN
        -- Auto-create minimal Job Provider profile
        INSERT INTO profiles (id, email, full_name, account_type, role)
        VALUES (
            current_user_id,
            (SELECT email FROM auth.users WHERE id = current_user_id),
            'Elternteil', 
            'job_provider',
            'job_provider'
        )
        RETURNING id INTO existing_profile_id;
    END IF;

    -- Check if ALREADY linked via relationships table
    SELECT EXISTS (
        SELECT 1 FROM guardian_relationships 
        WHERE child_id = child_profile_id AND guardian_id = current_user_id
    ) INTO already_linked;

    IF already_linked THEN
         -- Even if already linked, mark invite used
         UPDATE guardian_invitations
         SET status = 'used', used_at = NOW(), used_by = current_user_id
         WHERE id = invitation_record.id;
         
         RETURN jsonb_build_object('success', true, 'message', 'Bereits verknüpft.');
    END IF;

    -- Create Relationship
    INSERT INTO guardian_relationships (child_id, guardian_id)
    VALUES (child_profile_id, current_user_id);

    -- Update Invitation Status
    UPDATE guardian_invitations
    SET status = 'used', used_at = NOW(), used_by = current_user_id
    WHERE id = invitation_record.id;

    -- Update Child Profile Status (at least one guardian confirmed)
    UPDATE profiles
    SET guardian_status = 'linked',
        guardian_verified_at = NOW(),
        guardian_id = current_user_id -- Keep for legacy compatibility/Primary guardian logic
    WHERE id = child_profile_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
