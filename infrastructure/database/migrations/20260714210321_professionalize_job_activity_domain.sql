-- JobBridge Activities domain v2
-- Additive, data-preserving migration for deterministic queues, reversible
-- conversation closure, recurring engagements, appointments and reporting.

-- Existing timestamp columns were created without a timezone even though the
-- database stores UTC. Convert them explicitly so browser rendering is stable.
DROP VIEW IF EXISTS public.admin_recent_activity;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'created_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE public.applications
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'created_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE public.jobs
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END;
$$;

CREATE VIEW public.admin_recent_activity
WITH (security_invoker = true)
AS
SELECT *
FROM (
  SELECT
    'user_register'::text AS type,
    'New User: ' || COALESCE(p.full_name, 'Unknown') AS title,
    NULL::text AS subtitle,
    p.created_at,
    p.id::text AS reference_id,
    '/admin/users/' || p.id::text AS link
  FROM public.profiles p
  UNION ALL
  SELECT
    'job_posted'::text,
    'New Job: ' || j.title,
    COALESCE(j.public_location_label, 'No location'),
    j.created_at,
    j.id::text,
    '/admin/jobs/' || j.id::text
  FROM public.jobs j
  UNION ALL
  SELECT
    'application'::text,
    'New Application'::text,
    a.status::text,
    a.created_at,
    a.id::text,
    '/admin/applications/' || a.id::text
  FROM public.applications a
) activity
ORDER BY created_at DESC
LIMIT 50;

