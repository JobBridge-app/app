-- 007_add_application_message.sql

-- Add 'message' column to 'applications' table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'applications'
        AND column_name = 'message'
    ) THEN
        ALTER TABLE applications ADD COLUMN message TEXT;
    END IF;

    -- Also for demo_applications if used
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'demo_applications'
        AND column_name = 'message'
    ) THEN
        ALTER TABLE demo_applications ADD COLUMN message TEXT;
    END IF;
END $$;
