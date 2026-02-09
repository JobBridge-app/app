-- 006_fix_stuck_guardian_status.sql

-- Fixes an issue where adding a second guardian incorrectly set guardian_status to 'pending'
-- resulting in users being blocked from applications even though they have a verified guardian.

-- 1. Update profiles to 'linked' if they have at least one active relationship
UPDATE profiles
SET guardian_status = 'linked'
WHERE id IN (
    SELECT DISTINCT child_id 
    FROM guardian_relationships 
    WHERE status = 'active'
)
AND guardian_status = 'pending';

-- 2. Optional: Ensure guardian_id is populated if missing but relationship exists
-- (This picks the most recent guardian as the primary one for legacy compatibility)
UPDATE profiles p
SET guardian_id = (
    SELECT guardian_id 
    FROM guardian_relationships gr
    WHERE gr.child_id = p.id
    ORDER BY gr.created_at DESC
    LIMIT 1
)
WHERE p.guardian_id IS NULL
AND EXISTS (
    SELECT 1 FROM guardian_relationships gr WHERE gr.child_id = p.id
);
