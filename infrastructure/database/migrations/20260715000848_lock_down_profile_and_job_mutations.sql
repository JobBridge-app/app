
-- Legacy admin activity is unused and contains obsolete /admin/... links.
-- Role and system-role tables remain untouched.
DROP VIEW IF EXISTS public.admin_recent_activity;

-- Keep authoritative identity and onboarding fields behind validated RPCs.
-- Authenticated users may only maintain presentation, location and preference
-- fields on their own profile after this migration.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM anon, authenticated;
GRANT UPDATE (
  bio,
  availability_note,
  skills,
  interests,
  city,
  street,
  house_number,
  zip,
  lat,
  lng,
  theme_preference,
  mobile_nav_preference
) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND (
      birthdate IS NULL
      OR (
        nullif(btrim(full_name), '') IS NOT NULL
        AND nullif(btrim(city), '') IS NOT NULL
      )
    )
  );

CREATE OR REPLACE FUNCTION public.complete_profile_onboarding(
  p_full_name text,
  p_birthdate date,
  p_city text,
  p_market_id uuid,
  p_account_type public.account_type,
  p_provider_kind public.provider_kind,
  p_company_name text,
  p_company_contact_email text,
  p_company_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_full_name text := nullif(btrim(p_full_name), '');
  v_city text := nullif(btrim(p_city), '');
  v_company_name text := nullif(btrim(p_company_name), '');
  v_company_contact_email text := nullif(lower(btrim(p_company_contact_email)), '');
  v_company_message text := nullif(btrim(p_company_message), '');
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF v_full_name IS NULL
     OR char_length(v_full_name) < 2
     OR char_length(v_full_name) > 120 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_full_name');
  END IF;
  IF v_city IS NULL OR char_length(v_city) < 2 OR char_length(v_city) > 120 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_city');
  END IF;
  IF p_birthdate IS NULL
     OR p_birthdate > current_date
     OR p_birthdate < (current_date - interval '120 years')::date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_birthdate');
  END IF;
  IF p_account_type IS NULL
     OR p_account_type NOT IN (
       'job_seeker'::public.account_type,
       'job_provider'::public.account_type
     ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_account_type');
  END IF;
  IF p_market_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.regions_live region
       WHERE region.id = p_market_id
         AND region.is_live IS TRUE
     ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_market');
  END IF;

  IF p_account_type = 'job_seeker'::public.account_type
     AND (
       p_birthdate > (current_date - interval '14 years')::date
       OR p_birthdate <= (current_date - interval '21 years')::date
     ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'seeker_age_out_of_range');
  END IF;
  IF p_account_type = 'job_provider'::public.account_type
     AND p_birthdate > (current_date - interval '18 years')::date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'provider_must_be_adult');
  END IF;
  IF p_account_type = 'job_provider'::public.account_type
     AND p_provider_kind IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'provider_kind_required');
  END IF;
  IF p_account_type = 'job_seeker'::public.account_type
     AND p_provider_kind IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_provider_kind');
  END IF;

  IF p_provider_kind = 'company'::public.provider_kind
     AND (v_company_name IS NULL OR char_length(v_company_name) > 160) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'company_name_required');
  END IF;
  IF v_company_contact_email IS NOT NULL
     AND (
       char_length(v_company_contact_email) > 254
       OR v_company_contact_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
     ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_company_email');
  END IF;
  IF v_company_message IS NOT NULL AND char_length(v_company_message) > 2000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'company_message_too_long');
  END IF;

  -- birthdate is not directly writable and therefore acts as an irreversible,
  -- race-safe onboarding sentinel. A completed profile cannot be reopened.
  INSERT INTO public.profiles AS target (
    id,
    full_name,
    birthdate,
    city,
    market_id,
    account_type,
    provider_kind,
    company_name,
    company_contact_email,
    company_message,
    provider_verification_status,
    provider_verified_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_full_name,
    p_birthdate,
    v_city,
    p_market_id,
    p_account_type,
    CASE
      WHEN p_account_type = 'job_provider'::public.account_type THEN p_provider_kind
      ELSE NULL
    END,
    CASE WHEN p_provider_kind = 'company'::public.provider_kind THEN v_company_name ELSE NULL END,
    CASE WHEN p_provider_kind = 'company'::public.provider_kind THEN v_company_contact_email ELSE NULL END,
    CASE WHEN p_provider_kind = 'company'::public.provider_kind THEN v_company_message ELSE NULL END,
    'none'::public.provider_verification_status,
    NULL,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      birthdate = EXCLUDED.birthdate,
      city = EXCLUDED.city,
      market_id = EXCLUDED.market_id,
      account_type = EXCLUDED.account_type,
      provider_kind = EXCLUDED.provider_kind,
      company_name = EXCLUDED.company_name,
      company_contact_email = EXCLUDED.company_contact_email,
      company_message = EXCLUDED.company_message,
      provider_verification_status = 'none'::public.provider_verification_status,
      provider_verified_at = NULL,
      updated_at = now()
  WHERE target.birthdate IS NULL
  RETURNING target.* INTO v_profile;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_already_complete');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_provider_verification(
  p_street text,
  p_house_number text,
  p_city text,
  p_zip text,
  p_lat numeric,
  p_lng numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_street text := nullif(btrim(p_street), '');
  v_house_number text := nullif(btrim(p_house_number), '');
  v_city text := nullif(btrim(p_city), '');
  v_zip text := nullif(btrim(p_zip), '');
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF v_street IS NULL OR char_length(v_street) > 160
     OR v_house_number IS NULL OR char_length(v_house_number) > 24
     OR v_city IS NULL OR char_length(v_city) < 2 OR char_length(v_city) > 120
     OR v_zip IS NULL OR char_length(v_zip) > 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_address');
  END IF;
  IF p_lat IS NULL
     OR p_lat::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_lat < -90
     OR p_lat > 90
     OR p_lng IS NULL
     OR p_lng::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_lng < -180
     OR p_lng > 180 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_coordinates');
  END IF;

  SELECT profile.*
  INTO v_profile
  FROM public.profiles profile
  WHERE profile.id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_profile.account_type <> 'job_provider'::public.account_type THEN
    RETURN jsonb_build_object('ok', false, 'error', 'provider_required');
  END IF;
  IF v_profile.birthdate IS NULL
     OR v_profile.birthdate > (current_date - interval '18 years')::date
     OR nullif(btrim(v_profile.full_name), '') IS NULL
     OR nullif(btrim(v_profile.city), '') IS NULL
     OR v_profile.provider_kind IS NULL
     OR (
       v_profile.provider_kind = 'company'::public.provider_kind
       AND nullif(btrim(v_profile.company_name), '') IS NULL
     ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'incomplete_provider_profile');
  END IF;

  IF v_profile.provider_verification_status IN (
       'pending'::public.provider_verification_status,
       'verified'::public.provider_verification_status
     )
     AND v_profile.street IS NOT DISTINCT FROM v_street
     AND v_profile.house_number IS NOT DISTINCT FROM v_house_number
     AND v_profile.city IS NOT DISTINCT FROM v_city
     AND v_profile.zip IS NOT DISTINCT FROM v_zip
     AND v_profile.lat IS NOT DISTINCT FROM p_lat::double precision
     AND v_profile.lng IS NOT DISTINCT FROM p_lng::double precision THEN
    RETURN jsonb_build_object(
      'ok', true,
      'unchanged', true,
      'status', v_profile.provider_verification_status::text
    );
  END IF;

  UPDATE public.profiles
  SET street = v_street,
      house_number = v_house_number,
      city = v_city,
      zip = v_zip,
      lat = p_lat::double precision,
      lng = p_lng::double precision,
      provider_verification_status = 'pending'::public.provider_verification_status,
      provider_verified_at = NULL,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'status', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.invalidate_provider_verification_on_address_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.account_type = 'job_provider'::public.account_type
     AND (
       OLD.provider_verification_status = 'verified'::public.provider_verification_status
       OR OLD.provider_verified_at IS NOT NULL
     )
     AND (
       OLD.street IS DISTINCT FROM NEW.street
       OR OLD.house_number IS DISTINCT FROM NEW.house_number
       OR OLD.city IS DISTINCT FROM NEW.city
       OR OLD.zip IS DISTINCT FROM NEW.zip
       OR OLD.country IS DISTINCT FROM NEW.country
       OR OLD.lat IS DISTINCT FROM NEW.lat
       OR OLD.lng IS DISTINCT FROM NEW.lng
     ) THEN
    NEW.provider_verification_status := 'pending'::public.provider_verification_status;
    NEW.provider_verified_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invalidate_provider_verification_on_address_change ON public.profiles;
CREATE TRIGGER invalidate_provider_verification_on_address_change
BEFORE UPDATE OF street, house_number, city, zip, country, lat, lng ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.invalidate_provider_verification_on_address_change();

-- Active guardian relationships are only valid for a complete private adult
-- provider and a seeker account. This also protects service-side writes.
CREATE OR REPLACE FUNCTION public.enforce_eligible_guardian_relationship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.status := COALESCE(NEW.status, 'active');

  IF NEW.status = 'active' THEN
    IF NEW.child_id IS NULL
       OR NEW.guardian_id IS NULL
       OR NEW.child_id = NEW.guardian_id THEN
      RAISE EXCEPTION 'An active guardian relationship requires two distinct profiles.'
        USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles guardian
      WHERE guardian.id = NEW.guardian_id
        AND guardian.account_type = 'job_provider'::public.account_type
        AND guardian.provider_kind = 'private'::public.provider_kind
        AND guardian.birthdate IS NOT NULL
        AND guardian.birthdate <= (current_date - interval '18 years')::date
        AND guardian.birthdate >= (current_date - interval '120 years')::date
        AND nullif(btrim(guardian.full_name), '') IS NOT NULL
        AND nullif(btrim(guardian.city), '') IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'The guardian must be a complete private adult provider profile.'
        USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles child_profile
      WHERE child_profile.id = NEW.child_id
        AND child_profile.account_type = 'job_seeker'::public.account_type
    ) THEN
      RAISE EXCEPTION 'The linked child must have a seeker profile.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_eligible_guardian_relationship ON public.guardian_relationships;
