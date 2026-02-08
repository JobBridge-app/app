BEGIN;

-- Public profile fields: keep it safe for minors.
-- We intentionally remove phone/website/headline from public.profiles and replace with:
--   - bio
--   - interests
--   - skills
--   - availability_note

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS interests text,
  ADD COLUMN IF NOT EXISTS skills text,
  ADD COLUMN IF NOT EXISTS availability_note text;

-- Drop legacy public contact + "Kurzprofil".
-- Guard against dependencies (views/policies) so the migration doesn't hard-fail.
DO $$
BEGIN
  -- If those columns exist, wipe data first (safety for minors), even if drop is skipped.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    EXECUTE 'UPDATE public.profiles SET phone = NULL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'website'
  ) THEN
    EXECUTE 'UPDATE public.profiles SET website = NULL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'headline'
  ) THEN
    EXECUTE 'UPDATE public.profiles SET headline = NULL';
  END IF;

  BEGIN
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
  EXCEPTION WHEN dependent_objects_still_exist THEN
    RAISE NOTICE 'Skipping DROP COLUMN public.profiles.phone (dependent objects exist)';
  END;

  BEGIN
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS website;
  EXCEPTION WHEN dependent_objects_still_exist THEN
    RAISE NOTICE 'Skipping DROP COLUMN public.profiles.website (dependent objects exist)';
  END;

  BEGIN
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS headline;
  EXCEPTION WHEN dependent_objects_still_exist THEN
    RAISE NOTICE 'Skipping DROP COLUMN public.profiles.headline (dependent objects exist)';
  END;
END $$;

COMMIT;