REVOKE ALL ON TABLE public.admin_recent_activity FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_recent_activity TO service_role;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_kind text NOT NULL DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS continuity_preferred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_job_kind_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_job_kind_check
      CHECK (job_kind IN ('one_time', 'recurring'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_recurrence_rule_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_recurrence_rule_check
      CHECK (
        recurrence_rule IS NULL
        OR recurrence_rule IN ('weekly', 'biweekly', 'monthly', 'flexible')
      );
  END IF;
END;
$$;

-- The product follows a transparent first-come queue. Keep the existing enum
-- for compatibility, but make its stored value match the actual product rule.
ALTER TABLE public.jobs
  ALTER COLUMN hiring_mode SET DEFAULT 'first_come'::public.hiring_mode;

UPDATE public.jobs
SET hiring_mode = 'first_come'::public.hiring_mode
WHERE hiring_mode = 'open_pool'::public.hiring_mode;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS queue_position integer,
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conversation_state text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS closed_by uuid,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_reason text,
  ADD COLUMN IF NOT EXISTS close_action text,
  ADD COLUMN IF NOT EXISTS closed_from_status public.application_status,
  ADD COLUMN IF NOT EXISTS was_primary_before_close boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closure_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_by uuid,
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS promoted_by uuid,
  ADD COLUMN IF NOT EXISTS promotion_reason text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_conversation_state_check'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_conversation_state_check
      CHECK (conversation_state IN ('open', 'closed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_close_action_check'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_close_action_check
      CHECK (
        close_action IS NULL
        OR close_action IN (
          'provider_rejected',
          'seeker_withdrew',
          'job_assigned',
          'engagement_completed',
          'engagement_cancelled'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_queue_position_check'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_queue_position_check
      CHECK (queue_position IS NULL OR queue_position > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_closure_version_check'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_closure_version_check
      CHECK (closure_version >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_closed_by_fkey'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_closed_by_fkey
      FOREIGN KEY (closed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_reopened_by_fkey'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_reopened_by_fkey
      FOREIGN KEY (reopened_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_promoted_by_fkey'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_promoted_by_fkey
      FOREIGN KEY (promoted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END;
$$;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS client_nonce uuid,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_kind_check'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_kind_check
      CHECK (kind IN ('application', 'chat', 'system'));
  END IF;
END;
$$;

UPDATE public.messages
SET created_at = now()
WHERE created_at IS NULL;

ALTER TABLE public.messages
  ALTER COLUMN created_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_reopen_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  closure_version integer NOT NULL,
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  response_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT conversation_reopen_requests_status_check
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  CONSTRAINT conversation_reopen_requests_participants_check
    CHECK (requested_by <> recipient_id),
  CONSTRAINT conversation_reopen_requests_message_check
    CHECK (char_length(btrim(message)) BETWEEN 10 AND 500),
  CONSTRAINT conversation_reopen_requests_one_per_closure
    UNIQUE (application_id, closure_version, requested_by)
);

CREATE TABLE IF NOT EXISTS public.job_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seeker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  engagement_type text NOT NULL DEFAULT 'one_time',
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  closed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  close_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_engagements_type_check
    CHECK (engagement_type IN ('one_time', 'recurring')),
  CONSTRAINT job_engagements_status_check
    CHECK (status IN ('active', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.job_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.job_engagements(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'Europe/Berlin',
  note text,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  legacy_agreement_id uuid UNIQUE REFERENCES public.job_agreements(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_appointments_status_check
    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  CONSTRAINT job_appointments_time_range_check
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS application_id uuid,
  ADD COLUMN IF NOT EXISTS reported_user_id uuid,
  ADD COLUMN IF NOT EXISTS message_id uuid,
  ADD COLUMN IF NOT EXISTS reopen_request_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_application_id_fkey'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_application_id_fkey
      FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_reported_user_id_fkey'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_reported_user_id_fkey
      FOREIGN KEY (reported_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_message_id_fkey'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_message_id_fkey
      FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_reopen_request_id_fkey'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_reopen_request_id_fkey
      FOREIGN KEY (reopen_request_id) REFERENCES public.conversation_reopen_requests(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_applications_job_queue
  ON public.applications(job_id, is_primary DESC, queue_position, created_at, id);
CREATE INDEX IF NOT EXISTS idx_applications_last_activity
  ON public.applications(last_activity_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_messages_application_timeline
  ON public.messages(application_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_one_primary_per_job
  ON public.applications(job_id)
  WHERE is_primary AND status IN ('submitted', 'negotiating', 'accepted');
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_application_message_once
  ON public.messages(application_id)
  WHERE kind = 'application';
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_sender_nonce
  ON public.messages(sender_id, client_nonce)
  WHERE client_nonce IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_application_events_timeline
  ON public.application_events(application_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_reopen_requests_application
  ON public.conversation_reopen_requests(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reopen_requests_recipient_pending
  ON public.conversation_reopen_requests(recipient_id, created_at DESC)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_job_engagements_participants
  ON public.job_engagements(provider_id, seeker_id, status);
CREATE INDEX IF NOT EXISTS idx_job_engagements_job_status
  ON public.job_engagements(job_id, status);
CREATE INDEX IF NOT EXISTS idx_job_appointments_engagement_schedule
  ON public.job_appointments(engagement_id, starts_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_reports_application_created
  ON public.reports(application_id, created_at DESC)
  WHERE application_id IS NOT NULL;

-- Preserve the original application text as the first, immutable timeline item.
INSERT INTO public.messages (application_id, sender_id, content, created_at, kind)
SELECT a.id, a.user_id, btrim(a.message), a.created_at, 'application'
FROM public.applications a
WHERE nullif(btrim(a.message), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.application_id = a.id
      AND m.kind = 'application'
  );

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY job_id ORDER BY created_at, id) AS position
  FROM public.applications
)
UPDATE public.applications a
SET queue_position = ranked.position
FROM ranked
WHERE a.id = ranked.id
  AND a.queue_position IS NULL;

UPDATE public.applications a
SET conversation_state = 'closed',
    closed_at = COALESCE(
      a.closed_at,
      (SELECT max(m.created_at) FROM public.messages m WHERE m.application_id = a.id),
      a.created_at
    ),
    closed_reason = COALESCE(a.closed_reason, a.rejection_reason),
    close_action = COALESCE(
      a.close_action,
      CASE a.status
        WHEN 'rejected' THEN 'provider_rejected'
        WHEN 'auto_rejected' THEN 'job_assigned'
        WHEN 'withdrawn' THEN 'seeker_withdrew'
        WHEN 'completed' THEN 'engagement_completed'
        WHEN 'cancelled' THEN 'engagement_cancelled'
        ELSE NULL
      END
    ),
    closed_by = COALESCE(
      a.closed_by,
      CASE
        WHEN a.status = 'withdrawn' THEN a.user_id
        WHEN a.status IN ('rejected', 'completed', 'cancelled') THEN j.posted_by
        ELSE NULL
      END
    ),
    closure_version = GREATEST(a.closure_version, 1)
FROM public.jobs j
WHERE j.id = a.job_id
  AND a.status IN ('rejected', 'auto_rejected', 'withdrawn', 'completed', 'cancelled');

WITH ranked_active AS (
  SELECT
    id,
    job_id,
    row_number() OVER (
      PARTITION BY job_id
      ORDER BY
        CASE status WHEN 'accepted' THEN 0 ELSE 1 END,
        created_at,
        id
    ) AS rank
  FROM public.applications
  WHERE status IN ('accepted', 'negotiating', 'submitted')
), normalized AS (
  UPDATE public.applications a
  SET status = CASE WHEN ranked_active.rank = 1 THEN a.status ELSE 'waitlisted'::public.application_status END,
      is_primary = ranked_active.rank = 1,
      conversation_state = 'open',
      updated_at = now()
  FROM ranked_active
  WHERE a.id = ranked_active.id
  RETURNING a.id, a.job_id, ranked_active.rank
)
INSERT INTO public.application_events (application_id, event_type, metadata)
SELECT id, 'migration_queue_normalized', jsonb_build_object('rank', rank, 'job_id', job_id)
FROM normalized
WHERE rank > 1;

WITH reserved_candidates AS (
  SELECT DISTINCT ON (a.job_id)
    a.id,
    a.job_id
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE j.status = 'reserved'
    AND a.status = 'waitlisted'
    AND a.conversation_state = 'open'
    AND NOT EXISTS (
      SELECT 1
      FROM public.applications active
      WHERE active.job_id = a.job_id
        AND active.is_primary
        AND active.status IN ('submitted', 'negotiating', 'accepted')
    )
  ORDER BY a.job_id, a.queue_position, a.created_at, a.id
), promoted AS (
  UPDATE public.applications a
  SET status = 'negotiating',
      is_primary = true,
      promoted_at = now(),
      promotion_reason = 'Bestandsdaten automatisch auf Platz 1 normalisiert.',
      updated_at = now()
  FROM reserved_candidates c
  WHERE a.id = c.id
  RETURNING a.id, a.job_id
)
INSERT INTO public.application_events (application_id, event_type, reason, metadata)
SELECT id, 'migration_primary_restored', 'Bestandsdaten automatisch auf Platz 1 normalisiert.', jsonb_build_object('job_id', job_id)
FROM promoted;

UPDATE public.jobs j
SET status = 'reserved',
    filled_by = NULL,
    filled_at = NULL,
    updated_at = now()
WHERE j.status IN ('open', 'reviewing')
  AND EXISTS (
    SELECT 1
    FROM public.applications a
    WHERE a.job_id = j.id
      AND a.is_primary
      AND a.conversation_state = 'open'
      AND a.status IN ('submitted', 'negotiating')
  );

UPDATE public.jobs j
SET status = 'open',
    updated_at = now()
WHERE j.status = 'reserved'
  AND NOT EXISTS (
    SELECT 1
    FROM public.applications a
    WHERE a.job_id = j.id
      AND a.conversation_state = 'open'
      AND a.status IN ('submitted', 'negotiating', 'accepted', 'waitlisted')
  );

UPDATE public.applications a
SET last_activity_at = GREATEST(
      a.created_at,
      COALESCE((
        SELECT max(m.created_at)
        FROM public.messages m
        WHERE m.application_id = a.id
      ), a.created_at),
      COALESCE(a.closed_at, a.created_at),
      COALESCE(a.reopened_at, a.created_at),
      COALESCE(a.promoted_at, a.created_at)
    ),
    updated_at = GREATEST(
      a.created_at,
      COALESCE((
        SELECT max(m.created_at)
        FROM public.messages m
        WHERE m.application_id = a.id
      ), a.created_at),
      COALESCE(a.closed_at, a.created_at),
      COALESCE(a.reopened_at, a.created_at),
      COALESCE(a.promoted_at, a.created_at)
    );

ALTER TABLE public.applications
  ALTER COLUMN queue_position SET NOT NULL,
  ALTER COLUMN last_activity_at SET NOT NULL;

INSERT INTO public.job_engagements (
  application_id,
  job_id,
  provider_id,
  seeker_id,
  engagement_type,
  status,
  started_at,
  completed_at,
  cancelled_at,
  created_at,
  updated_at
)
SELECT
  ja.application_id,
  ja.job_id,
  ja.provider_id,
  ja.seeker_id,
  COALESCE(j.job_kind, 'one_time'),
  CASE ja.status
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'active'
  END,
  ja.created_at,
  CASE WHEN ja.status = 'completed' THEN ja.updated_at ELSE NULL END,
  CASE WHEN ja.status = 'cancelled' THEN ja.updated_at ELSE NULL END,
  ja.created_at,
  ja.updated_at
FROM public.job_agreements ja
JOIN public.jobs j ON j.id = ja.job_id
ON CONFLICT (application_id) DO NOTHING;

INSERT INTO public.job_appointments (
  engagement_id,
  starts_at,
  ends_at,
  timezone,
  note,
  status,
  created_by,
  legacy_agreement_id,
  created_at,
  updated_at
)
SELECT
  e.id,
  ja.starts_at,
  ja.ends_at,
  ja.timezone,
  ja.note,
  CASE ja.status
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'scheduled'
  END,
  ja.provider_id,
  ja.id,
  ja.created_at,
  ja.updated_at
FROM public.job_agreements ja
JOIN public.job_engagements e ON e.application_id = ja.application_id
ON CONFLICT (legacy_agreement_id) DO NOTHING;

ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reopen_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_appointments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_application_participant(
  p_application_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
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
    WHERE a.id = p_application_id
      AND (a.user_id = p_user_id OR j.posted_by = p_user_id)
  );
$$;

DROP POLICY IF EXISTS "Participants can view application events" ON public.application_events;
CREATE POLICY "Participants can view application events"
  ON public.application_events
  FOR SELECT
  TO authenticated
  USING (public.is_application_participant(application_id));

DROP POLICY IF EXISTS "Participants can view reopen requests" ON public.conversation_reopen_requests;
CREATE POLICY "Participants can view reopen requests"
  ON public.conversation_reopen_requests
  FOR SELECT
  TO authenticated
  USING (public.is_application_participant(application_id));

DROP POLICY IF EXISTS "Participants can view engagements" ON public.job_engagements;
CREATE POLICY "Participants can view engagements"
  ON public.job_engagements
  FOR SELECT
  TO authenticated
  USING (provider_id = (SELECT auth.uid()) OR seeker_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Participants can view appointments" ON public.job_appointments;
CREATE POLICY "Participants can view appointments"
  ON public.job_appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.job_engagements e
      WHERE e.id = engagement_id
        AND (e.provider_id = (SELECT auth.uid()) OR e.seeker_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (reporter_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "applications_insert" ON public.applications;
DROP POLICY IF EXISTS "Users can insert messages for their applications" ON public.messages;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.applications FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.messages FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.reports FROM anon, authenticated;

REVOKE ALL ON TABLE public.application_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.conversation_reopen_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.job_engagements FROM anon, authenticated;
REVOKE ALL ON TABLE public.job_appointments FROM anon, authenticated;

GRANT SELECT ON TABLE public.applications TO authenticated;
GRANT SELECT ON TABLE public.messages TO authenticated;
GRANT SELECT ON TABLE public.reports TO authenticated;
GRANT SELECT ON TABLE public.application_events TO authenticated;
GRANT SELECT ON TABLE public.conversation_reopen_requests TO authenticated;
GRANT SELECT ON TABLE public.job_engagements TO authenticated;
GRANT SELECT ON TABLE public.job_appointments TO authenticated;

GRANT ALL ON TABLE public.application_events TO service_role;
GRANT ALL ON TABLE public.conversation_reopen_requests TO service_role;
GRANT ALL ON TABLE public.job_engagements TO service_role;
GRANT ALL ON TABLE public.job_appointments TO service_role;

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_application_activity_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  IF ROW(
    NEW.status,
    NEW.conversation_state,
    NEW.is_primary,
    NEW.closed_at,
    NEW.reopened_at,
    NEW.promoted_at
  ) IS DISTINCT FROM ROW(
    OLD.status,
    OLD.conversation_state,
    OLD.is_primary,
    OLD.closed_at,
    OLD.reopened_at,
    OLD.promoted_at
  ) THEN
    NEW.last_activity_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_application_from_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  UPDATE public.applications
  SET last_activity_at = GREATEST(last_activity_at, COALESCE(NEW.created_at, now())),
      updated_at = now()
  WHERE id = NEW.application_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_application_from_reopen_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  UPDATE public.applications
  SET last_activity_at = GREATEST(last_activity_at, COALESCE(NEW.created_at, now())),
      updated_at = now()
  WHERE id = NEW.application_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_set_activity_timestamp ON public.applications;
CREATE TRIGGER applications_set_activity_timestamp
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_application_activity_timestamp();

DROP TRIGGER IF EXISTS messages_touch_application ON public.messages;
CREATE TRIGGER messages_touch_application
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_application_from_message();

DROP TRIGGER IF EXISTS reopen_requests_touch_application ON public.conversation_reopen_requests;
CREATE TRIGGER reopen_requests_touch_application
  AFTER INSERT ON public.conversation_reopen_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_application_from_reopen_request();

DROP TRIGGER IF EXISTS job_engagements_set_updated_at ON public.job_engagements;
CREATE TRIGGER job_engagements_set_updated_at
  BEFORE UPDATE ON public.job_engagements
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS job_appointments_set_updated_at ON public.job_appointments;
CREATE TRIGGER job_appointments_set_updated_at
  BEFORE UPDATE ON public.job_appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

REVOKE EXECUTE ON FUNCTION public.is_application_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_application_participant(uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.set_row_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_application_activity_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_application_from_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_application_from_reopen_request() FROM PUBLIC, anon, authenticated;

-- Internal lifecycle helpers -------------------------------------------------

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

  SELECT a.id, a.user_id
  INTO v_candidate
  FROM public.applications a
  WHERE a.job_id = p_job_id
    AND a.status = 'waitlisted'
    AND a.conversation_state = 'open'
  ORDER BY a.queue_position, a.created_at, a.id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.applications
    SET status = 'negotiating',
        is_primary = true,
        promoted_at = now(),
        promoted_by = NULL,
        promotion_reason = 'Automatisch nach frei gewordenem Platz nachgerückt.',
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
      'Automatisch nach frei gewordenem Platz nachgerückt.',
      jsonb_build_object('job_id', p_job_id)
    );

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_candidate.user_id,
      'application_status',
      'Du bist jetzt auf Platz 1',
      'Der Platz im Gespräch ist frei geworden. Du kannst den Chat jetzt nutzen.',
      jsonb_build_object(
        'route', '/app-home/activities?conversation=' || v_candidate.id::text,
        'application_id', v_candidate.id,
        'job_id', p_job_id
      )
    );

    RETURN jsonb_build_object('ok', true, 'action', 'promoted', 'application_id', v_candidate.id);
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

  UPDATE public.job_appointments appt
  SET status = 'cancelled',
      updated_at = now()
  FROM public.job_engagements engagement
  WHERE engagement.application_id = p_application_id
    AND appt.engagement_id = engagement.id
    AND appt.status = 'scheduled';

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
    PERFORM public._activity_rebalance_job(v_app.job_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'job_id', v_app.job_id,
    'job_title', v_app.title,
    'seeker_id', v_app.user_id,
    'provider_id', v_app.posted_by,
    'was_primary', v_app.is_primary
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._activity_reopen_application(
  p_application_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_app record;
  v_has_other_primary boolean;
  v_new_status public.application_status;
  v_new_primary boolean;
BEGIN
  SELECT
    a.*,
    j.posted_by,
    j.title AS job_title,
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
  IF v_app.conversation_state = 'open' THEN
    RETURN jsonb_build_object('ok', true, 'unchanged', true, 'application', to_jsonb(v_app));
  END IF;
  IF v_app.closed_by IS DISTINCT FROM p_actor_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nur die Person, die das Gespräch geschlossen hat, kann es wieder öffnen.');
  END IF;
  IF v_app.close_action NOT IN ('provider_rejected', 'seeker_withdrew', 'engagement_completed', 'engagement_cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Diese Schließung kann nicht rückgängig gemacht werden.');
  END IF;
  IF v_app.filled_by IS NOT NULL AND v_app.filled_by <> v_app.user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Job ist inzwischen verbindlich anderweitig vergeben.');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.applications other
    WHERE other.job_id = v_app.job_id
      AND other.id <> p_application_id
      AND other.is_primary
      AND other.conversation_state = 'open'
      AND other.status IN ('submitted', 'negotiating', 'accepted')
  ) INTO v_has_other_primary;

  IF v_app.close_action = 'engagement_completed' THEN
    IF v_has_other_primary THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Der Platz ist inzwischen anderweitig belegt.');
    END IF;

    UPDATE public.job_engagements
    SET status = 'active',
        completed_at = NULL,
        cancelled_at = NULL,
        closed_by = NULL,
        close_reason = NULL,
        updated_at = now()
    WHERE application_id = p_application_id;

    v_new_status := 'accepted';
    v_new_primary := true;
  ELSIF v_app.filled_by = v_app.user_id THEN
    v_new_status := 'accepted';
    v_new_primary := true;
  ELSIF NOT v_has_other_primary THEN
    v_new_status := 'negotiating';
    v_new_primary := true;
  ELSE
    v_new_status := 'waitlisted';
    v_new_primary := false;
  END IF;

  UPDATE public.applications
  SET status = v_new_status,
      conversation_state = 'open',
      is_primary = v_new_primary,
      rejection_reason = NULL,
      reopened_at = now(),
      reopened_by = p_actor_id,
      closed_by = NULL,
      closed_at = NULL,
      closed_reason = NULL,
      close_action = NULL,
      closed_from_status = NULL,
      was_primary_before_close = false,
      updated_at = now()
  WHERE id = p_application_id;

  IF v_new_status = 'accepted' THEN
    UPDATE public.jobs
    SET status = 'filled',
        filled_by = v_app.user_id,
        filled_at = COALESCE(filled_at, now()),
        completed_at = NULL,
        updated_at = now()
    WHERE id = v_app.job_id;
  ELSIF v_new_primary THEN
    UPDATE public.jobs
    SET status = 'reserved',
        filled_by = NULL,
        filled_at = NULL,
        completed_at = NULL,
        updated_at = now()
    WHERE id = v_app.job_id;
  END IF;

  UPDATE public.conversation_reopen_requests
  SET status = 'accepted',
      resolved_at = now(),
      resolved_by = p_actor_id
  WHERE application_id = p_application_id
    AND closure_version = v_app.closure_version
    AND recipient_id = p_actor_id
    AND status = 'pending';

  INSERT INTO public.application_events (application_id, actor_id, event_type, metadata)
  VALUES (
    p_application_id,
    p_actor_id,
    'conversation_reopened',
    jsonb_build_object(
      'previous_action', v_app.close_action,
      'restored_status', v_new_status,
      'restored_as_primary', v_new_primary,
      'closure_version', v_app.closure_version
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'application_id', p_application_id,
    'job_id', v_app.job_id,
    'job_title', v_app.job_title,
    'seeker_id', v_app.user_id,
    'provider_id', v_app.posted_by,
    'status', v_new_status,
    'is_primary', v_new_primary
  );
END;
$$;

-- Public application and messaging API --------------------------------------

CREATE OR REPLACE FUNCTION public.submit_job_application(
  p_job_id uuid,
  p_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_message_text text := btrim(COALESCE(p_message, ''));
  v_job public.jobs%ROWTYPE;
  v_queue_position integer;
  v_is_primary boolean;
  v_status public.application_status;
  v_application public.applications%ROWTYPE;
  v_message public.messages%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;
  IF char_length(v_message_text) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bitte schreibe eine kurze Bewerbungsnachricht.');
  END IF;
  IF char_length(v_message_text) > 1200 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Die Bewerbungsnachricht darf höchstens 1.200 Zeichen lang sein.');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_user_id
      AND p.account_type::text = 'job_seeker'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nur Jobsuchende können sich bewerben.');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guardian_relationships relationship
    WHERE relationship.child_id = v_user_id
      AND relationship.status = 'active'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Vor der Bewerbung fehlt die aktive Elternbestätigung.');
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Job nicht gefunden.');
  END IF;
  IF v_job.posted_by = v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Du kannst dich nicht auf deinen eigenen Job bewerben.');
  END IF;
  IF v_job.status NOT IN ('open', 'reserved') OR (v_job.expires_at IS NOT NULL AND v_job.expires_at <= now()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dieser Job nimmt derzeit keine Bewerbungen an.');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.job_id = p_job_id AND a.user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Du hast dich bereits auf diesen Job beworben. Öffne die Bewerbung unter Aktivitäten.');
  END IF;

  SELECT COALESCE(max(a.queue_position), 0) + 1
  INTO v_queue_position
  FROM public.applications a
  WHERE a.job_id = p_job_id;

  SELECT NOT EXISTS (
    SELECT 1
    FROM public.applications a
    WHERE a.job_id = p_job_id
      AND a.is_primary
      AND a.conversation_state = 'open'
      AND a.status IN ('submitted', 'negotiating', 'accepted')
  ) INTO v_is_primary;

  v_status := CASE WHEN v_is_primary THEN 'negotiating'::public.application_status ELSE 'waitlisted'::public.application_status END;

  INSERT INTO public.applications (
    job_id,
    user_id,
    message,
    status,
    queue_position,
    is_primary,
    conversation_state,
    last_activity_at,
    updated_at
  ) VALUES (
    p_job_id,
    v_user_id,
    v_message_text,
    v_status,
    v_queue_position,
    v_is_primary,
    'open',
    now(),
    now()
  )
  RETURNING * INTO v_application;

  INSERT INTO public.messages (application_id, sender_id, content, kind)
  VALUES (v_application.id, v_user_id, v_message_text, 'application')
  RETURNING * INTO v_message;

  IF v_is_primary THEN
    UPDATE public.jobs
    SET status = 'reserved',
        hiring_mode = 'first_come',
        updated_at = now()
    WHERE id = p_job_id;
  END IF;

  INSERT INTO public.application_events (application_id, actor_id, event_type, metadata)
  VALUES (
    v_application.id,
    v_user_id,
    'application_submitted',
    jsonb_build_object(
      'queue_position', v_queue_position,
      'is_primary', v_is_primary,
      'job_id', p_job_id
    )
  );

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_job.posted_by,
    'application_new',
    CASE WHEN v_is_primary THEN 'Neue Bewerbung auf Platz 1' ELSE 'Neuer Wartelisten-Eintrag' END,
    CASE
      WHEN v_is_primary THEN 'Für „' || v_job.title || '“ ist eine neue Hauptbewerbung eingegangen.'
      ELSE 'Für „' || v_job.title || '“ ist eine weitere Bewerbung auf Wartelistenplatz ' || v_queue_position::text || ' eingegangen.'
    END,
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || v_application.id::text,
      'application_id', v_application.id,
      'job_id', p_job_id,
      'queue_position', v_queue_position,
      'is_primary', v_is_primary
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'application', to_jsonb(v_application),
    'message', to_jsonb(v_message),
    'queue_position', v_queue_position,
    'is_primary', v_is_primary
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Du hast dich bereits auf diesen Job beworben.');
END;
$$;

DROP FUNCTION IF EXISTS public.send_application_message(uuid, text);

CREATE FUNCTION public.send_application_message(
  p_application_id uuid,
  p_content text,
  p_client_nonce uuid DEFAULT NULL
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
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;
  IF char_length(v_content) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nachricht darf nicht leer sein.');
  END IF;
  IF char_length(v_content) > 1200 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Die Nachricht darf höchstens 1.200 Zeichen lang sein.');
  END IF;

  SELECT
    a.id,
    a.user_id,
    a.status,
    a.job_id,
    a.is_primary,
    a.conversation_state,
    j.posted_by,
    j.title
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
  IF v_app.conversation_state <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dieses Gespräch ist geschlossen.');
  END IF;
  IF NOT v_app.is_primary OR v_app.status = 'waitlisted' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Auf der Warteliste ist nur die Bewerbungsnachricht möglich. Der Chat wird auf Platz 1 freigeschaltet.');
  END IF;
  IF v_app.status NOT IN ('submitted', 'negotiating', 'accepted') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dieses Gespräch ist nicht für neue Nachrichten geöffnet.');
  END IF;

  IF p_client_nonce IS NOT NULL THEN
    SELECT * INTO v_message
    FROM public.messages
    WHERE sender_id = v_user_id
      AND client_nonce = p_client_nonce;

    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'message', to_jsonb(v_message), 'unchanged', true);
    END IF;
  END IF;

  IF v_user_id = v_app.posted_by AND v_app.status = 'submitted' THEN
    UPDATE public.applications
    SET status = 'negotiating', updated_at = now()
    WHERE id = p_application_id;
  END IF;

  INSERT INTO public.messages (application_id, sender_id, content, kind, client_nonce)
  VALUES (p_application_id, v_user_id, v_content, 'chat', p_client_nonce)
  RETURNING * INTO v_message;

  v_recipient_id := CASE WHEN v_user_id = v_app.user_id THEN v_app.posted_by ELSE v_app.user_id END;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_recipient_id,
    'message',
    'Neue Nachricht zu „' || v_app.title || '“',
    CASE WHEN v_user_id = v_app.user_id
      THEN 'Du hast eine neue Nachricht von einem Bewerber erhalten.'
      ELSE 'Du hast eine neue Nachricht von einem Anbieter erhalten.'
    END,
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
  v_updated_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;
  IF NOT public.is_application_participant(p_application_id, v_user_id) THEN
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
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;
  IF char_length(v_reason) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bitte gib einen nachvollziehbaren Grund an.');
  END IF;
  IF char_length(v_reason) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Grund darf höchstens 500 Zeichen lang sein.');
  END IF;

  SELECT a.status, a.conversation_state, a.closed_by, a.close_action, j.posted_by
  INTO v_app
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bewerbung nicht gefunden.');
  END IF;
  IF v_app.posted_by <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nur der Anbieter kann diese Bewerbung ablehnen.');
  END IF;
  IF v_app.status = 'rejected'
     AND v_app.conversation_state = 'closed'
     AND v_app.closed_by = v_user_id
     AND v_app.close_action = 'provider_rejected' THEN
    RETURN jsonb_build_object('ok', true, 'unchanged', true);
  END IF;
  IF v_app.status NOT IN ('submitted', 'negotiating', 'waitlisted', 'accepted')
     OR v_app.conversation_state <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Diese Bewerbung kann nicht abgelehnt werden.');
  END IF;

  v_result := public._activity_close_application(
    p_application_id,
    v_user_id,
    'provider_rejected',
    v_reason,
    'rejected'
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RETURN v_result;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    (v_result->>'seeker_id')::uuid,
    'application_status',
    'Bewerbung abgelehnt',
    'Deine Bewerbung wurde geschlossen. Grund: ' || v_reason,
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || p_application_id::text,
      'application_id', p_application_id,
      'job_id', (v_result->>'job_id')::uuid
    )
  );

  RETURN v_result;
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
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;
  IF char_length(v_reason) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Grund darf höchstens 500 Zeichen lang sein.');
  END IF;

  SELECT a.user_id, a.status, a.conversation_state, a.closed_by, a.close_action
  INTO v_app
  FROM public.applications a
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

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    (v_result->>'provider_id')::uuid,
    'application_status',
    'Bewerbung zurückgezogen',
    'Eine Bewerbung wurde zurückgezogen. Grund: ' || v_reason,
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || p_application_id::text,
      'application_id', p_application_id,
      'job_id', (v_result->>'job_id')::uuid
    )
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_application(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_recipient_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;

  v_result := public._activity_reopen_application(p_application_id, v_user_id);
  IF NOT COALESCE((v_result->>'ok')::boolean, false)
     OR COALESCE((v_result->>'unchanged')::boolean, false) THEN
    RETURN v_result;
  END IF;

  v_recipient_id := CASE
    WHEN v_user_id = (v_result->>'provider_id')::uuid THEN (v_result->>'seeker_id')::uuid
    ELSE (v_result->>'provider_id')::uuid
  END;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_recipient_id,
    'application_status',
    'Gespräch wieder geöffnet',
    'Das Gespräch zu „' || COALESCE(v_result->>'job_title', 'deinem Job') || '“ ist wieder geöffnet.',
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || p_application_id::text,
      'application_id', p_application_id,
      'job_id', (v_result->>'job_id')::uuid
    )
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_conversation_reopen(
  p_application_id uuid,
  p_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_message text := btrim(COALESCE(p_message, ''));
  v_app record;
  v_request public.conversation_reopen_requests%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;
  IF char_length(v_message) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bitte beschreibe die Anfrage in mindestens 10 Zeichen.');
  END IF;
  IF char_length(v_message) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Die Anfrage darf höchstens 500 Zeichen lang sein.');
  END IF;

  SELECT
    a.id,
    a.user_id,
    a.job_id,
    a.conversation_state,
    a.closed_by,
    a.close_action,
    a.closure_version,
    j.posted_by,
    j.title
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
  IF v_app.conversation_state <> 'closed' OR v_app.closed_by IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Für dieses Gespräch ist keine Öffnungsanfrage möglich.');
  END IF;
  IF v_user_id = v_app.closed_by THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Du kannst das Gespräch direkt wieder öffnen.');
  END IF;
  IF v_app.close_action NOT IN ('provider_rejected', 'seeker_withdrew', 'engagement_completed', 'engagement_cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Diese systemseitige Schließung kann nicht angefragt werden.');
  END IF;

  INSERT INTO public.conversation_reopen_requests (
    application_id,
    closure_version,
    requested_by,
    recipient_id,
    message
  ) VALUES (
    p_application_id,
    v_app.closure_version,
    v_user_id,
    v_app.closed_by,
    v_message
  )
  RETURNING * INTO v_request;

  INSERT INTO public.application_events (application_id, actor_id, event_type, reason, metadata)
  VALUES (
    p_application_id,
    v_user_id,
    'conversation_reopen_requested',
    v_message,
    jsonb_build_object('request_id', v_request.id, 'closure_version', v_app.closure_version)
  );

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_app.closed_by,
    'message',
    'Anfrage zum geschlossenen Gespräch',
    'Du hast eine einmalige Öffnungsanfrage zu „' || v_app.title || '“ erhalten.',
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || p_application_id::text,
      'application_id', p_application_id,
      'job_id', v_app.job_id,
      'reopen_request_id', v_request.id
    )
  );

  RETURN jsonb_build_object('ok', true, 'request', to_jsonb(v_request));
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Für diese Schließung wurde bereits eine Anfrage gesendet.');
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_conversation_reopen_request(
  p_request_id uuid,
  p_accept boolean,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_reason text := NULLIF(btrim(p_reason), '');
  v_request public.conversation_reopen_requests%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;
  IF char_length(COALESCE(v_reason, '')) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Die Antwort darf höchstens 500 Zeichen lang sein.');
  END IF;

  SELECT * INTO v_request
  FROM public.conversation_reopen_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Anfrage nicht gefunden.');
  END IF;
  IF v_request.recipient_id <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nur der Empfänger kann diese Anfrage beantworten.');
  END IF;
  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Diese Anfrage wurde bereits beantwortet.');
  END IF;

  IF p_accept THEN
    v_result := public._activity_reopen_application(v_request.application_id, v_user_id);
    IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
      RETURN v_result;
    END IF;
  ELSE
    UPDATE public.conversation_reopen_requests
    SET status = 'declined',
        response_reason = v_reason,
        resolved_at = now(),
        resolved_by = v_user_id
    WHERE id = p_request_id;

    INSERT INTO public.application_events (application_id, actor_id, event_type, reason, metadata)
    VALUES (
      v_request.application_id,
      v_user_id,
      'conversation_reopen_declined',
      v_reason,
      jsonb_build_object('request_id', p_request_id, 'closure_version', v_request.closure_version)
    );

    v_result := jsonb_build_object('ok', true, 'accepted', false);
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_request.requested_by,
    'application_status',
    CASE WHEN p_accept THEN 'Gespräch wieder geöffnet' ELSE 'Öffnungsanfrage beantwortet' END,
    CASE
      WHEN p_accept THEN 'Deine Anfrage wurde angenommen. Du kannst wieder schreiben.'
      ELSE 'Deine Anfrage wurde abgelehnt.' || CASE WHEN v_reason IS NULL THEN '' ELSE ' Grund: ' || v_reason END
    END,
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || v_request.application_id::text,
      'application_id', v_request.application_id,
      'reopen_request_id', p_request_id
    )
  );

  RETURN v_result || jsonb_build_object('request_id', p_request_id, 'accepted', p_accept);
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_waitlisted_application(
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
  v_target record;
  v_current record;
  v_displaced_application_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;
  IF char_length(v_reason) < 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bitte begründe die Ausnahme nachvollziehbar mit mindestens 20 Zeichen.');
  END IF;
  IF char_length(v_reason) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Grund darf höchstens 500 Zeichen lang sein.');
  END IF;

  SELECT
    a.id,
    a.user_id,
    a.job_id,
    a.status,
    a.conversation_state,
    j.posted_by,
    j.title,
    j.status AS job_status,
    j.filled_by
  INTO v_target
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = p_application_id
  FOR UPDATE OF a, j;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bewerbung nicht gefunden.');
  END IF;
  IF v_target.posted_by <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nur der Anbieter kann die Reihenfolge ändern.');
  END IF;
  IF v_target.status <> 'waitlisted' OR v_target.conversation_state <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nur eine aktive Wartelisten-Bewerbung kann vorgezogen werden.');
  END IF;
  IF v_target.job_status = 'filled' OR v_target.filled_by IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Job ist bereits verbindlich vergeben.');
  END IF;

  SELECT a.id, a.user_id, a.status
  INTO v_current
  FROM public.applications a
  WHERE a.job_id = v_target.job_id
    AND a.id <> p_application_id
    AND a.is_primary
    AND a.conversation_state = 'open'
    AND a.status IN ('submitted', 'negotiating')
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    v_displaced_application_id := v_current.id;
    UPDATE public.applications
    SET status = 'waitlisted',
        is_primary = false,
        updated_at = now()
    WHERE id = v_current.id;

    INSERT INTO public.application_events (application_id, actor_id, event_type, reason, metadata)
    VALUES (
      v_current.id,
      v_user_id,
      'queue_primary_displaced',
      v_reason,
      jsonb_build_object('promoted_application_id', p_application_id)
    );

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_current.user_id,
      'application_status',
      'Bewerbung auf die Warteliste verschoben',
      'Der Anbieter hat ausnahmsweise eine andere Bewerbung vorgezogen. Deine Bewerbung bleibt auf der Warteliste.',
      jsonb_build_object(
        'route', '/app-home/activities?conversation=' || v_current.id::text,
        'application_id', v_current.id,
        'job_id', v_target.job_id,
        'reason', v_reason
      )
    );
  END IF;

  UPDATE public.applications
  SET status = 'negotiating',
      is_primary = true,
      promoted_at = now(),
      promoted_by = v_user_id,
      promotion_reason = v_reason,
      updated_at = now()
  WHERE id = p_application_id;

  UPDATE public.jobs
  SET status = 'reserved',
      filled_by = NULL,
      filled_at = NULL,
      updated_at = now()
  WHERE id = v_target.job_id;

  INSERT INTO public.application_events (application_id, actor_id, event_type, reason, metadata)
  VALUES (
    p_application_id,
    v_user_id,
      'queue_promoted_by_provider',
      v_reason,
      jsonb_build_object('displaced_application_id', v_displaced_application_id, 'job_id', v_target.job_id)
  );

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_target.user_id,
    'application_status',
    'Du bist jetzt auf Platz 1',
    'Der Anbieter hat deine Bewerbung vorgezogen. Der Chat ist jetzt geöffnet.',
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || p_application_id::text,
      'application_id', p_application_id,
      'job_id', v_target.job_id
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'application_id', p_application_id,
    'displaced_application_id', v_displaced_application_id,
    'reason', v_reason
  );
END;
$$;

-- Engagements and appointments ---------------------------------------------

CREATE OR REPLACE FUNCTION public.confirm_job_engagement(
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
  v_engagement public.job_engagements%ROWTYPE;
  v_appointment public.job_appointments%ROWTYPE;
  v_existing_appointment public.job_appointments%ROWTYPE;
  v_closed_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
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
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = v_timezone) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unbekannte Zeitzone.');
  END IF;

  SELECT
    a.id,
    a.user_id,
    a.job_id,
    a.status,
    a.is_primary,
    a.conversation_state,
    j.posted_by,
    j.title,
    j.status AS job_status,
    j.filled_by,
    j.job_kind
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
  IF v_app.conversation_state <> 'open'
     OR NOT v_app.is_primary
     OR v_app.status NOT IN ('submitted', 'negotiating', 'accepted') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nur die aktive Bewerbung auf Platz 1 kann verbindlich vereinbart werden.');
  END IF;
  IF v_app.job_status = 'filled' AND v_app.filled_by IS DISTINCT FROM v_app.user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Job ist bereits anderweitig vergeben.');
  END IF;
  IF v_app.job_status NOT IN ('open', 'reviewing', 'reserved', 'filled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dieser Job kann nicht mehr vereinbart werden.');
  END IF;

  INSERT INTO public.job_engagements (
    application_id,
    job_id,
    provider_id,
    seeker_id,
    engagement_type,
    status,
    started_at
  ) VALUES (
    p_application_id,
    v_app.job_id,
    v_app.posted_by,
    v_app.user_id,
    v_app.job_kind,
    'active',
    now()
  )
  ON CONFLICT (application_id) DO UPDATE
  SET job_id = EXCLUDED.job_id,
      provider_id = EXCLUDED.provider_id,
      seeker_id = EXCLUDED.seeker_id,
      engagement_type = EXCLUDED.engagement_type,
      status = 'active',
      completed_at = NULL,
      cancelled_at = NULL,
      closed_by = NULL,
      close_reason = NULL,
      updated_at = now()
  RETURNING * INTO v_engagement;

  IF v_app.job_kind = 'one_time' THEN
    SELECT * INTO v_existing_appointment
    FROM public.job_appointments
    WHERE engagement_id = v_engagement.id
      AND status = 'scheduled'
    ORDER BY starts_at, id
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_existing_appointment.id IS NOT NULL THEN
    UPDATE public.job_appointments
    SET starts_at = p_starts_at,
        ends_at = p_ends_at,
        timezone = v_timezone,
        note = v_note,
        status = 'scheduled',
        created_by = v_user_id,
        updated_at = now()
    WHERE id = v_existing_appointment.id
    RETURNING * INTO v_appointment;
  ELSE
    INSERT INTO public.job_appointments (
      engagement_id,
      starts_at,
      ends_at,
      timezone,
      note,
      status,
      created_by
    ) VALUES (
      v_engagement.id,
      p_starts_at,
      p_ends_at,
      v_timezone,
      v_note,
      'scheduled',
      v_user_id
    )
    RETURNING * INTO v_appointment;
  END IF;

  INSERT INTO public.job_agreements (
    application_id,
    job_id,
    provider_id,
    seeker_id,
    starts_at,
    ends_at,
    timezone,
    note,
    status
  ) VALUES (
    p_application_id,
    v_app.job_id,
    v_app.posted_by,
    v_app.user_id,
    p_starts_at,
    p_ends_at,
    v_timezone,
    v_note,
    'confirmed'
  )
  ON CONFLICT (application_id) DO UPDATE
  SET starts_at = EXCLUDED.starts_at,
      ends_at = EXCLUDED.ends_at,
      timezone = EXCLUDED.timezone,
      note = EXCLUDED.note,
      status = 'confirmed',
      updated_at = now();

  UPDATE public.applications
  SET status = 'accepted',
      is_primary = true,
      conversation_state = 'open',
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = p_application_id;

  WITH closed AS (
    UPDATE public.applications other
    SET closed_from_status = other.status,
        status = 'auto_rejected',
        rejection_reason = 'Der Job wurde verbindlich vergeben.',
        conversation_state = 'closed',
        closed_by = NULL,
        closed_at = now(),
        closed_reason = 'Der Job wurde verbindlich vergeben.',
        close_action = 'job_assigned',
        was_primary_before_close = other.is_primary,
        closure_version = other.closure_version + 1,
        is_primary = false,
        updated_at = now()
    WHERE other.job_id = v_app.job_id
      AND other.id <> p_application_id
      AND other.conversation_state = 'open'
      AND other.status IN ('submitted', 'negotiating', 'waitlisted')
    RETURNING other.id, other.user_id, other.closed_from_status
  ), logged AS (
    INSERT INTO public.application_events (application_id, event_type, reason, metadata)
    SELECT
      closed.id,
      'job_assigned_elsewhere',
      'Der Job wurde verbindlich vergeben.',
      jsonb_build_object('selected_application_id', p_application_id, 'previous_status', closed.closed_from_status)
    FROM closed
    RETURNING application_id
  )
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    closed.user_id,
    'application_status',
    'Job verbindlich vergeben',
    'Der Job „' || v_app.title || '“ wurde verbindlich an eine andere Person vergeben.',
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || closed.id::text,
      'application_id', closed.id,
      'job_id', v_app.job_id
    )
  FROM closed;
  GET DIAGNOSTICS v_closed_count = ROW_COUNT;

  UPDATE public.jobs
  SET status = 'filled',
      filled_by = v_app.user_id,
      filled_at = COALESCE(filled_at, now()),
      completed_at = NULL,
      updated_at = now()
  WHERE id = v_app.job_id;

  INSERT INTO public.messages (application_id, sender_id, content, kind)
  VALUES (
    p_application_id,
    v_user_id,
    CASE
      WHEN v_app.job_kind = 'recurring' THEN 'Ein weiterer Termin wurde verbindlich vereinbart.'
      ELSE 'Der Termin wurde verbindlich vereinbart.'
    END,
    'system'
  );

  INSERT INTO public.application_events (application_id, actor_id, event_type, metadata)
  VALUES (
    p_application_id,
    v_user_id,
    'appointment_scheduled',
    jsonb_build_object(
      'engagement_id', v_engagement.id,
      'appointment_id', v_appointment.id,
      'starts_at', p_starts_at,
      'job_kind', v_app.job_kind,
      'closed_other_applications', v_closed_count
    )
  );

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_app.user_id,
    'success',
    CASE WHEN v_app.job_kind = 'recurring' THEN 'Termin zur Zusammenarbeit gespeichert' ELSE 'Termin vereinbart' END,
    'Der Termin für „' || v_app.title || '“ wurde verbindlich gespeichert.',
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || p_application_id::text,
      'application_id', p_application_id,
      'job_id', v_app.job_id,
      'engagement_id', v_engagement.id,
      'appointment_id', v_appointment.id,
      'starts_at', p_starts_at
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'engagement', to_jsonb(v_engagement),
    'appointment', to_jsonb(v_appointment),
    'scheduled_for', v_appointment.starts_at,
    'agreed_at', v_appointment.updated_at,
    'closed_other_applications', v_closed_count
  );
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
  v_result jsonb;
BEGIN
  v_result := public.confirm_job_engagement(
    p_application_id,
    p_starts_at,
    p_ends_at,
    p_timezone,
    p_note
  );

  IF COALESCE((v_result->>'ok')::boolean, false) THEN
    RETURN v_result || jsonb_build_object('agreement', v_result->'appointment');
  END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_job_engagement(
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
  v_reason text := COALESCE(NULLIF(btrim(p_reason), ''), 'Zusammenarbeit abgeschlossen.');
  v_app record;
  v_engagement public.job_engagements%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;
  IF char_length(v_reason) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Abschlussgrund darf höchstens 500 Zeichen lang sein.');
  END IF;

  SELECT
    a.id,
    a.user_id,
    a.job_id,
    a.status,
    a.is_primary,
    a.conversation_state,
    j.posted_by,
    j.title,
    j.job_kind
  INTO v_app
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = p_application_id
  FOR UPDATE OF a, j;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bewerbung nicht gefunden.');
  END IF;
  IF v_app.posted_by <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nur der Anbieter kann die Zusammenarbeit abschließen.');
  END IF;
  IF v_app.status = 'completed' AND v_app.conversation_state = 'closed' THEN
    RETURN jsonb_build_object('ok', true, 'unchanged', true);
  END IF;
  IF v_app.status <> 'accepted' OR v_app.conversation_state <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Es gibt keine aktive Zusammenarbeit zum Abschließen.');
  END IF;

  UPDATE public.job_engagements
  SET status = 'completed',
      completed_at = now(),
      cancelled_at = NULL,
      closed_by = v_user_id,
      close_reason = v_reason,
      updated_at = now()
  WHERE application_id = p_application_id
    AND status = 'active'
  RETURNING * INTO v_engagement;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Die Zusammenarbeit wurde nicht gefunden.');
  END IF;

  UPDATE public.job_appointments
  SET status = CASE WHEN starts_at <= now() THEN 'completed' ELSE 'cancelled' END,
      updated_at = now()
  WHERE engagement_id = v_engagement.id
    AND status = 'scheduled';

  UPDATE public.job_agreements
  SET status = 'completed', updated_at = now()
  WHERE application_id = p_application_id;

  UPDATE public.applications
  SET status = 'completed',
      conversation_state = 'closed',
      closed_by = v_user_id,
      closed_at = now(),
      closed_reason = v_reason,
      close_action = 'engagement_completed',
      closed_from_status = v_app.status,
      was_primary_before_close = v_app.is_primary,
      closure_version = closure_version + 1,
      is_primary = false,
      updated_at = now()
  WHERE id = p_application_id;

  UPDATE public.jobs
  SET status = 'closed',
      completed_at = now(),
      updated_at = now()
  WHERE id = v_app.job_id;

  INSERT INTO public.application_events (application_id, actor_id, event_type, reason, metadata)
  VALUES (
    p_application_id,
    v_user_id,
    'engagement_completed',
    v_reason,
    jsonb_build_object('engagement_id', v_engagement.id, 'job_kind', v_app.job_kind)
  );

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_app.user_id,
    'application_status',
    'Zusammenarbeit abgeschlossen',
    'Die Zusammenarbeit zu „' || v_app.title || '“ wurde als abgeschlossen markiert.',
    jsonb_build_object(
      'route', '/app-home/activities?conversation=' || p_application_id::text,
      'application_id', p_application_id,
      'job_id', v_app.job_id,
      'engagement_id', v_engagement.id
    )
  );

  RETURN jsonb_build_object('ok', true, 'engagement', to_jsonb(v_engagement));
END;
$$;

-- Reporting and inbox read model -------------------------------------------

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
    v_target_type := 'profile';
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

CREATE OR REPLACE FUNCTION public.get_activity_inbox_summaries()
RETURNS TABLE (
  application_id uuid,
  last_message_preview text,
  last_message_at timestamptz,
  unread_count bigint,
  pending_reopen_count bigint,
  last_activity_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  WITH permitted AS (
    SELECT a.id, a.last_activity_at
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.user_id = auth.uid() OR j.posted_by = auth.uid()
  ), unread AS (
    SELECT m.application_id, count(*)::bigint AS count
    FROM public.messages m
    JOIN permitted p ON p.id = m.application_id
    WHERE m.sender_id <> auth.uid()
      AND m.read_at IS NULL
    GROUP BY m.application_id
  ), pending AS (
    SELECT request.application_id, count(*)::bigint AS count
    FROM public.conversation_reopen_requests request
    JOIN permitted p ON p.id = request.application_id
    WHERE request.recipient_id = auth.uid()
      AND request.status = 'pending'
    GROUP BY request.application_id
  )
  SELECT
    p.id,
    latest.content,
    latest.created_at,
    COALESCE(unread.count, 0),
    COALESCE(pending.count, 0),
    p.last_activity_at
  FROM permitted p
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at
    FROM public.messages m
    WHERE m.application_id = p.id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 1
  ) latest ON true
  LEFT JOIN unread ON unread.application_id = p.id
  LEFT JOIN pending ON pending.application_id = p.id;
$$;

-- Live-only, atomic job creation --------------------------------------------

CREATE OR REPLACE FUNCTION public.create_job_v2(
  p_market_id uuid,
  p_title text,
  p_description text,
  p_wage numeric,
  p_category text,
  p_payment_type text DEFAULT 'hourly',
  p_status public.job_status DEFAULT 'open',
  p_address_reveal_policy text DEFAULT 'after_accept',
  p_public_location_label text DEFAULT '',
  p_public_lat double precision DEFAULT NULL,
  p_public_lng double precision DEFAULT NULL,
  p_reach text DEFAULT 'internal_rheinbach',
  p_job_kind text DEFAULT 'one_time',
  p_recurrence_rule text DEFAULT NULL,
  p_continuity_preferred boolean DEFAULT false,
  p_address_full text DEFAULT NULL,
  p_private_lat double precision DEFAULT NULL,
  p_private_lng double precision DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_title text := btrim(COALESCE(p_title, ''));
  v_description text := btrim(COALESCE(p_description, ''));
  v_job public.jobs%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert.');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_user_id
      AND p.account_type::text = 'job_provider'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nur Jobanbieter können Jobs erstellen.');
  END IF;
  IF p_status NOT IN ('draft', 'open') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ein neuer Job kann nur als Entwurf oder offen angelegt werden.');
  END IF;
  IF char_length(v_title) NOT BETWEEN 5 AND 140 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Der Titel muss zwischen 5 und 140 Zeichen lang sein.');
  END IF;
  IF char_length(v_description) NOT BETWEEN 10 AND 5000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Die Beschreibung muss zwischen 10 und 5.000 Zeichen lang sein.');
  END IF;
  IF p_wage IS NULL OR p_wage <= 0 OR p_wage > 100000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bitte gib eine gültige Vergütung an.');
  END IF;
  IF p_payment_type IS NULL OR p_payment_type NOT IN ('hourly', 'fixed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unbekannte Zahlungsart.');
  END IF;
  IF p_reach IS NULL OR p_reach NOT IN ('internal_rheinbach', 'extended') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unbekannte Reichweite.');
  END IF;
  IF p_job_kind IS NULL OR p_job_kind NOT IN ('one_time', 'recurring') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unbekannte Jobart.');
  END IF;
  IF p_job_kind = 'recurring'
     AND (p_recurrence_rule IS NULL OR p_recurrence_rule NOT IN ('weekly', 'biweekly', 'monthly', 'flexible')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bitte wähle eine Häufigkeit für den regelmäßigen Job.');
  END IF;
  IF p_job_kind = 'one_time' AND p_recurrence_rule IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ein einmaliger Job benötigt keine Wiederholung.');
  END IF;
  IF char_length(COALESCE(p_address_full, '')) > 500
     OR char_length(COALESCE(p_notes, '')) > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Private Ortsangaben sind zu lang.');
  END IF;

  INSERT INTO public.jobs (
    posted_by,
    market_id,
    title,
    description,
    wage_hourly,
    status,
    category,
    payment_type,
    address_reveal_policy,
    public_location_label,
    public_lat,
    public_lng,
    reach,
    hiring_mode,
    job_kind,
    recurrence_rule,
    continuity_preferred
  ) VALUES (
    v_user_id,
    p_market_id,
    v_title,
    v_description,
    p_wage,
    p_status,
    p_category,
    p_payment_type,
    p_address_reveal_policy,
    p_public_location_label,
    p_public_lat,
    p_public_lng,
    p_reach,
    'first_come',
    p_job_kind,
    CASE WHEN p_job_kind = 'recurring' THEN p_recurrence_rule ELSE NULL END,
    p_job_kind = 'recurring' AND p_continuity_preferred
  )
  RETURNING * INTO v_job;

  INSERT INTO public.job_private_details (
    job_id,
    address_full,
    private_lat,
    private_lng,
    notes
  ) VALUES (
    v_job.id,
    NULLIF(btrim(p_address_full), ''),
    p_private_lat,
    p_private_lng,
    NULLIF(btrim(p_notes), '')
  );

  RETURN jsonb_build_object('ok', true, 'job', to_jsonb(v_job), 'job_id', v_job.id);
END;
$$;

-- Least-privilege API surface and Realtime publication ----------------------

REVOKE INSERT ON TABLE public.jobs FROM anon, authenticated;

DO $$
DECLARE
  v_function record;
BEGIN
  FOR v_function IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('create_job_atomic', 'accept_applicant')
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      v_function.signature
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._activity_rebalance_job(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._activity_close_application(uuid, uuid, text, text, public.application_status) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._activity_reopen_application(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public._activity_rebalance_job(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._activity_close_application(uuid, uuid, text, text, public.application_status) TO service_role;
GRANT EXECUTE ON FUNCTION public._activity_reopen_application(uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.submit_job_application(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_application_message(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_application_messages_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_application(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.withdraw_application(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reopen_application(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_conversation_reopen(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.respond_to_conversation_reopen_request(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.promote_waitlisted_application(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_job_engagement(uuid, timestamptz, timestamptz, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_job_agreement(uuid, timestamptz, timestamptz, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_job_engagement(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_activity_item(uuid, text, text, uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_activity_inbox_summaries() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_job_v2(uuid, text, text, numeric, text, text, public.job_status, text, text, double precision, double precision, text, text, text, boolean, text, double precision, double precision, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_job_application(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_application_message(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_application_messages_read(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_application(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_application(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reopen_application(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_conversation_reopen(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_conversation_reopen_request(uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.promote_waitlisted_application(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_job_engagement(uuid, timestamptz, timestamptz, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_job_agreement(uuid, timestamptz, timestamptz, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_job_engagement(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.report_activity_item(uuid, text, text, uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_activity_inbox_summaries() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_job_v2(uuid, text, text, numeric, text, text, public.job_status, text, text, double precision, double precision, text, text, text, boolean, text, double precision, double precision, text) TO authenticated, service_role;

DO $$
DECLARE
  v_table text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH v_table IN ARRAY ARRAY[
      'application_events',
      'conversation_reopen_requests',
      'job_engagements',
      'job_appointments'
    ]
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = v_table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
      END IF;
    END LOOP;
  END IF;
END;
$$;
