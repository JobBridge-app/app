# Database rollout, verification and rollback

## Authority and release rule

The former hand-maintained `infrastructure/database/schema.sql` bootstrap is
retired because it contained obsolete demo and role-override objects. A move
starts from a freshly exported, dated schema-only baseline of the source
project. From
`20260714190737_activities_realtime_and_job_agreements` onward, every file in
`infrastructure/database/migrations/` is the byte-identical statement recorded
under the same version and name in the production Supabase ledger. Apply files
once in filename order. Never edit an already applied migration; add a forward
migration instead.

A file in Git is not deployment evidence. Before release, compare its filename
with the target project's migration ledger and record the database backup,
application revision, operator, start/end time and verification result.

## Canonical ledger verification

For the Activities release slice, the local list must contain exactly thirteen
files, beginning with
`20260714190737_activities_realtime_and_job_agreements.sql` and ending with
`20260715004029_humanize_application_notifications.sql`. The authoritative
MD5 values are recorded in
[`infrastructure/database/README.md`](../../infrastructure/database/README.md).

Verify the target ledger without executing a migration:

```sql
select
  version,
  name,
  cardinality(statements) as statement_count,
  md5(statements[1]) as statement_md5,
  octet_length(statements[1]) as statement_bytes
from supabase_migrations.schema_migrations
where version between '20260714190737' and '20260715004029'
order by version;
```

Every row in this slice must have `statement_count = 1`; filename
`<version>_<name>.sql`, MD5 and byte length must match locally. On macOS, local
checksums can be printed with `md5 -q <file>`; on Linux use `md5sum <file>`.
Any mismatch is migration-history drift: stop, recover the recorded statement
and review it rather than reapplying, editing a ledger row or renaming a
different migration. Earlier baseline/guardian ledger entries intentionally do
not appear again in this directory and must not be replayed over a freshly
restored baseline.

## Pre-deployment checklist

1. Confirm the target project and current migration ledger.
2. Take a managed backup or point-in-time recovery checkpoint. For a project
   move, also create a schema-only baseline and encrypted exports of required
   production data; never commit Auth rows or secrets.
3. Record row counts and stable IDs for `auth.users`, `profiles`, `waitlist`,
   guardian tables, system-role tables, jobs, applications, messages,
   notifications and reports.
4. Restore the backup into an isolated project and apply the pending migrations
   there first.
5. Run each migration inside `BEGIN … ROLLBACK` against representative data.
   Inspect locks, execution time, rewritten row counts, policy changes and query
   plans. A successful parse alone is insufficient.
6. Run application tests against the isolated project with both account types,
   a staff account and a non-staff account.
7. Confirm that service-role secrets exist only in server runtimes and that the
   consumer build contains no privileged key.
8. Schedule a write-restricted window for any migration that rewrites large
   tables or changes lifecycle functions.

## Application sequence

1. Deploy an application revision that is compatible with both the old and new
   additive schema when possible.
2. Apply pending migrations in filename order. Do not skip an intermediate
   function or policy migration.
3. Stop on the first error. Do not mark a migration applied manually unless the
   database contents have been independently reconciled.
4. Run the verification gates below before enabling the dependent UI.
5. Observe database errors, RPC failures, Realtime channel errors and queue
   transitions during the release window.

## Verification gates

### Structural checks

- The migration ledger contains every expected filename exactly once.
- Required RLS policies and grants exist; `anon` and `authenticated` do not have
  direct mutation grants on applications, messages, reports, engagements or
  appointments.
- The Realtime publication contains the required persisted tables. Private
  Broadcast policies exist for `activity:{application_id}` topics.
- All `SECURITY DEFINER` functions have an explicit, pinned `search_path` and
  execution grants only for their intended roles.
- Consumer `profiles` SELECT is own-row only and consumer `applications` SELECT
  is participant-only; neither policy contains `is_staff` or another staff-wide
  branch.
- `get_visible_job_creator_summaries(uuid[])` and
  `get_activity_partner_profiles(uuid[])` are authenticated, 100-ID-bounded
  projections. Their signatures contain no birthdate, email, address, guardian
  field or system-role list; only `age_years` and `is_staff` are derived.
- Browser grants are exact: profiles use authenticated `SELECT` plus
  column-limited `UPDATE`, while direct profile inserts are revoked and
  onboarding uses `complete_profile_onboarding`; applications, system-role
  tables and guardian tables use authenticated `SELECT`; regions use
  anonymous/authenticated `SELECT`; and private job details have no browser
  table grant. The service role retains all privileges on these tables.
