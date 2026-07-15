-- JobBridge platform completion
--
-- This migration closes the remaining privacy and queue-consistency gaps in
-- the jobs, Activities and notifications domains. It intentionally preserves
-- profiles, guardian relationships, waitlist records and system roles.

-- Reserved jobs remain discoverable to signed-in seekers -------------------

DROP POLICY IF EXISTS jobs_select ON public.jobs;

CREATE POLICY jobs_select_public
  ON public.jobs
  FOR SELECT
  TO anon
  USING (status = 'open'::public.job_status);

CREATE POLICY jobs_select_authenticated
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (
    status IN ('open'::public.job_status, 'reserved'::public.job_status)
    OR posted_by = (SELECT auth.uid())
    OR public.is_activity_job_participant(id)
  );

REVOKE ALL ON TABLE public.jobs FROM anon, authenticated;
GRANT SELECT ON TABLE public.jobs TO anon;
GRANT SELECT, UPDATE ON TABLE public.jobs TO authenticated;
GRANT ALL ON TABLE public.jobs TO service_role;

CREATE OR REPLACE FUNCTION public.get_waitlist_job_summaries(p_job_ids uuid[])
RETURNS TABLE (
  job_id uuid,
  waitlist_count bigint,
  next_position bigint,
  conversation_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT
    j.id,
    count(a.id) FILTER (
      WHERE a.status = 'waitlisted'::public.application_status
        AND a.conversation_state = 'open'
    )::bigint,
    (
      count(a.id) FILTER (
        WHERE a.status = 'waitlisted'::public.application_status
          AND a.conversation_state = 'open'
      ) + 1
    )::bigint,
    EXISTS (
      SELECT 1
      FROM public.applications primary_application
      WHERE primary_application.job_id = j.id
        AND primary_application.is_primary
        AND primary_application.conversation_state = 'open'
        AND primary_application.status IN ('submitted', 'negotiating', 'accepted')
    )
  FROM public.jobs j
  LEFT JOIN public.applications a ON a.job_id = j.id
  WHERE auth.uid() IS NOT NULL
    AND j.id = ANY(COALESCE(p_job_ids, ARRAY[]::uuid[]))
    AND (
      j.status IN ('open'::public.job_status, 'reserved'::public.job_status)
      OR j.posted_by = auth.uid()
      OR public.is_activity_job_participant(j.id)
    )
  GROUP BY j.id;
$$;

REVOKE ALL ON FUNCTION public.get_waitlist_job_summaries(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_waitlist_job_summaries(uuid[]) TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'jobs'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  END IF;
END;
$$;

-- Personal, preference-aware notifications --------------------------------

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS dedupe_key text;

UPDATE public.notifications
SET category = CASE
  WHEN type = 'message' THEN 'messages'
  WHEN COALESCE(data, '{}'::jsonb) ? 'appointment_id' THEN 'appointments'
  WHEN lower(COALESCE(title, '') || ' ' || COALESCE(body, '')) ~ '(warteliste|nachgerückt|platz im gespräch)' THEN 'waitlist'
  WHEN COALESCE(data, '{}'::jsonb) ? 'application_id' THEN 'applications'
  WHEN COALESCE(data, '{}'::jsonb) ? 'job_id' THEN 'jobs'
  ELSE 'system'
END
WHERE category IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN category SET DEFAULT 'system',
  ALTER COLUMN category SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_category_check'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_category_check
      CHECK (category IN ('messages', 'applications', 'waitlist', 'appointments', 'jobs', 'system'));
  END IF;
END;
$$;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS in_app_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_application_updates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_waitlist_updates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_appointments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_waitlist_updates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_appointments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Berlin';

UPDATE public.notification_preferences
SET email_enabled = COALESCE(email_enabled, true),
    email_application_updates = COALESCE(email_application_updates, true),
    email_messages = COALESCE(email_messages, true),
    email_job_updates = COALESCE(email_job_updates, true),
    digest_frequency = COALESCE(digest_frequency, 'instant'),
    updated_at = COALESCE(updated_at, now());

ALTER TABLE public.notification_preferences
  ALTER COLUMN email_enabled SET NOT NULL,
  ALTER COLUMN email_application_updates SET NOT NULL,
  ALTER COLUMN email_messages SET NOT NULL,
  ALTER COLUMN email_job_updates SET NOT NULL,
  ALTER COLUMN digest_frequency SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_digest_check'
  ) THEN
    ALTER TABLE public.notification_preferences
      ADD CONSTRAINT notification_preferences_digest_check
      CHECK (digest_frequency IN ('instant', 'daily', 'weekly'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_quiet_hours_check'
  ) THEN
    ALTER TABLE public.notification_preferences
      ADD CONSTRAINT notification_preferences_quiet_hours_check
      CHECK (
        (quiet_hours_start IS NULL AND quiet_hours_end IS NULL)
        OR (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe
  ON public.notifications(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prepare_notification_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_preferences public.notification_preferences%ROWTYPE;
  v_applicant_name text;
  v_job_title text;
BEGIN
  -- Normalize legacy lifecycle copy at the single delivery boundary. This
  -- keeps provider notifications human-readable without exposing applicants
  -- to unrelated seekers.
  IF NEW.type = 'application_new' AND COALESCE(NEW.data, '{}'::jsonb) ? 'application_id' THEN
    SELECT
      split_part(COALESCE(NULLIF(btrim(profile.full_name), ''), 'Eine Person'), ' ', 1),
      job.title
    INTO v_applicant_name, v_job_title
    FROM public.applications application
    JOIN public.profiles profile ON profile.id = application.user_id
    JOIN public.jobs job ON job.id = application.job_id
    WHERE application.id = (NEW.data->>'application_id')::uuid;

    IF FOUND THEN
      IF COALESCE((NEW.data->>'is_primary')::boolean, false) THEN
        NEW.title := 'Neue Bewerbung';
        NEW.body := v_applicant_name || ' hat sich auf „' || v_job_title || '“ beworben. Das Gespräch ist geöffnet.';
      ELSE
        NEW.title := 'Neue Person auf der Warteliste';
        NEW.body := v_applicant_name || ' hat sich für „' || v_job_title || '“ auf die Warteliste gesetzt.';
      END IF;
    END IF;
  ELSIF NEW.title = 'Du bist jetzt auf Platz 1' THEN
    NEW.title := 'Du bist jetzt im Gespräch';
    NEW.body := 'Deine Bewerbung wurde vorgezogen. Der Chat ist jetzt geöffnet.';
  END IF;

  IF NEW.category IS NULL OR NEW.category = 'system' THEN
    NEW.category := CASE
      WHEN NEW.type = 'message' THEN 'messages'
      WHEN COALESCE(NEW.data, '{}'::jsonb) ? 'appointment_id' THEN 'appointments'
      WHEN lower(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.body, '')) ~ '(warteliste|nachgerückt|platz im gespräch)' THEN 'waitlist'
      WHEN COALESCE(NEW.data, '{}'::jsonb) ? 'application_id' THEN 'applications'
      WHEN COALESCE(NEW.data, '{}'::jsonb) ? 'job_id' THEN 'jobs'
      ELSE 'system'
    END;
  END IF;

  SELECT * INTO v_preferences
  FROM public.notification_preferences
  WHERE user_id = NEW.user_id;

  IF FOUND AND NEW.category <> 'system' THEN
    IF NOT v_preferences.in_app_enabled THEN
      RETURN NULL;
    END IF;

    IF NEW.category = 'messages' AND NOT v_preferences.in_app_messages THEN
      RETURN NULL;
    ELSIF NEW.category = 'applications' AND NOT v_preferences.in_app_application_updates THEN
      RETURN NULL;
    ELSIF NEW.category = 'waitlist' AND NOT v_preferences.in_app_waitlist_updates THEN
      RETURN NULL;
    ELSIF NEW.category = 'appointments' AND NOT v_preferences.in_app_appointments THEN
      RETURN NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_prepare_delivery ON public.notifications;
CREATE TRIGGER notifications_prepare_delivery
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.prepare_notification_delivery();

REVOKE ALL ON FUNCTION public.prepare_notification_delivery() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_notification_delivery() TO service_role;

DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;

CREATE POLICY notification_preferences_select_own
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY notification_preferences_insert_own
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY notification_preferences_update_own
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

REVOKE ALL ON TABLE public.notification_preferences FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_preferences TO authenticated;
GRANT ALL ON TABLE public.notification_preferences TO service_role;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;

  UPDATE public.notifications
  SET read_at = COALESCE(read_at, now())
  WHERE id = p_notification_id
    AND user_id = v_user_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('ok', v_updated > 0, 'updated_count', v_updated);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;

  UPDATE public.notifications
  SET read_at = now()
  WHERE user_id = v_user_id
    AND read_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'updated_count', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

-- Private ephemeral typing events ------------------------------------------

DROP POLICY IF EXISTS activity_typing_broadcast_read ON realtime.messages;
DROP POLICY IF EXISTS activity_typing_broadcast_send ON realtime.messages;

CREATE POLICY activity_typing_broadcast_read
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.messages.extension = 'broadcast'
    AND EXISTS (
      SELECT 1
      FROM public.applications application
      JOIN public.jobs job ON job.id = application.job_id
      WHERE realtime.topic() = 'activity:' || application.id::text
        AND (
          application.user_id = (SELECT auth.uid())
          OR job.posted_by = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY activity_typing_broadcast_send
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.messages.extension = 'broadcast'
    AND EXISTS (
      SELECT 1
      FROM public.applications application
      JOIN public.jobs job ON job.id = application.job_id
      WHERE realtime.topic() = 'activity:' || application.id::text
        AND application.conversation_state = 'open'
        AND application.status IN ('submitted', 'negotiating', 'accepted')
        AND (
          application.user_id = (SELECT auth.uid())
          OR job.posted_by = (SELECT auth.uid())
        )
    )
  );

-- Clearer queue promotion language and provider context --------------------

CREATE OR REPLACE FUNCTION public._activity_rebalance_job(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
  v_primary record;
  v_candidate record;
BEGIN
  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Job nicht gefunden.');
  END IF;

  IF v_job.status = 'filled' AND v_job.filled_by IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'action', 'assigned');
  END IF;

  SELECT a.id, a.user_id, a.status
  INTO v_primary
  FROM public.applications a
  WHERE a.job_id = p_job_id
    AND a.is_primary
    AND a.conversation_state = 'open'
    AND a.status IN ('submitted', 'negotiating', 'accepted')
  ORDER BY a.queue_position, a.created_at, a.id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.jobs
    SET status = CASE WHEN v_primary.status = 'accepted' THEN 'filled'::public.job_status ELSE 'reserved'::public.job_status END,
        filled_by = CASE WHEN v_primary.status = 'accepted' THEN v_primary.user_id ELSE NULL END,
        filled_at = CASE WHEN v_primary.status = 'accepted' THEN COALESCE(filled_at, now()) ELSE NULL END,
        completed_at = NULL,
        updated_at = now()
    WHERE id = p_job_id;

    RETURN jsonb_build_object('ok', true, 'action', 'primary_kept', 'application_id', v_primary.id);
  END IF;

  SELECT a.id, a.user_id, COALESCE(NULLIF(btrim(p.full_name), ''), 'Eine Person') AS display_name
  INTO v_candidate
  FROM public.applications a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.job_id = p_job_id
    AND a.status = 'waitlisted'
    AND a.conversation_state = 'open'
  ORDER BY a.queue_position, a.created_at, a.id
  LIMIT 1
  FOR UPDATE OF a;

  IF FOUND THEN
    UPDATE public.applications
    SET status = 'negotiating',
        is_primary = true,
        promoted_at = now(),
        promoted_by = NULL,
        promotion_reason = 'Automatisch nach frei gewordenem Gespräch nachgerückt.',
        updated_at = now()
    WHERE id = v_candidate.id;

    UPDATE public.jobs
    SET status = 'reserved',
        filled_by = NULL,
        filled_at = NULL,
        completed_at = NULL,
        updated_at = now()
    WHERE id = p_job_id;

    INSERT INTO public.application_events (application_id, event_type, reason, metadata)
    VALUES (
      v_candidate.id,
      'queue_promoted_automatically',
      'Automatisch aus der Warteliste nachgerückt.',
      jsonb_build_object('job_id', p_job_id)
    );

    INSERT INTO public.messages (application_id, sender_id, content, kind)
    VALUES (
      v_candidate.id,
      v_job.posted_by,
      'Du bist aus der Warteliste nachgerückt. Dieses Gespräch ist jetzt geöffnet.',
      'system'
    );

    INSERT INTO public.notifications (user_id, type, title, body, data, category)
    VALUES (
      v_candidate.user_id,
      'application_status',
      'Du bist nachgerückt',
      'Für „' || v_job.title || '“ ist das Gespräch jetzt für dich geöffnet.',
      jsonb_build_object(
        'route', '/app-home/activities?conversation=' || v_candidate.id::text,
        'application_id', v_candidate.id,
        'job_id', p_job_id
      ),
      'waitlist'
    );

    RETURN jsonb_build_object(
      'ok', true,
      'action', 'promoted',
      'application_id', v_candidate.id,
      'user_id', v_candidate.user_id,
      'display_name', v_candidate.display_name
    );
  END IF;

  UPDATE public.jobs
  SET status = 'open',
      filled_by = NULL,
      filled_at = NULL,
      completed_at = NULL,
      updated_at = now()
  WHERE id = p_job_id
    AND status IN ('reserved', 'reviewing', 'filled');

  RETURN jsonb_build_object('ok', true, 'action', 'job_reopened');
END;
$$;

CREATE OR REPLACE FUNCTION public._activity_close_application(
  p_application_id uuid,
  p_actor_id uuid,
  p_action text,
  p_reason text,
  p_status public.application_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_app record;
  v_rebalance jsonb := NULL;
BEGIN
  SELECT
    a.id,
    a.user_id,
    a.job_id,
    a.status,
    a.is_primary,
    a.conversation_state,
    a.closed_by,
    a.close_action,
    j.posted_by,
    j.title,
    j.status AS job_status,
    j.filled_by
  INTO v_app
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = p_application_id
  FOR UPDATE OF a, j;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bewerbung nicht gefunden.');
  END IF;

  IF v_app.conversation_state = 'closed'
     AND v_app.closed_by = p_actor_id
     AND v_app.close_action = p_action THEN
    RETURN jsonb_build_object(
      'ok', true,
      'unchanged', true,
      'job_id', v_app.job_id,
      'job_title', v_app.title,
      'seeker_id', v_app.user_id,
      'provider_id', v_app.posted_by
    );
  END IF;

  IF v_app.conversation_state = 'closed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dieses Gespräch ist bereits geschlossen.');
  END IF;

  UPDATE public.applications
  SET status = p_status,
      rejection_reason = p_reason,
      conversation_state = 'closed',
      closed_by = p_actor_id,
      closed_at = now(),
      closed_reason = p_reason,
      close_action = p_action,
      closed_from_status = v_app.status,
      was_primary_before_close = v_app.is_primary,
      closure_version = closure_version + 1,
      is_primary = false,
      reopened_at = NULL,
      reopened_by = NULL,
      updated_at = now()
  WHERE id = p_application_id;

  UPDATE public.job_engagements
  SET status = 'cancelled',
      cancelled_at = now(),
      closed_by = p_actor_id,
      close_reason = p_reason,
      updated_at = now()
  WHERE application_id = p_application_id
    AND status = 'active';

  UPDATE public.job_appointments appointment
  SET status = 'cancelled',
      updated_at = now()
  FROM public.job_engagements engagement
  WHERE engagement.application_id = p_application_id
    AND appointment.engagement_id = engagement.id
    AND appointment.status = 'scheduled';

  UPDATE public.job_agreements
  SET status = 'cancelled',
      updated_at = now()
  WHERE application_id = p_application_id
    AND status = 'confirmed';

  IF v_app.filled_by = v_app.user_id THEN
    UPDATE public.jobs
    SET status = 'open',
        filled_by = NULL,
        filled_at = NULL,
        completed_at = NULL,
        updated_at = now()
    WHERE id = v_app.job_id;
  END IF;

  INSERT INTO public.application_events (application_id, actor_id, event_type, reason, metadata)
  VALUES (
    p_application_id,
    p_actor_id,
    p_action,
    p_reason,
    jsonb_build_object(
      'previous_status', v_app.status,
      'was_primary', v_app.is_primary,
      'job_id', v_app.job_id
    )
  );

  IF v_app.is_primary OR v_app.status = 'accepted' THEN
    v_rebalance := public._activity_rebalance_job(v_app.job_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'job_id', v_app.job_id,
    'job_title', v_app.title,
    'seeker_id', v_app.user_id,
    'provider_id', v_app.posted_by,
    'was_primary', v_app.is_primary,
    'rebalance', v_rebalance
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
  v_result jsonb;
  v_rebalance jsonb;
  v_route_application_id uuid;
  v_body text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;
  IF char_length(v_reason) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Grund darf höchstens 500 Zeichen lang sein.');
  END IF;

  SELECT
    a.user_id,
    a.status,
    a.conversation_state,
    a.closed_by,
    a.close_action,
    COALESCE(NULLIF(btrim(p.full_name), ''), 'Eine Person') AS display_name
  INTO v_app
  FROM public.applications a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bewerbung nicht gefunden.');
  END IF;
  IF v_app.user_id <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nur der Bewerber kann diese Bewerbung zurückziehen.');
  END IF;
  IF v_app.status = 'withdrawn'
     AND v_app.conversation_state = 'closed'
     AND v_app.closed_by = v_user_id
     AND v_app.close_action = 'seeker_withdrew' THEN
    RETURN jsonb_build_object('ok', true, 'unchanged', true);
  END IF;
  IF v_app.status NOT IN ('submitted', 'negotiating', 'waitlisted', 'accepted')
     OR v_app.conversation_state <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Diese Bewerbung kann nicht zurückgezogen werden.');
  END IF;

  v_result := public._activity_close_application(
    p_application_id,
    v_user_id,
    'seeker_withdrew',
    v_reason,
    'withdrawn'
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RETURN v_result;
  END IF;

  v_rebalance := v_result->'rebalance';
  v_route_application_id := CASE
    WHEN v_rebalance->>'action' = 'promoted' THEN (v_rebalance->>'application_id')::uuid
    ELSE p_application_id
  END;

  v_body := split_part(v_app.display_name, ' ', 1) || ' hat die Bewerbung für „'
    || COALESCE(v_result->>'job_title', 'deinen Job') || '“ zurückgezogen.';

  IF v_rebalance->>'action' = 'promoted' THEN
    v_body := v_body || ' ' || split_part(COALESCE(v_rebalance->>'display_name', 'Die nächste Person'), ' ', 1)
      || ' ist aus der Warteliste nachgerückt; der Chat ist jetzt geöffnet.';
  ELSIF v_rebalance->>'action' = 'job_reopened' THEN
    v_body := v_body || ' Das Angebot ist wieder für neue Bewerbungen geöffnet.';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data, category)
  VALUES (
    (v_result->>'provider_id')::uuid,
    'application_status',
    'Bewerbung zurückgezogen',
    v_body,
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || v_route_application_id::text,
      'application_id', v_route_application_id,
      'job_id', (v_result->>'job_id')::uuid,
      'closed_application_id', p_application_id
    ),
    CASE WHEN v_rebalance->>'action' = 'promoted' THEN 'waitlist' ELSE 'applications' END
  );

  RETURN v_result;
END;
$$;

-- Retire empty demo infrastructure and obsolete service-only APIs ----------

DROP FUNCTION IF EXISTS public.create_job_atomic(uuid, text, text, double precision, text, text, text, double precision, double precision, text, double precision, double precision, text, uuid);
DROP FUNCTION IF EXISTS public.create_job_atomic(uuid, text, text, numeric, text, text, text, double precision, double precision, text, double precision, double precision, text);
DROP FUNCTION IF EXISTS public.accept_applicant(uuid);
DROP FUNCTION IF EXISTS public.confirm_job_agreement(uuid, timestamptz, timestamptz, text, text);
DROP FUNCTION IF EXISTS public.get_effective_role(uuid);
DROP FUNCTION IF EXISTS public.get_my_effective_role();
DROP FUNCTION IF EXISTS public.can_act_as(text);
DROP FUNCTION IF EXISTS public.is_demo_user();

DROP TABLE IF EXISTS public.demo_applications;
DROP TABLE IF EXISTS public.demo_jobs;
DROP TABLE IF EXISTS public.demo_sessions;
DROP TABLE IF EXISTS public.role_overrides;

REVOKE ALL ON TABLE public.messages FROM anon, authenticated;
GRANT SELECT ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;

REVOKE ALL ON TABLE public.reports FROM anon, authenticated;
GRANT ALL ON TABLE public.reports TO service_role;