CREATE TRIGGER enforce_eligible_guardian_relationship
BEFORE INSERT OR UPDATE OF child_id, guardian_id, status ON public.guardian_relationships
FOR EACH ROW
EXECUTE FUNCTION public.enforce_eligible_guardian_relationship();

-- Do not allow a later profile mutation to make an active guardian invalid.
CREATE OR REPLACE FUNCTION public.protect_active_guardian_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
       SELECT 1
       FROM public.guardian_relationships relationship
       WHERE relationship.guardian_id = OLD.id
         AND COALESCE(relationship.status, 'active') = 'active'
     )
     AND NOT COALESCE((
       NEW.account_type = 'job_provider'::public.account_type
       AND NEW.provider_kind = 'private'::public.provider_kind
       AND NEW.birthdate IS NOT NULL
       AND NEW.birthdate <= (current_date - interval '18 years')::date
       AND NEW.birthdate >= (current_date - interval '120 years')::date
       AND nullif(btrim(NEW.full_name), '') IS NOT NULL
       AND nullif(btrim(NEW.city), '') IS NOT NULL
     ), false) THEN
    RAISE EXCEPTION 'An active guardian profile must remain a complete private adult provider.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_active_guardian_eligibility ON public.profiles;
CREATE TRIGGER protect_active_guardian_eligibility
BEFORE UPDATE OF account_type, provider_kind, birthdate, full_name, city ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_active_guardian_eligibility();

