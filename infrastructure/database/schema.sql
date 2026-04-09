-- System Roles Seeding
insert into public.system_roles (name, description)
values 
  ('analyst', 'Can view dashboards and metrics but cannot edit data.'),
  ('moderator', 'Can review reports and moderate content.'),
  ('admin', 'Full access to system configuration and user management.')
on conflict (name) do nothing;

-- Helper: has_system_role
create or replace function public.has_system_role(
  user_id uuid, 
  required_role text
) returns boolean as $$
begin
  return exists (
    select 1 
    from public.user_system_roles usr
    join public.system_roles sr on usr.role_id = sr.id
    where usr.user_id = has_system_role.user_id
      and sr.name = required_role
  );
end;
$$ language plpgsql security definer;

-- Role Overrides
create table if not exists public.role_overrides (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  view_as text not null check (view_as in ('job_seeker', 'job_provider')),
  expires_at timestamptz not null,
  reason text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.role_overrides enable row level security;

create policy "Users can view their own override"
  on public.role_overrides for select
  using (auth.uid() = user_id);

create policy "Admins can manage overrides"
  on public.role_overrides for all
  using (
    public.has_system_role(auth.uid(), 'admin')
  );

-- System Roles RLS
alter table public.system_roles enable row level security;
alter table public.user_system_roles enable row level security;

create policy "Authenticated users can read system_roles"
  on public.system_roles for select
  to authenticated
  using (true);

create policy "Admins can manage system_roles"
  on public.system_roles for all
  using (public.has_system_role(auth.uid(), 'admin'));

-- User System Roles RLS
create policy "Staff can view user role assignments"
  on public.user_system_roles for select
  using (
    exists (
      select 1 from public.user_system_roles usr 
      where usr.user_id = auth.uid() 
    )
  );

create policy "Admins can manage user roles"
  on public.user_system_roles for all
  using (public.has_system_role(auth.uid(), 'admin'));

-- Demo Sessions Policies
drop policy if exists "Users can manage their own demo session" on public.demo_sessions;
drop policy if exists "Admins can view all demo sessions" on public.demo_sessions;

alter table public.demo_sessions enable row level security;

create policy "Users can manage their own demo session"
  on public.demo_sessions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins can view all demo sessions"
  on public.demo_sessions for select
  using (public.has_system_role(auth.uid(), 'admin'));
BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_profile_identity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_name text := nullif(trim(coalesce(OLD.full_name, '')), '');
  new_name text := nullif(trim(coalesce(NEW.full_name, '')), '');
  old_city text := nullif(trim(coalesce(OLD.city, '')), '');
  new_city text := nullif(trim(coalesce(NEW.city, '')), '');
BEGIN
  -- Allow cosmetic changes (whitespace only)
  IF new_name IS NOT DISTINCT FROM old_name
     AND new_city IS NOT DISTINCT FROM old_city THEN
    RETURN NEW;
  END IF;

  -- Bypasses for internal roles
  IF auth.role() = 'service_role' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- Block changes if previous value existed
  IF (new_name IS DISTINCT FROM old_name AND old_name IS NOT NULL)
     OR (new_city IS DISTINCT FROM old_city AND old_city IS NOT NULL) THEN
    RAISE EXCEPTION 'Profilname und Stadt/Ort sind fixiert. Bitte Support kontaktieren.'
      USING ERRCODE = 'P0001';
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_lock_full_name ON public.profiles;

CREATE TRIGGER trg_profiles_lock_full_name
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_identity_change();

COMMIT;
BEGIN;

-- Profile should be directly editable from the UI.
DROP TRIGGER IF EXISTS trg_profiles_lock_full_name ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_profile_identity_change();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website text;

COMMIT;
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS interests text;

CREATE OR REPLACE FUNCTION public.prevent_profile_identity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_name text := nullif(trim(coalesce(OLD.full_name, '')), '');
  new_name text := nullif(trim(coalesce(NEW.full_name, '')), '');
  old_city text := nullif(trim(coalesce(OLD.city, '')), '');
  new_city text := nullif(trim(coalesce(NEW.city, '')), '');
BEGIN
  -- Allow cosmetic changes
  IF new_name IS NOT DISTINCT FROM old_name
     AND new_city IS NOT DISTINCT FROM old_city THEN
    RETURN NEW;
  END IF;

  -- Bypass for service role
  IF auth.role() = 'service_role' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- Block changes if previous value existed
  IF (new_name IS DISTINCT FROM old_name AND old_name IS NOT NULL)
     OR (new_city IS DISTINCT FROM old_city AND old_city IS NOT NULL) THEN
    RAISE EXCEPTION 'Profilname und Stadt/Ort sind fixiert. Bitte Support kontaktieren.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_lock_full_name ON public.profiles;

CREATE TRIGGER trg_profiles_lock_full_name
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_identity_change();

COMMIT;
BEGIN;

-- Required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Canonical roles: account_type + provider_kind
-- -----------------------------------------------------------------------------

-- Account Type Enum
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

-- Handle legacy enum conflicts
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

-- Guardian Status Enum
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

-- Provider Verification Enum
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

-- Convert legacy account_type if needed
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
          WHEN lower(coalesce(account_type::text, '')) LIKE '%provider%' THEN 'job_provider'
          WHEN lower(coalesce(account_type::text, '')) LIKE '%seeker%' THEN 'job_seeker'
          WHEN lower(coalesce(user_type, '')) IN ('adult', 'senior', 'company') THEN 'job_provider'
          WHEN lower(coalesce(user_type, '')) = 'youth' THEN 'job_seeker'
          WHEN birthdate IS NOT NULL AND birthdate > (current_date - interval '18 years')::date THEN 'job_seeker'
          WHEN birthdate IS NOT NULL THEN 'job_provider'
          ELSE 'job_seeker'
        END
      )::public.account_type
    $sql$;
  END IF;
