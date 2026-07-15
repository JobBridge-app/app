-- Activities realtime, chat actions and job agreements (2026-07-14)
-- =============================================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS data jsonb;

CREATE TABLE IF NOT EXISTS public.job_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seeker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'Europe/Berlin',
  note text,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_agreements_time_range_check
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

ALTER TABLE public.job_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view job agreements" ON public.job_agreements;
CREATE POLICY "Participants can view job agreements"
  ON public.job_agreements
  FOR SELECT
  TO authenticated
  USING (
    provider_id = (SELECT auth.uid())
    OR seeker_id = (SELECT auth.uid())
  );

REVOKE ALL ON TABLE public.job_agreements FROM anon, authenticated;
GRANT SELECT ON TABLE public.job_agreements TO authenticated;
GRANT ALL ON TABLE public.job_agreements TO service_role;

CREATE INDEX IF NOT EXISTS idx_messages_application_timeline
  ON public.messages(application_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_messages_application_unread
  ON public.messages(application_id, sender_id)
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_applications_job_status_created
  ON public.applications(job_id, status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_job_agreements_provider_schedule
  ON public.job_agreements(provider_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_agreements_seeker_schedule
  ON public.job_agreements(seeker_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_agreements_job_status
  ON public.job_agreements(job_id, status);

CREATE OR REPLACE FUNCTION public.is_activity_job_participant(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.job_id = p_job_id
      AND (a.user_id = auth.uid() OR j.posted_by = auth.uid())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_activity_job_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_activity_job_participant(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Activity participants can view jobs" ON public.jobs;
CREATE POLICY "Activity participants can view jobs"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (public.is_activity_job_participant(id));

CREATE OR REPLACE FUNCTION public._rebalance_job_after_application_exit(
  p_job_id uuid,
  p_exiting_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_job record;
  v_active record;
  v_waitlisted record;
BEGIN
  SELECT id, title, status, posted_by, filled_by
  INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND OR v_job.status NOT IN ('reserved', 'filled') THEN
    RETURN jsonb_build_object('ok', true, 'action', 'unchanged');
  END IF;

  IF v_job.status = 'filled' AND v_job.filled_by IS DISTINCT FROM p_exiting_user_id THEN
    RETURN jsonb_build_object('ok', true, 'action', 'unchanged_other_assignment');
  END IF;

  SELECT id, user_id
  INTO v_active
  FROM public.applications
  WHERE job_id = p_job_id
    AND user_id IS DISTINCT FROM p_exiting_user_id
    AND status = 'accepted'
  ORDER BY created_at, id
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.jobs
    SET status = 'filled', filled_by = v_active.user_id, filled_at = COALESCE(filled_at, now())
    WHERE id = p_job_id;
    RETURN jsonb_build_object('ok', true, 'action', 'kept_filled');
  END IF;

  SELECT id, user_id
  INTO v_active
  FROM public.applications
  WHERE job_id = p_job_id
    AND user_id IS DISTINCT FROM p_exiting_user_id
    AND status = 'negotiating'
  ORDER BY created_at, id
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.jobs
    SET status = 'reserved', filled_by = NULL, filled_at = NULL
    WHERE id = p_job_id;
    RETURN jsonb_build_object('ok', true, 'action', 'kept_reserved');
  END IF;

  SELECT id, user_id
  INTO v_waitlisted
  FROM public.applications
  WHERE job_id = p_job_id
    AND status = 'waitlisted'
  ORDER BY created_at, id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.applications
    SET status = 'negotiating'
    WHERE id = v_waitlisted.id;

    UPDATE public.jobs
    SET status = 'reserved', filled_by = NULL, filled_at = NULL
    WHERE id = p_job_id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_waitlisted.user_id,
      'info',
      'Platz im Gespräch frei',
      'Deine Bewerbung für „' || v_job.title || '“ ist jetzt aktiv.',
      jsonb_build_object(
        'route', '/app-home/activities?conversation=' || v_waitlisted.id::text,
        'application_id', v_waitlisted.id,
        'job_id', p_job_id
      )
    );

    RETURN jsonb_build_object('ok', true, 'action', 'promoted_waitlist', 'application_id', v_waitlisted.id);
  END IF;

  UPDATE public.jobs
  SET status = 'open', filled_by = NULL, filled_at = NULL
  WHERE id = p_job_id
    AND status IN ('reserved', 'filled');

  RETURN jsonb_build_object('ok', true, 'action', 'reopened');
END;
$$;

REVOKE ALL ON FUNCTION public._rebalance_job_after_application_exit(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._rebalance_job_after_application_exit(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.send_application_message(
  p_application_id uuid,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_content text := btrim(COALESCE(p_content, ''));
  v_app record;
  v_message public.messages%ROWTYPE;
  v_recipient_id uuid;
  v_body text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert');
  END IF;
  IF char_length(v_content) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nachricht darf nicht leer sein.');
  END IF;
  IF char_length(v_content) > 1200 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Die Nachricht darf höchstens 1.200 Zeichen lang sein.');
  END IF;

  SELECT a.id, a.user_id, a.status, a.job_id, j.posted_by, j.title
  INTO v_app
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = p_application_id
  FOR UPDATE OF a;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bewerbung nicht gefunden.');
  END IF;
  IF v_user_id <> v_app.user_id AND v_user_id <> v_app.posted_by THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht berechtigt.');
  END IF;
  IF v_app.status NOT IN ('submitted', 'negotiating', 'accepted') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dieses Gespräch ist geschlossen.');
  END IF;

  IF v_user_id = v_app.posted_by AND v_app.status = 'submitted' THEN
    UPDATE public.applications
    SET status = 'negotiating'
    WHERE id = p_application_id;
  END IF;

  INSERT INTO public.messages (application_id, sender_id, content)
  VALUES (p_application_id, v_user_id, v_content)
  RETURNING * INTO v_message;

  IF v_user_id = v_app.user_id THEN
    v_recipient_id := v_app.posted_by;
    v_body := 'Du hast eine neue Nachricht von einem Bewerber erhalten.';
  ELSE
    v_recipient_id := v_app.user_id;
    v_body := 'Du hast eine neue Nachricht von einem Anbieter erhalten.';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_recipient_id,
    'message',
    'Neue Nachricht zu „' || v_app.title || '“',
    v_body,
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || p_application_id::text,
      'application_id', p_application_id,
      'job_id', v_app.job_id
    )
  );

  RETURN jsonb_build_object('ok', true, 'message', to_jsonb(v_message));
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_application_messages_read(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_app record;
  v_updated_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert');
  END IF;

  SELECT a.user_id, j.posted_by
  INTO v_app
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bewerbung nicht gefunden.');
  END IF;
  IF v_user_id <> v_app.user_id AND v_user_id <> v_app.posted_by THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht berechtigt.');
  END IF;

  UPDATE public.messages
  SET read_at = now()
  WHERE application_id = p_application_id
    AND sender_id <> v_user_id
    AND read_at IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'updated_count', v_updated_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_job_agreement(
  p_application_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz DEFAULT NULL,
  p_timezone text DEFAULT 'Europe/Berlin',
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_timezone text := COALESCE(NULLIF(btrim(p_timezone), ''), 'Europe/Berlin');
  v_note text := NULLIF(btrim(p_note), '');
  v_app record;
  v_existing public.job_agreements%ROWTYPE;
  v_agreement public.job_agreements%ROWTYPE;
  v_had_confirmed_agreement boolean := false;
  v_is_unchanged boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert');
  END IF;
  IF p_starts_at IS NULL OR p_starts_at < now() - interval '1 minute' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Termin muss in der Zukunft liegen.');
  END IF;
  IF p_ends_at IS NOT NULL AND p_ends_at <= p_starts_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Das Ende muss nach dem Beginn liegen.');
  END IF;
  IF char_length(v_timezone) > 80 OR char_length(COALESCE(v_note, '')) > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Termindaten sind zu lang.');
  END IF;

  SELECT a.id, a.user_id, a.job_id, a.status, j.posted_by, j.title,
         j.status AS job_status, j.filled_by
  INTO v_app
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = p_application_id
  FOR UPDATE OF a, j;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bewerbung nicht gefunden.');
  END IF;
  IF v_app.posted_by <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nur der Anbieter kann einen Termin festlegen.');
  END IF;
  IF v_app.status NOT IN ('submitted', 'negotiating', 'accepted') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Für diese Bewerbung kann kein Termin festgelegt werden.');
  END IF;
  IF v_app.job_status NOT IN ('open', 'reviewing', 'reserved', 'filled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Job ist nicht mehr verfügbar.');
  END IF;
  IF v_app.job_status = 'filled' AND v_app.filled_by IS DISTINCT FROM v_app.user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Job ist bereits anderweitig vergeben.');
  END IF;

  SELECT *
  INTO v_existing
  FROM public.job_agreements
  WHERE application_id = p_application_id
  FOR UPDATE;

  IF FOUND THEN
    v_had_confirmed_agreement := v_existing.status = 'confirmed';
    v_is_unchanged := v_had_confirmed_agreement
      AND v_existing.starts_at = p_starts_at
      AND v_existing.ends_at IS NOT DISTINCT FROM p_ends_at
      AND v_existing.timezone = v_timezone
      AND v_existing.note IS NOT DISTINCT FROM v_note
      AND v_app.status = 'accepted'
      AND v_app.job_status = 'filled'
      AND v_app.filled_by = v_app.user_id;
  END IF;

  IF v_is_unchanged THEN
    RETURN jsonb_build_object(
      'ok', true,
      'agreement', to_jsonb(v_existing),
      'scheduled_for', v_existing.starts_at,
      'agreed_at', v_existing.updated_at,
      'unchanged', true
    );
  END IF;

  INSERT INTO public.job_agreements (
    application_id, job_id, provider_id, seeker_id,
    starts_at, ends_at, timezone, note, status
  )
  VALUES (
    p_application_id, v_app.job_id, v_app.posted_by, v_app.user_id,
    p_starts_at, p_ends_at, v_timezone, v_note, 'confirmed'
  )
  ON CONFLICT (application_id) DO UPDATE
  SET job_id = EXCLUDED.job_id,
      provider_id = EXCLUDED.provider_id,
      seeker_id = EXCLUDED.seeker_id,
      starts_at = EXCLUDED.starts_at,
      ends_at = EXCLUDED.ends_at,
      timezone = EXCLUDED.timezone,
      note = EXCLUDED.note,
      status = 'confirmed',
      updated_at = now()
  RETURNING * INTO v_agreement;

  UPDATE public.applications
  SET status = 'accepted', rejection_reason = NULL
  WHERE id = p_application_id;

  WITH changed AS (
    UPDATE public.applications
    SET status = 'auto_rejected',
        rejection_reason = 'Der Job wurde verbindlich vergeben.'
    WHERE job_id = v_app.job_id
      AND id <> p_application_id
      AND status IN ('submitted', 'negotiating', 'waitlisted')
    RETURNING id, user_id
  )
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    changed.user_id,
    'warning',
    'Job anderweitig vergeben',
    'Der Job „' || v_app.title || '“ wurde verbindlich vergeben.',
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || changed.id::text,
      'application_id', changed.id,
      'job_id', v_app.job_id
    )
  FROM changed;

  UPDATE public.jobs
  SET status = 'filled',
      filled_by = v_app.user_id,
      filled_at = COALESCE(filled_at, now()),
      updated_at = now()
  WHERE id = v_app.job_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_app.user_id,
    'success',
    CASE WHEN v_had_confirmed_agreement THEN 'Termin aktualisiert' ELSE 'Termin vereinbart' END,
    'Der Termin für „' || v_app.title || '“ wurde verbindlich gespeichert.',
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || p_application_id::text,
      'application_id', p_application_id,
      'job_id', v_app.job_id,
      'starts_at', p_starts_at
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'agreement', to_jsonb(v_agreement),
    'scheduled_for', v_agreement.starts_at,
    'agreed_at', v_agreement.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_application(
  p_application_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_reason text := COALESCE(NULLIF(btrim(p_reason), ''), 'Kein Interesse mehr');
  v_app record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert');
  END IF;
  IF char_length(v_reason) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Grund darf höchstens 500 Zeichen lang sein.');
  END IF;

  SELECT a.id, a.user_id, a.job_id, a.status, j.posted_by, j.title
  INTO v_app
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = p_application_id
  FOR UPDATE OF a, j;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bewerbung nicht gefunden.');
  END IF;
  IF v_app.user_id <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht berechtigt.');
  END IF;
  IF v_app.status = 'withdrawn' THEN
    RETURN jsonb_build_object('ok', true, 'unchanged', true);
  END IF;
  IF v_app.status NOT IN ('submitted', 'negotiating', 'waitlisted', 'accepted') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Diese Bewerbung kann nicht mehr zurückgezogen werden.');
  END IF;

  UPDATE public.applications
  SET status = 'withdrawn', rejection_reason = v_reason
  WHERE id = p_application_id;

  UPDATE public.job_agreements
  SET status = 'cancelled', updated_at = now()
  WHERE application_id = p_application_id
    AND status = 'confirmed';

  IF v_app.status IN ('negotiating', 'accepted') THEN
    PERFORM public._rebalance_job_after_application_exit(v_app.job_id, v_app.user_id);
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_app.posted_by,
    'info',
    'Bewerbung zurückgezogen',
    'Eine Bewerbung für „' || v_app.title || '“ wurde zurückgezogen.',
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || p_application_id::text,
      'application_id', p_application_id,
      'job_id', v_app.job_id
    )
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_application(
  p_application_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_app record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert');
  END IF;
  IF char_length(v_reason) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bitte gib einen kurzen Grund an.');
  END IF;
  IF char_length(v_reason) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Grund darf höchstens 500 Zeichen lang sein.');
  END IF;

  SELECT a.id, a.user_id, a.job_id, a.status, j.posted_by, j.title
  INTO v_app
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = p_application_id
  FOR UPDATE OF a, j;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bewerbung nicht gefunden.');
  END IF;
  IF v_app.posted_by <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht berechtigt.');
  END IF;
  IF v_app.status IN ('rejected', 'auto_rejected') THEN
    RETURN jsonb_build_object('ok', true, 'unchanged', true);
  END IF;
  IF v_app.status NOT IN ('submitted', 'negotiating', 'waitlisted', 'accepted') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Diese Bewerbung kann nicht mehr abgelehnt werden.');
  END IF;

  UPDATE public.applications
  SET status = 'rejected', rejection_reason = v_reason
  WHERE id = p_application_id;

  UPDATE public.job_agreements
  SET status = 'cancelled', updated_at = now()
  WHERE application_id = p_application_id
    AND status = 'confirmed';

  IF v_app.status IN ('negotiating', 'accepted') THEN
    PERFORM public._rebalance_job_after_application_exit(v_app.job_id, v_app.user_id);
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_app.user_id,
    'warning',
    'Bewerbung abgelehnt',
    'Deine Bewerbung für „' || v_app.title || '“ wurde abgelehnt. Grund: ' || v_reason,
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || p_application_id::text,
      'application_id', p_application_id,
      'job_id', v_app.job_id
    )
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_application_message(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_application_messages_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_job_agreement(uuid, timestamptz, timestamptz, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.withdraw_application(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_application(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.send_application_message(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_application_messages_read(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_job_agreement(uuid, timestamptz, timestamptz, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_application(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_application(uuid, text) TO authenticated, service_role;

DO $$
BEGIN
  IF to_regprocedure('public.accept_applicant(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.accept_applicant(uuid) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.accept_applicant(uuid) TO authenticated, service_role';
    EXECUTE 'ALTER FUNCTION public.accept_applicant(uuid) SET search_path = pg_catalog, public, pg_temp';
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'applications'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.applications';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'job_agreements'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.job_agreements';
    END IF;
  END IF;
END;
$$;
