-- Close legacy browser grants and lock trigger helpers to deterministic paths.

ALTER FUNCTION public.has_system_role(uuid, text)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.sync_regions_display_name()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.handle_new_user()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.sync_profile_from_auth_user()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.sync_user_email()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.is_staff()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.is_staff(uuid)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.get_guardian_invitation_info(text)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.redeem_guardian_invitation(text)
  SET search_path = pg_catalog, public, pg_temp;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_regions_display_name() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_from_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_user_email() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_regions_display_name() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_profile_from_auth_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_user_email() TO service_role;

REVOKE ALL ON FUNCTION public.has_system_role(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_system_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

-- Guardian invitation lookup and redemption are the two intentional anonymous
-- SECURITY DEFINER endpoints. Keep them explicit instead of inheriting PUBLIC.
REVOKE ALL ON FUNCTION public.get_guardian_invitation_info(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_guardian_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guardian_invitation_info(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_guardian_invitation(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Enable insert for all users" ON public.waitlist;
CREATE POLICY waitlist_insert_valid
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(btrim(email)) BETWEEN 3 AND 320
    AND email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    AND char_length(btrim(city)) BETWEEN 2 AND 120
    AND (country IS NULL OR char_length(btrim(country)) BETWEEN 2 AND 80)
    AND (federal_state IS NULL OR char_length(btrim(federal_state)) BETWEEN 2 AND 120)
    AND (role IS NULL OR role IN ('youth', 'parent', 'client', 'company'))
  );

REVOKE ALL ON TABLE public.waitlist FROM anon, authenticated;
GRANT INSERT ON TABLE public.waitlist TO anon, authenticated;
GRANT ALL ON TABLE public.waitlist TO service_role;

DROP POLICY IF EXISTS moderation_actions_service_only ON public.moderation_actions;
CREATE POLICY moderation_actions_service_only
  ON public.moderation_actions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS security_events_service_only ON public.security_events;
CREATE POLICY security_events_service_only
  ON public.security_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.moderation_actions FROM anon, authenticated;
REVOKE ALL ON TABLE public.security_events FROM anon, authenticated;
GRANT ALL ON TABLE public.moderation_actions TO service_role;
GRANT ALL ON TABLE public.security_events TO service_role;