END $$;

-- Ensure account_type default
ALTER TABLE public.profiles
  ALTER COLUMN account_type SET DEFAULT 'job_seeker'::public.account_type;

UPDATE public.profiles
SET account_type = 'job_seeker'::public.account_type
WHERE account_type IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN account_type SET NOT NULL;

-- Backfill from legacy user_type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'user_type'
  ) THEN
    UPDATE public.profiles
    SET account_type = 'job_provider'::public.account_type
    WHERE lower(coalesce(user_type, '')) IN ('adult', 'senior', 'company')
      AND (account_type IS NULL OR account_type <> 'job_provider'::public.account_type);

    UPDATE public.profiles
    SET account_type = 'job_seeker'::public.account_type
    WHERE lower(coalesce(user_type, '')) IN ('youth')
      AND (account_type IS NULL OR account_type <> 'job_seeker'::public.account_type);

    UPDATE public.profiles
    SET provider_kind = CASE
      WHEN lower(coalesce(user_type, '')) = 'company' THEN 'company'::public.provider_kind
      WHEN lower(coalesce(user_type, '')) IN ('adult', 'senior') THEN 'private'::public.provider_kind
      ELSE NULL
    END
    WHERE provider_kind IS NULL;

    UPDATE public.profiles
    SET company_name = COALESCE(company_name, NULLIF(trim(city), ''))
    WHERE lower(coalesce(user_type, '')) = 'company' AND company_name IS NULL;
  END IF;
END $$;

-- Normalize guardian status
UPDATE public.profiles
SET guardian_status = 'linked'::public.guardian_status
WHERE guardian_id IS NOT NULL AND guardian_status <> 'linked';

-- Cleanup legacy columns (best effort)
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
-- Auth Sync Trigger
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
-- Guardian verification: invitations + linking
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
BEGIN;

-- Adjust public profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS interests text,
  ADD COLUMN IF NOT EXISTS skills text,
  ADD COLUMN IF NOT EXISTS availability_note text;

-- Drop legacy columns safely
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

-- -----------------------------------------------------------------------------
-- Notifications System
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'message')) DEFAULT 'info',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.has_system_role(auth.uid(), 'admin'));


-- -----------------------------------------------------------------------------
-- Jobs Extensions (2026-02-18)
-- -----------------------------------------------------------------------------

-- Add reach column to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS reach text DEFAULT 'internal_rheinbach';

-- Add check constraint for valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_reach_check'
  ) THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_reach_check CHECK (reach IN ('internal_rheinbach', 'extended'));
  END IF;
END $$;

-- Add updated_at column to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- -----------------------------------------------------------------------------
-- Profile Location Extensions (Distance Tracking)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference text;

UPDATE public.profiles
SET theme_preference = 'system'
WHERE theme_preference IS NULL
   OR theme_preference NOT IN ('light', 'dark', 'system');

ALTER TABLE public.profiles
  ALTER COLUMN theme_preference SET DEFAULT 'system',
  ALTER COLUMN theme_preference SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_theme_preference_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_theme_preference_check
      CHECK (theme_preference IN ('light', 'dark', 'system'));
  END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lat FLOAT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lng FLOAT;
