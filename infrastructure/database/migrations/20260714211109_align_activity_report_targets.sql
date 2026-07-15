-- Align activity reports with the existing report target vocabulary and allow
-- a reopen request to be moderated as its own auditable object.

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_target_type_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_target_type_check
  CHECK (target_type IN ('job', 'user', 'message', 'reopen_request'));

CREATE OR REPLACE FUNCTION public.report_activity_item(
  p_application_id uuid,
  p_reason_code text,
  p_details text DEFAULT NULL,
  p_reported_user_id uuid DEFAULT NULL,
  p_message_id uuid DEFAULT NULL,
  p_reopen_request_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_reason_code text := lower(btrim(COALESCE(p_reason_code, '')));
  v_details text := NULLIF(btrim(p_details), '');
  v_app record;
  v_target_type text;
  v_target_id uuid;
  v_reported_user_id uuid;
  v_message record;
  v_request record;
  v_report public.reports%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;
  IF v_reason_code NOT IN ('harassment', 'fraud', 'safety', 'inappropriate', 'spam', 'other') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bitte wähle einen gültigen Meldegrund.');
  END IF;
  IF char_length(COALESCE(v_details, '')) > 1500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Die Beschreibung darf höchstens 1.500 Zeichen lang sein.');
  END IF;
  IF p_message_id IS NOT NULL AND p_reopen_request_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bitte melde nur ein Element gleichzeitig.');
  END IF;

  SELECT a.user_id, j.posted_by
  INTO v_app
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = p_application_id;

  IF NOT FOUND OR (v_user_id <> v_app.user_id AND v_user_id <> v_app.posted_by) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht berechtigt.');
  END IF;

  IF p_reopen_request_id IS NOT NULL THEN
    SELECT requested_by, message
    INTO v_request
    FROM public.conversation_reopen_requests
    WHERE id = p_reopen_request_id
      AND application_id = p_application_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Öffnungsanfrage nicht gefunden.');
    END IF;
    v_target_type := 'reopen_request';
    v_target_id := p_reopen_request_id;
    v_reported_user_id := v_request.requested_by;
  ELSIF p_message_id IS NOT NULL THEN
    SELECT sender_id, kind
    INTO v_message
    FROM public.messages
    WHERE id = p_message_id
      AND application_id = p_application_id;

    IF NOT FOUND OR v_message.kind = 'system' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Nachricht nicht gefunden oder nicht meldbar.');
    END IF;
    v_target_type := 'message';
    v_target_id := p_message_id;
    v_reported_user_id := v_message.sender_id;
  ELSE
    v_reported_user_id := COALESCE(
      p_reported_user_id,
      CASE WHEN v_user_id = v_app.user_id THEN v_app.posted_by ELSE v_app.user_id END
    );
    v_target_type := 'user';
    v_target_id := v_reported_user_id;
  END IF;

  IF v_reported_user_id IS NULL
     OR v_reported_user_id = v_user_id
     OR v_reported_user_id NOT IN (v_app.user_id, v_app.posted_by) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Diese Person kann in diesem Gespräch nicht gemeldet werden.');
  END IF;
  IF p_reported_user_id IS NOT NULL AND p_reported_user_id <> v_reported_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Das gemeldete Element gehört nicht zu dieser Person.');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.reporter_user_id = v_user_id
      AND r.target_type = v_target_type
      AND r.target_id = v_target_id
      AND r.status = 'open'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dieses Element wurde bereits gemeldet und wird geprüft.');
  END IF;

  INSERT INTO public.reports (
    reporter_user_id,
    target_type,
    target_id,
    reason_code,
    details,
    status,
    application_id,
    reported_user_id,
    message_id,
    reopen_request_id
  ) VALUES (
    v_user_id,
    v_target_type,
    v_target_id,
    v_reason_code,
    v_details,
    'open',
    p_application_id,
    v_reported_user_id,
    p_message_id,
    p_reopen_request_id
  )
  RETURNING * INTO v_report;

  INSERT INTO public.application_events (application_id, actor_id, event_type, metadata)
  VALUES (
    p_application_id,
    v_user_id,
    'activity_report_created',
    jsonb_build_object('report_id', v_report.id, 'target_type', v_target_type, 'target_id', v_target_id)
  );

  RETURN jsonb_build_object('ok', true, 'report_id', v_report.id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.report_activity_item(uuid, text, text, uuid, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_activity_item(uuid, text, text, uuid, uuid, uuid)
  TO authenticated, service_role;
