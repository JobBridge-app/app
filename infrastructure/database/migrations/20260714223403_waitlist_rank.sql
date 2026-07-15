-- Return a privacy-preserving, gapless position for the current user's own
-- waitlist entry. Raw queue_position remains the immutable FIFO key.

DROP FUNCTION IF EXISTS public.get_waitlist_job_summaries(uuid[]);

CREATE FUNCTION public.get_waitlist_job_summaries(p_job_ids uuid[])
RETURNS TABLE (
  job_id uuid,
  waitlist_count bigint,
  next_position bigint,
  conversation_active boolean,
  my_waitlist_position bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT
    job.id,
    COALESCE(queue_summary.waitlist_count, 0)::bigint,
    (COALESCE(queue_summary.waitlist_count, 0) + 1)::bigint,
    EXISTS (
      SELECT 1
      FROM public.applications primary_application
      WHERE primary_application.job_id = job.id
        AND primary_application.is_primary
        AND primary_application.conversation_state = 'open'
        AND primary_application.status IN ('submitted', 'negotiating', 'accepted')
    ),
    own_queue.position::bigint
  FROM public.jobs job
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS waitlist_count
    FROM public.applications waitlisted_application
    WHERE waitlisted_application.job_id = job.id
      AND waitlisted_application.status = 'waitlisted'
      AND waitlisted_application.conversation_state = 'open'
  ) queue_summary ON true
  LEFT JOIN LATERAL (
    SELECT ranked.position
    FROM (
      SELECT
        waitlisted_application.user_id,
        row_number() OVER (
          ORDER BY
            waitlisted_application.queue_position,
            waitlisted_application.created_at,
            waitlisted_application.id
        ) AS position
      FROM public.applications waitlisted_application
      WHERE waitlisted_application.job_id = job.id
        AND waitlisted_application.status = 'waitlisted'
        AND waitlisted_application.conversation_state = 'open'
    ) ranked
    WHERE ranked.user_id = auth.uid()
    LIMIT 1
  ) own_queue ON true
  WHERE auth.uid() IS NOT NULL
    AND job.id = ANY(COALESCE(p_job_ids, ARRAY[]::uuid[]))
    AND (
      job.status IN ('open'::public.job_status, 'reserved'::public.job_status)
      OR job.posted_by = auth.uid()
      OR public.is_activity_job_participant(job.id)
    );
$$;

REVOKE ALL ON FUNCTION public.get_waitlist_job_summaries(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_waitlist_job_summaries(uuid[]) TO authenticated, service_role;
