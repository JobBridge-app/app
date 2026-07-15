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
  v_conversation jsonb := '[]'::jsonb;
  v_target_evidence jsonb := NULL;
  v_evidence jsonb;
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

  SELECT
    application.user_id,
    job.posted_by,
    application.job_id,
    job.title AS job_title
  INTO v_app
  FROM public.applications application
  JOIN public.jobs job ON job.id = application.job_id
  WHERE application.id = p_application_id;

  IF NOT FOUND OR (v_user_id <> v_app.user_id AND v_user_id <> v_app.posted_by) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht berechtigt.');
  END IF;

  IF p_reopen_request_id IS NOT NULL THEN
    SELECT requested_by, message, created_at
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
    v_target_evidence := jsonb_build_object(
      'id', p_reopen_request_id,
      'requested_by', v_request.requested_by,
      'message', v_request.message,
      'created_at', v_request.created_at
    );
  ELSIF p_message_id IS NOT NULL THEN
    SELECT sender_id, kind, content, created_at
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
    v_target_evidence := jsonb_build_object(
      'id', p_message_id,
      'sender_id', v_message.sender_id,
      'kind', v_message.kind,
      'content', v_message.content,
      'created_at', v_message.created_at
    );
  ELSE
    v_reported_user_id := COALESCE(
      p_reported_user_id,
      CASE WHEN v_user_id = v_app.user_id THEN v_app.posted_by ELSE v_app.user_id END
    );
    v_target_type := 'user';
    v_target_id := v_reported_user_id;

    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', recent_message.id,
        'sender_id', recent_message.sender_id,
        'kind', recent_message.kind,
        'content', recent_message.content,
        'created_at', recent_message.created_at
      ) ORDER BY recent_message.created_at, recent_message.id
    ), '[]'::jsonb)
    INTO v_conversation
    FROM (
      SELECT message.id, message.sender_id, message.kind, message.content, message.created_at
      FROM public.messages message
      WHERE message.application_id = p_application_id
        AND message.deleted_at IS NULL
      ORDER BY message.created_at DESC, message.id DESC
      LIMIT 20
    ) recent_message;
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
    SELECT 1 FROM public.reports report
    WHERE report.reporter_user_id = v_user_id
      AND report.target_type = v_target_type
      AND report.target_id = v_target_id
      AND report.status = 'open'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dieses Element wurde bereits gemeldet und wird geprüft.');
  END IF;

  v_evidence := jsonb_strip_nulls(jsonb_build_object(
    'version', 1,
    'target_type', v_target_type,
    'application_id', p_application_id,
    'job_id', v_app.job_id,
    'job_title', v_app.job_title,
    'reporter_user_id', v_user_id,
    'reported_user_id', v_reported_user_id,
    'message', CASE WHEN v_target_type = 'message' THEN v_target_evidence ELSE NULL END,
    'reopen_request', CASE WHEN v_target_type = 'reopen_request' THEN v_target_evidence ELSE NULL END,
    'conversation', CASE WHEN v_target_type = 'user' THEN v_conversation ELSE NULL END
  ));

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
    reopen_request_id,
    evidence_snapshot,
    evidence_captured_at
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
    p_reopen_request_id,
    v_evidence,
    now()
  )
  RETURNING * INTO v_report;

  INSERT INTO public.application_events (application_id, actor_id, event_type, metadata)
  VALUES (
    p_application_id,
    v_user_id,
    'activity_report_created',
    jsonb_build_object(
      'report_id', v_report.id,
      'target_type', v_target_type,
      'target_id', v_target_id,
      'evidence_version', 1
    )
  );

  RETURN jsonb_build_object('ok', true, 'report_id', v_report.id);
END;
$$;

REVOKE ALL ON FUNCTION public.report_activity_item(uuid, text, text, uuid, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_activity_item(uuid, text, text, uuid, uuid, uuid)
  TO authenticated, service_role;
