-- Harden consumer profile and application visibility.
--
-- The consumer application must not inherit staff-wide table visibility. The
-- external administration application uses a server-side service-role boundary
-- instead. Browser clients receive only their own full profile/application rows
-- and narrowly scoped profile summaries through the RPCs below.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS applications_select ON public.applications;
DROP POLICY IF EXISTS applications_select_participants ON public.applications;

CREATE POLICY applications_select_participants
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.jobs job
        WHERE job.id = applications.job_id
          AND job.posted_by = (SELECT auth.uid())
      )
    )
  );

-- RLS and SQL privileges are independent. Remove legacy default privileges
-- such as TRUNCATE, TRIGGER and REFERENCES from consumer roles, then opt in to
-- only the operations used by the application.
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.applications FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.applications TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.profiles TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.applications TO service_role;

-- Close the same legacy default-grant surface on adjacent identity, guardian,
-- private-location and region tables. Existing RLS policies remain unchanged;
-- only SQL privileges are reduced to the operations used by current clients.
REVOKE ALL PRIVILEGES ON TABLE public.system_roles
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.user_system_roles
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.guardian_invitations
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.guardian_relationships
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.job_private_details
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.regions_live
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.system_roles TO authenticated;
GRANT SELECT ON TABLE public.user_system_roles TO authenticated;
GRANT SELECT ON TABLE public.guardian_invitations TO authenticated;
GRANT SELECT ON TABLE public.guardian_relationships TO authenticated;
GRANT SELECT ON TABLE public.regions_live TO anon, authenticated;

GRANT ALL PRIVILEGES ON TABLE public.system_roles TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.user_system_roles TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.guardian_invitations TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.guardian_relationships TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.job_private_details TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.regions_live TO service_role;

-- Staff helpers are server-side authorization primitives. They must not remain
-- arbitrary browser RPCs now that the consumer deployment has no staff area.
REVOKE ALL ON FUNCTION public.has_system_role(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_system_role(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_visible_job_creator_summaries(p_job_ids uuid[])
RETURNS TABLE (
  job_id uuid,
  creator_id uuid,
  full_name text,
  company_name text,
  account_type public.account_type,
  avatar_url text,
  bio text,
  city text,
  country text,
  created_at timestamptz,
  provider_verification_status public.provider_verification_status,
  is_staff boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_requested_count integer := cardinality(COALESCE(p_job_ids, ARRAY[]::uuid[]));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required.';
  END IF;

  IF v_requested_count > 100 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'At most 100 job IDs may be requested.';
  END IF;

  RETURN QUERY
  WITH requested_jobs AS (
    SELECT DISTINCT requested_job_id
    FROM unnest(COALESCE(p_job_ids, ARRAY[]::uuid[])) AS requested(requested_job_id)
    WHERE requested_job_id IS NOT NULL
  )
  SELECT
    job.id,
    profile.id,
    profile.full_name,
    profile.company_name,
    profile.account_type,
    profile.avatar_url,
    profile.bio,
    profile.city,
    profile.country,
    profile.created_at,
    profile.provider_verification_status,
    EXISTS (
      SELECT 1
      FROM public.user_system_roles user_role
      JOIN public.system_roles system_role ON system_role.id = user_role.role_id
      WHERE user_role.user_id = profile.id
        AND system_role.name IN ('admin', 'moderator', 'analyst')
    ) AS is_staff
  FROM requested_jobs requested
  JOIN public.jobs job ON job.id = requested.requested_job_id
  JOIN public.profiles profile ON profile.id = job.posted_by
  WHERE
    job.status IN ('open'::public.job_status, 'reserved'::public.job_status)
    OR job.posted_by = v_user_id
    OR EXISTS (
      SELECT 1
      FROM public.applications application
      WHERE application.job_id = job.id
        AND application.user_id = v_user_id
    )
  ORDER BY job.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_activity_partner_profiles(p_application_ids uuid[])
RETURNS TABLE (
  application_id uuid,
  profile_id uuid,
  full_name text,
  company_name text,
  account_type public.account_type,
  avatar_url text,
  bio text,
  city text,
  country text,
  skills text,
  interests text,
  created_at timestamptz,
  provider_verification_status public.provider_verification_status,
  age_years integer,
  is_staff boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_requested_count integer := cardinality(COALESCE(p_application_ids, ARRAY[]::uuid[]));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required.';
  END IF;

  IF v_requested_count > 100 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'At most 100 application IDs may be requested.';
  END IF;

  RETURN QUERY
  WITH requested_applications AS (
    SELECT DISTINCT requested_application_id
    FROM unnest(COALESCE(p_application_ids, ARRAY[]::uuid[])) AS requested(requested_application_id)
    WHERE requested_application_id IS NOT NULL
  )
  SELECT
    application.id,
    partner.id,
    partner.full_name,
    partner.company_name,
    partner.account_type,
    partner.avatar_url,
    partner.bio,
    partner.city,
    partner.country,
    partner.skills,
    partner.interests,
    partner.created_at,
    partner.provider_verification_status,
    CASE
      WHEN partner.birthdate IS NULL OR partner.birthdate > CURRENT_DATE THEN NULL
      ELSE EXTRACT(YEAR FROM age(CURRENT_DATE, partner.birthdate))::integer
    END AS age_years,
    EXISTS (
      SELECT 1
      FROM public.user_system_roles user_role
      JOIN public.system_roles system_role ON system_role.id = user_role.role_id
      WHERE user_role.user_id = partner.id
        AND system_role.name IN ('admin', 'moderator', 'analyst')
    ) AS is_staff
  FROM requested_applications requested
  JOIN public.applications application ON application.id = requested.requested_application_id
  JOIN public.jobs job ON job.id = application.job_id
  JOIN public.profiles partner
    ON partner.id = CASE
      WHEN application.user_id = v_user_id THEN job.posted_by
      ELSE application.user_id
    END
  WHERE application.user_id = v_user_id
     OR job.posted_by = v_user_id
  ORDER BY application.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_visible_job_creator_summaries(uuid[])
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_activity_partner_profiles(uuid[])
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_visible_job_creator_summaries(uuid[])
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_activity_partner_profiles(uuid[])
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_visible_job_creator_summaries(uuid[]) IS
  'Minimal creator profiles for requested jobs already visible to the authenticated caller.';
COMMENT ON FUNCTION public.get_activity_partner_profiles(uuid[]) IS
  'Minimal counterpart profiles for requested applications shared with the authenticated caller.';
