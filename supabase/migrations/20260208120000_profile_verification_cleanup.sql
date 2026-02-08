BEGIN;

-- Required for digest()/gen_random_bytes() used in guardian invite tokens.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Canonical roles: account_type + provider_kind (drop legacy user_type)
-- -----------------------------------------------------------------------------

-- Base account type (job_seeker/job_provider).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'account_type'
  ) THEN
    CREATE TYPE public.account_type AS ENUM ('job_seeker', 'job_provider');
  END IF;
END $$;

-- Some environments already have an `account_type` enum with different labels.
-- If so, rename it to a legacy name and recreate the canonical enum.
DO $$
DECLARE
  has_job_seeker boolean;
  has_job_provider boolean;
  legacy_name text := 'account_type_legacy';
  i int := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'account_type' AND e.enumlabel = 'job_seeker'
  ) INTO has_job_seeker;

  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'account_type' AND e.enumlabel = 'job_provider'
  ) INTO has_job_provider;

  IF NOT (has_job_seeker AND has_job_provider) THEN
    -- Pick a unique legacy enum name.
    WHILE EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = legacy_name
    ) LOOP
      i := i + 1;
      legacy_name := format('account_type_legacy_%s', i);
    END LOOP;

    EXECUTE format('ALTER TYPE public.account_type RENAME TO %I', legacy_name);
    EXECUTE 'CREATE TYPE public.account_type AS ENUM (''job_seeker'', ''job_provider'')';
  END IF;
END $$;

-- Guardian linking state for minor accounts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'guardian_status'
  ) THEN
    CREATE TYPE public.guardian_status AS ENUM ('none', 'pending', 'linked');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'provider_kind'
  ) THEN
    CREATE TYPE public.provider_kind AS ENUM ('private', 'company');
  END IF;
END $$;

-- Provider verification state (manual today, can be automated later).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'provider_verification_status'
  ) THEN
    CREATE TYPE public.provider_verification_status AS ENUM ('none', 'pending', 'verified', 'rejected');
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type public.account_type NOT NULL DEFAULT 'job_seeker'::public.account_type,
  ADD COLUMN IF NOT EXISTS guardian_status public.guardian_status NOT NULL DEFAULT 'none'::public.guardian_status,
  ADD COLUMN IF NOT EXISTS guardian_id uuid,
  ADD COLUMN IF NOT EXISTS provider_kind public.provider_kind,
  ADD COLUMN IF NOT EXISTS guardian_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_verification_status public.provider_verification_status NOT NULL DEFAULT 'none'::public.provider_verification_status,
  ADD COLUMN IF NOT EXISTS provider_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_contact_email text,
  ADD COLUMN IF NOT EXISTS company_message text;

-- If `profiles.account_type` still uses a legacy enum type, convert it.
DO $$
DECLARE
  udt text;
BEGIN
  SELECT udt_name INTO udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'account_type';

  IF udt IS NOT NULL AND udt <> 'account_type' THEN
    EXECUTE $sql$
      ALTER TABLE public.profiles
      ALTER COLUMN account_type
      TYPE public.account_type
      USING (
        CASE
          -- Prefer legacy account_type label patterns if present
          WHEN lower(coalesce(account_type::text, '')) LIKE '%provider%' THEN 'job_provider'
          WHEN lower(coalesce(account_type::text, '')) LIKE '%seeker%' THEN 'job_seeker'
          -- Fallback to legacy user_type if present
          WHEN lower(coalesce(user_type, '')) IN ('adult', 'senior', 'company') THEN 'job_provider'
          WHEN lower(coalesce(user_type, '')) = 'youth' THEN 'job_seeker'
          -- Fallback to age
          WHEN birthdate IS NOT NULL AND birthdate > (current_date - interval '18 years')::date THEN 'job_seeker'
          WHEN birthdate IS NOT NULL THEN 'job_provider'
          ELSE 'job_seeker'
        END
      )::public.account_type
    $sql$;
  END IF;
END $$;

-- Ensure account_type exists and is set.
-- If your DB already has a different enum name, adapt here.
ALTER TABLE public.profiles
  ALTER COLUMN account_type SET DEFAULT 'job_seeker'::public.account_type;

UPDATE public.profiles
SET account_type = 'job_seeker'::public.account_type
WHERE account_type IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN account_type SET NOT NULL;

-- Backfill account_type/provider_kind from legacy user_type (if present).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'user_type'
  ) THEN
    -- account_type: youth -> job_seeker, adult/company -> job_provider
    UPDATE public.profiles
    SET account_type = 'job_provider'::public.account_type
    WHERE lower(coalesce(user_type, '')) IN ('adult', 'senior', 'company')
      AND (account_type IS NULL OR account_type <> 'job_provider'::public.account_type);

    UPDATE public.profiles
    SET account_type = 'job_seeker'::public.account_type
    WHERE lower(coalesce(user_type, '')) IN ('youth')
      AND (account_type IS NULL OR account_type <> 'job_seeker'::public.account_type);

    -- provider_kind for providers
    UPDATE public.profiles
    SET provider_kind = CASE
      WHEN lower(coalesce(user_type, '')) = 'company' THEN 'company'::public.provider_kind
      WHEN lower(coalesce(user_type, '')) IN ('adult', 'senior') THEN 'private'::public.provider_kind
      ELSE NULL
    END
    WHERE provider_kind IS NULL;

    -- company_name: if the old system stored company name in city, keep a best-effort copy.
    UPDATE public.profiles
    SET company_name = COALESCE(company_name, NULLIF(trim(city), ''))
    WHERE lower(coalesce(user_type, '')) = 'company' AND company_name IS NULL;
  END IF;
