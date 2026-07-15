BEGIN;

-- The launch waitlist intentionally keeps its historical duplicates. This
-- non-unique expression index only accelerates the normalized idempotency
-- lookup used by join_launch_waitlist.
CREATE INDEX IF NOT EXISTS idx_waitlist_normalized_email
  ON public.waitlist ((lower(btrim(email))));

-- create_job_v2 already schema-qualifies every relation and auth helper it
-- uses. Keep its SECURITY DEFINER execution independent from caller-controlled
-- schemas without changing the function body or its existing privileges.
ALTER FUNCTION public.create_job_v2(
  uuid,
  text,
  text,
  numeric,
  text,
  text,
  public.job_status,
  text,
  text,
  double precision,
  double precision,
  text,
  text,
  text,
  boolean,
  text,
  double precision,
  double precision,
  text
) SET search_path = '';

-- Normalize application lifecycle copy at the notification boundary. The
-- existing delivery trigger still enriches new-application notifications with
-- the applicant's first name and job title after this trigger has run.
CREATE OR REPLACE FUNCTION public.humanize_application_notification_copy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_title_and_body text := lower(
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.body, '')
  );
  v_applicant_name text;
  v_job_title text;
BEGIN
  IF NEW.type = 'application_new'
     AND (
       lower(COALESCE(NEW.data->>'is_primary', 'false')) = 'true'
       OR lower(COALESCE(NEW.title, '')) LIKE '%platz 1%'
       OR v_title_and_body LIKE '%hauptbewerbung%'
     ) THEN
    SELECT
      split_part(
        COALESCE(NULLIF(btrim(profile.full_name), ''), 'Eine Person'),
        ' ',
        1
      ),
      job.title
    INTO v_applicant_name, v_job_title
    FROM public.applications application
    JOIN public.profiles profile ON profile.id = application.user_id
    JOIN public.jobs job ON job.id = application.job_id
    WHERE application.id::text = COALESCE(NEW.data, '{}'::jsonb)->>'application_id';

    NEW.title := 'Neue Bewerbung';
    NEW.body := CASE
      WHEN FOUND THEN
        v_applicant_name || ' hat sich auf „' || v_job_title || '“ beworben. Das Gespräch ist geöffnet.'
      ELSE
        'Eine neue Bewerbung ist eingegangen. Das Gespräch ist geöffnet.'
    END;
  ELSIF NEW.type = 'application_status'
        AND NEW.title IN ('Du bist jetzt auf Platz 1', 'Du bist jetzt im Gespräch') THEN
    NEW.title := 'Gespräch geöffnet';
    NEW.body := 'Deine Bewerbung wurde vorgezogen. Du kannst jetzt schreiben.';
  ELSIF NEW.type = 'application_status'
        AND NEW.title IN ('Du bist nachgerückt', 'Du bist automatisch nachgerückt') THEN
    NEW.title := 'Automatisch nachgerückt';
    NEW.body := 'Deine Bewerbung ist automatisch nachgerückt. Das Gespräch ist geöffnet.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_humanize_application_copy ON public.notifications;
CREATE TRIGGER notifications_humanize_application_copy
BEFORE INSERT OR UPDATE OF type, title, body, data ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.humanize_application_notification_copy();

-- Automatic promotions currently originate in the queue rebalance workflow.
-- Keep its system message concise even when an older workflow version emits
-- the legacy wording.
CREATE OR REPLACE FUNCTION public.humanize_activity_system_message_copy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_content text := lower(COALESCE(NEW.content, ''));
BEGIN
  IF NEW.kind = 'system'
     AND (
       v_content LIKE '%aus der warteliste nachgerückt%'
       OR (
         v_content LIKE '%nachgerückt%'
         AND v_content LIKE '%gespräch%geöffnet%'
       )
     ) THEN
    NEW.content := 'Du bist automatisch nachgerückt. Das Gespräch ist jetzt geöffnet.';
  ELSIF NEW.kind = 'system'
        AND (
          v_content LIKE '%platz 1%'
          OR v_content LIKE '%hauptbewerbung%'
        ) THEN
    NEW.content := 'Gespräch geöffnet. Du kannst jetzt schreiben.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_humanize_activity_copy ON public.messages;
CREATE TRIGGER messages_humanize_activity_copy
BEFORE INSERT OR UPDATE OF content, kind ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.humanize_activity_system_message_copy();

