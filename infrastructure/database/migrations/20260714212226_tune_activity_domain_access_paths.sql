-- Final least-privilege and query-path tuning for the Activities domain.

CREATE INDEX IF NOT EXISTS idx_application_events_actor
  ON public.application_events(actor_id)
  WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_closed_by
  ON public.applications(closed_by)
  WHERE closed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_promoted_by
  ON public.applications(promoted_by)
  WHERE promoted_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_reopened_by
  ON public.applications(reopened_by)
  WHERE reopened_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reopen_requests_requested_by
  ON public.conversation_reopen_requests(requested_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reopen_requests_resolved_by
  ON public.conversation_reopen_requests(resolved_by)
  WHERE resolved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_appointments_created_by
  ON public.job_appointments(created_by)
  WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_engagements_closed_by
  ON public.job_engagements(closed_by)
  WHERE closed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_engagements_seeker
  ON public.job_engagements(seeker_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_message
  ON public.reports(message_id)
  WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_reopen_request
  ON public.reports(reopen_request_id)
  WHERE reopen_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_reported_user
  ON public.reports(reported_user_id, created_at DESC)
  WHERE reported_user_id IS NOT NULL;

DROP POLICY IF EXISTS "Public can view active jobs" ON public.jobs;
DROP POLICY IF EXISTS "Providers can view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Activity participants can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can manage all jobs" ON public.jobs;
DROP POLICY IF EXISTS "jobs_select" ON public.jobs;

CREATE POLICY jobs_select
  ON public.jobs
  FOR SELECT
  TO public
  USING (
    status = 'open'::public.job_status
    OR posted_by = (SELECT auth.uid())
    OR public.is_activity_job_participant(id)
  );

DROP POLICY IF EXISTS "Providers can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert" ON public.jobs;

DROP POLICY IF EXISTS "Providers can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update" ON public.jobs;
CREATE POLICY jobs_update
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (posted_by = (SELECT auth.uid()))
  WITH CHECK (posted_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view messages for their applications" ON public.messages;
CREATE POLICY "Users can view messages for their applications"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications application
      JOIN public.jobs job ON job.id = application.job_id
      WHERE application.id = messages.application_id
        AND (
          application.user_id = (SELECT auth.uid())
          OR job.posted_by = (SELECT auth.uid())
        )
    )
  );

DO $$
DECLARE
  v_table_name text;
  v_function record;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'demo_jobs',
    'demo_applications',
    'demo_sessions',
    'role_overrides'
  ]
  LOOP
    IF to_regclass('public.' || v_table_name) IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated',
        v_table_name
      );
      EXECUTE format(
        'GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role',
        v_table_name
      );
    END IF;
  END LOOP;

  FOR v_function IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'can_act_as',
        'get_effective_role',
        'get_my_effective_role',
        'is_demo_user'
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      v_function.signature
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      v_function.signature
    );
  END LOOP;
END;
$$;