CREATE OR REPLACE FUNCTION public.redeem_guardian_invitation(token_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_guardian_id uuid := auth.uid();
  v_token text := nullif(btrim(token_input), '');
  v_invitation public.guardian_invitations%ROWTYPE;
  v_guardian public.profiles%ROWTYPE;
  v_child public.profiles%ROWTYPE;
  v_already_linked boolean := false;
  v_already_redeemed boolean := false;
BEGIN
  IF v_guardian_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF v_token IS NULL OR char_length(v_token) > 512 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_or_expired_invitation');
  END IF;

  SELECT invitation.*
  INTO v_invitation
  FROM public.guardian_invitations invitation
  WHERE invitation.token = v_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_or_expired_invitation');
  END IF;

  IF v_invitation.status = 'redeemed' AND v_invitation.redeemed_by = v_guardian_id THEN
    v_already_redeemed := true;
  ELSIF v_invitation.status <> 'active' OR v_invitation.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_or_expired_invitation');
  END IF;

  IF v_guardian_id = v_invitation.child_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_link_not_allowed');
  END IF;

  SELECT profile.*
  INTO v_guardian
  FROM public.profiles profile
  WHERE profile.id = v_guardian_id;

  IF NOT FOUND
     OR v_guardian.account_type <> 'job_provider'::public.account_type
     OR v_guardian.provider_kind <> 'private'::public.provider_kind
     OR v_guardian.birthdate IS NULL
     OR v_guardian.birthdate > (current_date - interval '18 years')::date
     OR v_guardian.birthdate < (current_date - interval '120 years')::date
     OR nullif(btrim(v_guardian.full_name), '') IS NULL
     OR nullif(btrim(v_guardian.city), '') IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'guardian_profile_ineligible'
    );
  END IF;

  SELECT profile.*
  INTO v_child
  FROM public.profiles profile
  WHERE profile.id = v_invitation.child_id
  FOR UPDATE;

  IF NOT FOUND OR v_child.account_type <> 'job_seeker'::public.account_type THEN
    RETURN jsonb_build_object('success', false, 'error', 'child_profile_unavailable');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.guardian_relationships relationship
    WHERE relationship.child_id = v_invitation.child_id
      AND relationship.guardian_id = v_guardian_id
      AND COALESCE(relationship.status, 'active') = 'active'
  ) INTO v_already_linked;

  INSERT INTO public.guardian_relationships (child_id, guardian_id, status)
  VALUES (v_invitation.child_id, v_guardian_id, 'active')
  ON CONFLICT (child_id, guardian_id) DO UPDATE
  SET status = 'active';

  IF NOT v_already_redeemed THEN
    UPDATE public.guardian_invitations
    SET status = 'redeemed',
        used_at = now(),
        redeemed_by = v_guardian_id,
        updated_at = now()
    WHERE id = v_invitation.id;
  END IF;

  UPDATE public.profiles
  SET guardian_status = 'linked'::public.guardian_status,
      guardian_verified_at = COALESCE(guardian_verified_at, now()),
      guardian_id = COALESCE(guardian_id, v_guardian_id),
      updated_at = now()
  WHERE id = v_invitation.child_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE
      WHEN v_already_linked OR v_already_redeemed THEN 'already_linked'
      ELSE 'guardian_linked'
    END,
    'requires_basis_consent', v_invitation.purpose = 'basis_account_link',
    'purpose', v_invitation.purpose
  );