-- Notify the provider whenever the queue automatically opens a conversation
-- for the next applicant. Manual provider promotions have promoted_by set and
-- deliberately do not enter this branch.
CREATE OR REPLACE FUNCTION public.notify_provider_on_automatic_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_provider_id uuid;
  v_job_title text;
  v_dedupe_key text;
BEGIN
  SELECT job.posted_by, job.title
  INTO v_provider_id, v_job_title
  FROM public.jobs job
  WHERE job.id = NEW.job_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_dedupe_key := 'provider:auto-promotion:'
    || NEW.id::text
    || ':'
    || NEW.promoted_at::text;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    category,
    dedupe_key
  ) VALUES (
    v_provider_id,
    'job_status',
    'Automatisch nachgerückt',
    'Für „' || v_job_title || '“ ist die nächste Bewerbung automatisch nachgerückt. Das Gespräch ist geöffnet.',
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || NEW.id::text,
      'application_id', NEW.id,
      'job_id', NEW.job_id,
      'automatic_promotion', true
    ),
    'jobs',
    v_dedupe_key
  )
  ON CONFLICT (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL
  DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_notify_provider_on_automatic_promotion
  ON public.applications;
CREATE TRIGGER applications_notify_provider_on_automatic_promotion
AFTER UPDATE OF status, is_primary, promoted_at, promoted_by
ON public.applications
FOR EACH ROW
WHEN (
  OLD.status = 'waitlisted'::public.application_status
  AND NEW.status = 'negotiating'::public.application_status
  AND NEW.is_primary IS TRUE
  AND NEW.promoted_at IS NOT NULL
  AND NEW.promoted_by IS NULL
)
EXECUTE FUNCTION public.notify_provider_on_automatic_promotion();

-- Normalize only clearly identified historical application notifications.
-- IDs, routes, read state and timestamps remain unchanged.
UPDATE public.notifications notification
SET title = 'Neue Bewerbung',
    body = COALESCE(
      (
        SELECT
          split_part(
            COALESCE(NULLIF(btrim(profile.full_name), ''), 'Eine Person'),
            ' ',
            1
          )
          || ' hat sich auf „'
          || job.title
          || '“ beworben. Das Gespräch ist geöffnet.'
        FROM public.applications application
        JOIN public.profiles profile ON profile.id = application.user_id
        JOIN public.jobs job ON job.id = application.job_id
        WHERE application.id::text = COALESCE(notification.data, '{}'::jsonb)->>'application_id'
        LIMIT 1
      ),
      'Eine neue Bewerbung ist eingegangen. Das Gespräch ist geöffnet.'
    )
WHERE notification.type = 'application_new'
  AND (
    lower(COALESCE(notification.title, '')) LIKE '%platz 1%'
    OR lower(COALESCE(notification.body, '')) LIKE '%hauptbewerbung%'
  );

UPDATE public.notifications notification
SET title = 'Gespräch geöffnet',
    body = 'Deine Bewerbung wurde vorgezogen. Du kannst jetzt schreiben.'
WHERE notification.type = 'application_status'
  AND notification.title IN ('Du bist jetzt auf Platz 1', 'Du bist jetzt im Gespräch');

UPDATE public.notifications notification
SET title = 'Automatisch nachgerückt',
    body = 'Deine Bewerbung ist automatisch nachgerückt. Das Gespräch ist geöffnet.'
WHERE notification.type = 'application_status'
  AND notification.title IN ('Du bist nachgerückt', 'Du bist automatisch nachgerückt');

UPDATE public.messages message
SET content = CASE
  WHEN lower(message.content) LIKE '%nachgerückt%'
    THEN 'Du bist automatisch nachgerückt. Das Gespräch ist jetzt geöffnet.'
  ELSE 'Gespräch geöffnet. Du kannst jetzt schreiben.'
END
WHERE message.kind = 'system'
  AND (
    lower(message.content) LIKE '%aus der warteliste nachgerückt%'
    OR (
      lower(message.content) LIKE '%nachgerückt%'
      AND lower(message.content) LIKE '%gespräch%geöffnet%'
    )
    OR lower(message.content) LIKE '%platz 1%'
    OR lower(message.content) LIKE '%hauptbewerbung%'
  );

REVOKE ALL ON FUNCTION public.humanize_application_notification_copy()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.humanize_activity_system_message_copy()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notify_provider_on_automatic_promotion()
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