- Trigger helpers are not callable by browser roles; only the explicitly
  documented guardian invitation lookup RPC allows anonymous use. Redemption
  and invitation creation require an authenticated identity.
- Onboarding waitlist clients have no direct table access and can only invoke
  the validated `join_launch_waitlist` RPC. Moderation actions, security events
  and report evidence remain service-only.
- Protected-table row counts and stable IDs match the pre-deployment snapshot.

### Lifecycle invariants

Run equivalent checks in the SQL console. Every query below must return zero
rows unless explicitly stated otherwise.

```sql
-- Never more than one writable primary conversation per job.
select job_id, count(*)
from public.applications
where is_primary
  and conversation_state = 'open'
  and status in ('submitted', 'negotiating', 'accepted')
group by job_id
having count(*) > 1;

-- Closed conversations cannot remain primary.
select id, job_id, status
from public.applications
where conversation_state = 'closed' and is_primary;

-- FIFO keys must exist and be positive.
select id, job_id, queue_position
from public.applications
where queue_position is null or queue_position <= 0;

-- A job must not contain duplicate FIFO keys.
select job_id, queue_position, count(*)
from public.applications
group by job_id, queue_position
having count(*) > 1;

-- A filled job needs an assigned profile.
select id
from public.jobs
where status = 'filled' and filled_by is null;

-- Pending reopen requests are unique for one closure and requester.
select application_id, closure_version, requested_by, count(*)
from public.conversation_reopen_requests
where status = 'pending'
group by application_id, closure_version, requested_by
having count(*) > 1;
```

### Permission and privacy tests

Use separate sessions rather than a service-role client:

1. A seeker cannot read or mutate another seeker's application, messages,
   notifications, preferences or waitlist position.
2. A provider can read only conversations for their own jobs.
3. A waitlisted participant cannot send a normal chat message.
4. Only the participant who closed a reversible conversation can reopen it
   directly; the other participant can create only one request for that closure.
5. A non-participant cannot subscribe to or send on a private typing topic.
6. A notification subscription filtered to one recipient never receives a row
   for another recipient.
7. A consumer session cannot select report evidence. The external admin backend
   can access it only after staff authorization.
8. A staff-tagged consumer still sees only their own full profile and
   participant applications. Arbitrary `is_staff(uuid)`/role helper RPCs are not
   browser-callable.
9. Creator summaries return only requested visible jobs; a hidden
   non-participant job returns no creator. Activity partner profiles work in
   both seeker-to-provider and provider-to-seeker directions and return nothing
   to a non-participant.
10. Duplicate requested IDs produce one result, requests above 100 IDs fail,
    and unauthenticated calls fail. `age_years` matches whole calendar years
    while the underlying birthdate remains absent from the result type.

### Transaction smoke test

In an isolated project, exercise one complete job:

1. Submit applicant A; verify primary `negotiating`, position key, job
   `reserved`, first message, event and provider notification.
2. Submit B and C; verify FIFO `waitlisted` order and privacy-preserving own
   ranks.
3. Withdraw or reject A; verify B is promoted atomically, C remains next, and
   the job remains `reserved`.
4. Close and reopen a reversible conversation. Verify `closure_version`, direct
   reopen ownership and the one-request constraint.
5. Confirm B with a future appointment. Verify job `filled`, application
   `accepted`, engagement/appointment creation and automatic closure of C.
6. Complete the engagement. Verify job `closed`, conversation closure, event
   and recipient notification.
7. Create message, user and reopen-request reports. Verify their evidence
   snapshots through the authorized admin backend and verify consumer denial.

## Rollback policy

Prefer a forward corrective migration after a production migration has been
recorded. Reverting Git or deleting the migration row does not revert database
state.

For a failed release:

1. Disable the dependent UI and stop affected writes.
2. Preserve logs and capture the current database state before remediation.
3. If the change is additive and data is intact, deploy the last compatible
   application and add a compensating migration for functions, policies or
   indexes.
4. If data was destructively changed, restore the verified managed backup into
   an isolated project, validate protected-table counts and lifecycle invariants,
   then perform a controlled full restore or project cutover.
5. Do not selectively overwrite Auth, profiles, guardian links, onboarding
   waitlist or system roles from an older export. Those datasets are connected
   by stable UUIDs and require a coordinated restore.
6. Re-run all verification gates before reopening writes and record the incident
   and corrective migration.

Every future destructive migration needs its own compatibility window, export,
restore rehearsal and rollback document before approval.