END $$;

-- If guardian_id is already present, normalize guardian_status.
UPDATE public.profiles
SET guardian_status = 'linked'::public.guardian_status
WHERE guardian_id IS NOT NULL AND guardian_status <> 'linked';

-- Optional: enforce provider_kind consistency (can be enabled once data is clean).
-- ALTER TABLE public.profiles
--   ADD CONSTRAINT profiles_provider_kind_consistency
--   CHECK (
--     (account_type = 'job_seeker' AND provider_kind IS NULL)
--     OR
--     (account_type = 'job_provider' AND provider_kind IS NOT NULL)
--   );

-- Drop legacy columns that caused confusion.
-- Best-effort so the migration doesn't fail if a policy/view still references them.
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_type;
  EXCEPTION WHEN dependent_objects_still_exist THEN
    RAISE NOTICE 'Skipping DROP COLUMN public.profiles.user_type (dependent objects exist)';
  END;

  BEGIN
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_verified;
  EXCEPTION WHEN dependent_objects_still_exist THEN
    RAISE NOTICE 'Skipping DROP COLUMN public.profiles.is_verified (dependent objects exist)';
  END;

  BEGIN
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS state;
  EXCEPTION WHEN dependent_objects_still_exist THEN
    RAISE NOTICE 'Skipping DROP COLUMN public.profiles.state (dependent objects exist)';
  END;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Sync auth email/phone verification into profiles
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS email text;

CREATE OR REPLACE FUNCTION public.sync_profile_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, email_verified_at, phone_verified_at)
  VALUES (NEW.id, NEW.email, NEW.email_confirmed_at, NEW.phone_confirmed_at)
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email),
        email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.profiles.email_verified_at),
        phone_verified_at = COALESCE(EXCLUDED.phone_verified_at, public.profiles.phone_verified_at),
        updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_from_auth_user ON auth.users;
CREATE TRIGGER trg_sync_profile_from_auth_user
AFTER INSERT OR UPDATE OF email, email_confirmed_at, phone_confirmed_at
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_from_auth_user();

-- Backfill existing rows once (safe to re-run).
UPDATE public.profiles p
SET
  email = COALESCE(p.email, u.email),
  email_verified_at = COALESCE(p.email_verified_at, u.email_confirmed_at),
  phone_verified_at = COALESCE(p.phone_verified_at, u.phone_confirmed_at)
FROM auth.users u
WHERE u.id = p.id;

-- -----------------------------------------------------------------------------
-- 3) Guardian verification (minor accounts): invitations + linking
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.guardian_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('active', 'redeemed', 'expired', 'revoked')) DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  redeemed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardian_invitations_child_id ON public.guardian_invitations(child_id);
CREATE INDEX IF NOT EXISTS idx_guardian_invitations_status_expires ON public.guardian_invitations(status, expires_at);

ALTER TABLE public.guardian_invitations ENABLE ROW LEVEL SECURITY;

-- Child can read their own invitations.
DROP POLICY IF EXISTS "guardian_invitations_select_own" ON public.guardian_invitations;
CREATE POLICY "guardian_invitations_select_own" ON public.guardian_invitations
  FOR SELECT TO authenticated
  USING (child_id = auth.uid());

-- No direct insert/update/delete from clients; use SECURITY DEFINER RPCs.

CREATE OR REPLACE FUNCTION public.create_guardian_invitation(p_invited_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child_id uuid := auth.uid();
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz := NOW() + INTERVAL '7 days';
BEGIN
  IF v_child_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Best effort: revoke previous active links.
  UPDATE public.guardian_invitations
  SET status = 'revoked', updated_at = NOW()
  WHERE child_id = v_child_id AND status = 'active';

  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.guardian_invitations (child_id, token_hash, status, expires_at)
  VALUES (v_child_id, v_token_hash, 'active', v_expires_at);

  -- Mark profile as pending if not linked yet.
  UPDATE public.profiles
  SET guardian_status = 'pending', updated_at = NOW()
  WHERE id = v_child_id AND guardian_status <> 'linked';

  RETURN jsonb_build_object(
    'token', v_token,
    'expires_at', v_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_guardian_invitation(token_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guardian_id uuid := auth.uid();
  v_hash text;
  invitation_record RECORD;
BEGIN
  IF v_guardian_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_hash := encode(digest(token_input, 'sha256'), 'hex');

  SELECT * INTO invitation_record
  FROM public.guardian_invitations
  WHERE token_hash = v_hash
    AND status = 'active'
    AND expires_at > NOW()
  LIMIT 1;

  IF invitation_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

  UPDATE public.guardian_invitations
  SET status = 'redeemed', redeemed_by = v_guardian_id, updated_at = NOW()
  WHERE id = invitation_record.id;

  UPDATE public.profiles
  SET guardian_id = v_guardian_id,
      guardian_status = 'linked',
      guardian_verified_at = NOW(),
      updated_at = NOW()
  WHERE id = invitation_record.child_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;