END;
$$;

-- Direct guardian mutations are removed; relationship and invitation changes
-- go through validated SECURITY DEFINER workflows.
REVOKE ALL ON TABLE public.guardian_invitations FROM anon, authenticated;
REVOKE ALL ON TABLE public.guardian_relationships FROM anon, authenticated;
GRANT SELECT ON TABLE public.guardian_invitations TO authenticated;
GRANT SELECT ON TABLE public.guardian_relationships TO authenticated;

DROP POLICY IF EXISTS "Child can create invitations" ON public.guardian_invitations;
DROP POLICY IF EXISTS "Child can view own invitations" ON public.guardian_invitations;
CREATE POLICY guardian_invitations_select_own
  ON public.guardian_invitations
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = child_id);

DROP POLICY IF EXISTS guardian_relationships_select ON public.guardian_relationships;
CREATE POLICY guardian_relationships_select
  ON public.guardian_relationships
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = child_id
    OR (SELECT auth.uid()) = guardian_id
  );

-- Existing invitation helpers use only fully qualified relations. Pin their
-- search paths and expose them only to the roles that need each workflow.
ALTER FUNCTION public.create_guardian_invitation(text) SET search_path = '';
ALTER FUNCTION public.get_guardian_invitation_info(text) SET search_path = '';

-- Enforce provider verification for every future job insert, including writes
-- that bypass create_job_v2. Historical jobs and provider profiles are untouched.
CREATE OR REPLACE FUNCTION public.enforce_verified_provider_job_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.posted_by IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.profiles provider
       WHERE provider.id = NEW.posted_by
         AND provider.account_type = 'job_provider'::public.account_type
         AND provider.provider_verification_status = 'verified'::public.provider_verification_status
         AND provider.provider_verified_at IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Jobs can only be created by a verified provider.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_verified_provider_job_insert ON public.jobs;
CREATE TRIGGER enforce_verified_provider_job_insert
BEFORE INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_verified_provider_job_insert();

-- All job edits use one optimistic, transactionally validated mutation path.
REVOKE UPDATE ON TABLE public.jobs FROM anon, authenticated;
DROP POLICY IF EXISTS jobs_update ON public.jobs;

CREATE OR REPLACE FUNCTION public.update_owned_job_details(
  p_job_id uuid,
  p_expected_status public.job_status,
  p_title text,
  p_description text,
  p_wage_hourly numeric,
  p_category text,
  p_payment_type text,
  p_reach text,
  p_status public.job_status,
  p_job_kind text,
  p_recurrence_rule text,
  p_continuity_preferred boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_title text := nullif(btrim(p_title), '');
  v_description text := nullif(btrim(p_description), '');
  v_category text := nullif(btrim(p_category), '');
  v_payment_type text := nullif(btrim(p_payment_type), '');
  v_reach text := nullif(btrim(p_reach), '');
  v_job_kind text := nullif(btrim(p_job_kind), '');
  v_recurrence_rule text := nullif(btrim(p_recurrence_rule), '');
  v_continuity_preferred boolean;
  v_details_changed boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF p_job_id IS NULL OR p_expected_status IS NULL OR p_status IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_job_state');
  END IF;
  IF v_title IS NULL OR char_length(v_title) < 5 OR char_length(v_title) > 120 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_title');
  END IF;
  IF v_description IS NULL
     OR char_length(v_description) < 10
     OR char_length(v_description) > 5000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_description');
  END IF;
  IF p_wage_hourly IS NULL OR p_wage_hourly <= 0 OR p_wage_hourly > 100000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_compensation');
  END IF;
  IF v_category IS NULL OR v_category NOT IN (
    'garden', 'household', 'babysitting', 'tutoring', 'it_help',
    'moving', 'pets', 'shopping', 'other'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_category');
  END IF;
  IF v_payment_type IS NULL OR v_payment_type NOT IN ('hourly', 'fixed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_payment_type');
  END IF;
  IF v_reach IS NULL OR v_reach NOT IN ('internal_rheinbach', 'extended') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_reach');
  END IF;
  IF v_job_kind IS NULL OR v_job_kind NOT IN ('one_time', 'recurring') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_job_kind');
  END IF;
  IF p_continuity_preferred IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_continuity_preference');
  END IF;
  IF v_job_kind = 'recurring'
     AND (
       v_recurrence_rule IS NULL
       OR v_recurrence_rule NOT IN ('weekly', 'biweekly', 'monthly', 'flexible')
     ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_recurrence');
  END IF;
  IF v_job_kind = 'one_time' AND v_recurrence_rule IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_recurrence');
  END IF;

  v_recurrence_rule := CASE
    WHEN v_job_kind = 'recurring' THEN v_recurrence_rule
    ELSE NULL
  END;
  v_continuity_preferred := v_job_kind = 'recurring' AND p_continuity_preferred;

  SELECT job.*
  INTO v_job
  FROM public.jobs job
  WHERE job.id = p_job_id
  FOR UPDATE;

  IF NOT FOUND OR v_job.posted_by <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;
  IF v_job.status IS DISTINCT FROM p_expected_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status_changed');
  END IF;

  v_details_changed :=
    v_job.title IS DISTINCT FROM v_title
    OR v_job.description IS DISTINCT FROM v_description
    OR v_job.wage_hourly IS DISTINCT FROM p_wage_hourly
    OR v_job.category IS DISTINCT FROM v_category
    OR v_job.payment_type IS DISTINCT FROM v_payment_type
    OR v_job.reach IS DISTINCT FROM v_reach
    OR v_job.job_kind IS DISTINCT FROM v_job_kind
    OR v_job.recurrence_rule IS DISTINCT FROM v_recurrence_rule
    OR v_job.continuity_preferred IS DISTINCT FROM v_continuity_preferred
    OR v_job.status IS DISTINCT FROM p_status;

  IF v_job.status IN (
       'reviewing'::public.job_status,
       'reserved'::public.job_status,
       'filled'::public.job_status
     )
     OR v_job.completed_at IS NOT NULL
     OR (
       v_job.status = 'closed'::public.job_status
       AND v_job.filled_by IS NOT NULL
     ) THEN
    IF v_details_changed THEN
      RETURN jsonb_build_object('ok', false, 'error', 'workflow_details_locked');
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'unchanged', true,
      'job_id', p_job_id,
      'status', v_job.status
    );
  END IF;

  IF v_job.status = 'draft'::public.job_status
     AND p_status NOT IN (
       'draft'::public.job_status,
       'open'::public.job_status,
       'closed'::public.job_status
     ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status_transition');
  END IF;
  IF v_job.status = 'open'::public.job_status
     AND p_status NOT IN ('open'::public.job_status, 'closed'::public.job_status) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status_transition');
  END IF;
  IF v_job.status = 'closed'::public.job_status
     AND p_status NOT IN ('closed'::public.job_status, 'open'::public.job_status) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status_transition');
  END IF;

  UPDATE public.jobs
  SET title = v_title,
      description = v_description,
      wage_hourly = p_wage_hourly,
      category = v_category,
      payment_type = v_payment_type,
      status = p_status,
      reach = v_reach,
      job_kind = v_job_kind,
      recurrence_rule = v_recurrence_rule,
      continuity_preferred = v_continuity_preferred,
      updated_at = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object('ok', true, 'job_id', p_job_id, 'status', p_status);
END;
$$;

-- Private job details are never exposed through direct browser table access.
-- The RPC returns exactly one authorized participant's location payload.
REVOKE ALL ON TABLE public.job_private_details FROM anon, authenticated;
DROP POLICY IF EXISTS jpd_owner_delete ON public.job_private_details;
DROP POLICY IF EXISTS jpd_owner_insert ON public.job_private_details;
DROP POLICY IF EXISTS jpd_owner_update ON public.job_private_details;
DROP POLICY IF EXISTS jpd_select ON public.job_private_details;

CREATE OR REPLACE FUNCTION public.get_authorized_job_location(p_job_id uuid)
RETURNS TABLE (
  address_full text,
  private_lat numeric,
  private_lng numeric,
  notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT details.address_full,
         details.private_lat::numeric,
         details.private_lng::numeric,
         details.notes
  FROM public.job_private_details details
  JOIN public.jobs job ON job.id = details.job_id
  WHERE job.id = p_job_id
    AND auth.uid() IS NOT NULL
    AND (
      job.posted_by = auth.uid()
      OR (
        job.status IN (
          'reserved'::public.job_status,
          'filled'::public.job_status,
          'closed'::public.job_status
        )
        AND (
          EXISTS (
            SELECT 1
            FROM public.applications application
            WHERE application.job_id = job.id
              AND application.user_id = auth.uid()
              AND application.status IN (
                'accepted'::public.application_status,
                'completed'::public.application_status
              )
          )
          OR EXISTS (
            SELECT 1
            FROM public.job_engagements engagement
            WHERE engagement.job_id = job.id
              AND engagement.seeker_id = auth.uid()
              AND engagement.status IN ('active', 'completed')
          )
        )
      )
    );
$$;

-- Security events remain service-write-only; users can only read their own
-- recent events through a bounded projection that does not expose user_id.
REVOKE ALL ON TABLE public.security_events FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.get_my_security_events(integer);
CREATE FUNCTION public.get_my_security_events(p_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  event_type text,
  ip_address inet,
  user_agent text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT event.id,
         event.event_type,
         event.ip_address,
         event.user_agent,
         event.created_at
  FROM public.security_events event
  WHERE auth.uid() IS NOT NULL
    AND event.user_id = auth.uid()
  ORDER BY event.created_at DESC, event.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
$$;

-- Existing duplicate emails are intentionally retained. The per-email
-- transaction lock makes new joins idempotent without adding a unique index.
CREATE OR REPLACE FUNCTION public.join_launch_waitlist(
  p_email text,
  p_city text,
  p_federal_state text,
  p_country text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text := nullif(lower(btrim(p_email)), '');
  v_city text := nullif(btrim(p_city), '');
  v_federal_state text := nullif(btrim(p_federal_state), '');
  v_country text := nullif(upper(btrim(p_country)), '');
  v_role text := nullif(lower(btrim(p_role)), '');
BEGIN
  IF v_email IS NULL
     OR char_length(v_email) < 3
     OR char_length(v_email) > 320
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_email');
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('launch_waitlist:' || v_email, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.waitlist entry
    WHERE lower(btrim(entry.email)) = v_email
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already_joined', true);
  END IF;

  IF v_city IS NULL OR char_length(v_city) < 2 OR char_length(v_city) > 120 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_city');
  END IF;
  IF v_federal_state IS NOT NULL
     AND (char_length(v_federal_state) < 2 OR char_length(v_federal_state) > 120) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_federal_state');
  END IF;
  IF v_country IS NOT NULL
     AND (char_length(v_country) < 2 OR char_length(v_country) > 80) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_country');
  END IF;
  IF v_role IS NULL OR v_role NOT IN ('youth', 'parent', 'client', 'company') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_role');
  END IF;

  INSERT INTO public.waitlist (email, city, federal_state, country, role)
  VALUES (v_email, v_city, v_federal_state, v_country, v_role);

  RETURN jsonb_build_object('ok', true, 'already_joined', false);
END;
$$;

REVOKE INSERT ON TABLE public.waitlist FROM anon, authenticated;
DROP POLICY IF EXISTS waitlist_insert_valid ON public.waitlist;

-- Remove default PUBLIC execution and grant each RPC only to its intended
-- browser role. service_role can use the underlying tables directly.
REVOKE ALL ON FUNCTION public.complete_profile_onboarding(
  text, date, text, uuid, public.account_type, public.provider_kind, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.request_provider_verification(
  text, text, text, text, numeric, numeric
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_owned_job_details(
  uuid, public.job_status, text, text, numeric, text, text, text,
  public.job_status, text, text, boolean
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_security_events(integer)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_authorized_job_location(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.join_launch_waitlist(text, text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.redeem_guardian_invitation(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_guardian_invitation(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_guardian_invitation_info(text)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.invalidate_provider_verification_on_address_change()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_eligible_guardian_relationship()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.protect_active_guardian_eligibility()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_verified_provider_job_insert()
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.complete_profile_onboarding(
  text, date, text, uuid, public.account_type, public.provider_kind, text, text, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_provider_verification(
  text, text, text, text, numeric, numeric
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_owned_job_details(
  uuid, public.job_status, text, text, numeric, text, text, text,
  public.job_status, text, text, boolean
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_security_events(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_authorized_job_location(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_launch_waitlist(text, text, text, text, text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_guardian_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_guardian_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guardian_invitation_info(text) TO anon, authenticated;

