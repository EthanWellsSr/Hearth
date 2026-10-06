# Hearth status

Short handoff for the current release and immediate work. Update this file when
the active plan changes and as part of every release.

## Active priority — public repository

1. Finish the public review of tracked files and Git history. The setup
   documentation and fictional screenshots are ready; the staging test account
   passwords have been rotated. Record the remaining commit-email exposure and
   licensing choice before publication. A recorded walkthrough can follow.
2. Review the `dev` diff, complete release checks, and publish the repository
   after Ethan approves the exact Git and GitHub changes. Production Auth already
   blocks new Users; the app's sign-up UI change is still local.
3. Set up and test an encrypted production-data backup after the repository is
   public. The migration baseline cannot restore Household records.

## Current release

- **v0.4.2 — Responsive Application Architecture**, released 2026-09-24.
  Vercel Functions in `pdx1` beside the Supabase primary, a persistent
  authenticated shell with route loading state, cached Avatar signed URLs,
  one-round-trip Household-context and Calendar-window functions, client router
  caching (`staleTimes`), pending states on common actions, no prefetch on
  Calendar add-Event slots, a formatted `/licenses` page, and dropdowns that
  layer above neighboring cards and dismiss on outside click or Escape.
- Tag `v0.4.2` is the release merge; `dev` and `master` have since added the CI
  workflow and the v0.4.3 plan.
- Migrations `0012`, `0013`, and `0014` are applied and verified live: anon can
  execute no app function (42501), Household-data policies are scoped to
  authenticated, and future public functions no longer grant anon execute.
- Ethan reports production navigation feels much faster.

## Verified this cycle

- Publication-preparation checks on 2026-10-06: `npm run lint` passed with one
  warning in an unrelated untracked scale-test draft; all 75 tests passed;
  `npm run build -- --webpack` and `npm run notices:check` passed. Fictional
  screenshots were inspected at desktop and phone widths.
- `npm run lint`, `npm test` (71), `npm run build -- --webpack`, and
  `npm run notices:check` pass.
- Dropdown layering and dismissal verified in-browser at desktop and 375px phone
  width with the real components: every assignee menu and the avatar menu sits
  above later cards and the footer, and outside click, Escape, choosing, and
  opening another menu all close it.
- Production latency acceptance PASSED on 2026-09-24 with
  `web/scripts/measure-navigation.js`: function region `cle1::pdx1`; ack max
  19ms; ready median 13ms and p95 458ms across 20 transitions (7 server, 13
  client cache); server-rendered median 321ms and p95 626ms (Home → Calendar).
  Before v0.4.2, warm Calendar view changes measured 648ms and Home to Calendar
  977ms.
- A first run failed on ack (Calendar view changes 301–348ms with no feedback,
  fixed with `PendingLink`) and showed one Home → Chores outlier of 11,029ms
  that did not recur (308ms on the re-run).

## Reminders split — state of the deferred work (v0.4.5)

- Design is recorded in `docs/design/v0.4.1-calendar-rhythm.md`.
- Schema `0010` (`event_reminders`, `push_subscriptions`,
  `event_reminder_deliveries`) is applied.
- Unwired scaffolding remains in the working tree: `NotificationOptIn.tsx`,
  `notification-actions.ts`, `public/sw.js`. The opt-in was removed from the
  Calendar page so v0.4.1 ships no push behavior.
- Not built: reminder-offset UI, transactional Event+reminder persistence, the
  delivery outbox, the protected Cron-invoked sender, VAPID secrets, the
  `web-push` dependency, and real-device testing.
- Requires Ethan for VAPID keys/secrets, Supabase Cron configuration, and
  installed-iPhone push testing.

## Notable finding (recorded for reuse)

- A PostgREST RPC that raises a business-rule conflict must NOT use
  `errcode = 'serialization_failure'` (40001): PostgREST auto-retries that class,
  so a stale-write rejection hung for 30–125s before surfacing. Fixed by raising
  `P0001` instead. `lock_timeout = '3s'` is kept as defense for real
  concurrent-writer contention.

## Performance gate

- The Supabase CPU incident was a retry storm from a stale-write request to
  `upsert_event_occurrence_exception`: API Gateway recorded a 504 after 125.085s,
  while Query Performance recorded 94,074,118 PostgREST request-initialization
  calls.
- Live verification on 2026-09-19 confirmed all three recurring-Event mutation
  functions use `P0001` and none use `serialization_failure`. The retry counter
  did not increase across a 12-second sample, all database sessions were idle,
  and refreshed CPU had recovered from 95.92% to 1.47%.
- The performance gate passed after deployment: normal warm navigation remained
  below one second, browser logs were clean, and a freshly refreshed Supabase
  report showed 0.40% CPU with no sign of another retry storm.

## Next

1. v0.4.3 Production Foundations: design gate run 2026-09-27 and recorded in
   `docs/design/v0.4.3-production-foundations.md`. The audit's scope was split;
   sign-up for outside Users moved to v0.4.4 Public Sign-up
   (`docs/design/v0.4.4-public-sign-up.md`, gate partial), and Reminders to v0.4.5.
   Ethan confirmed the design 2026-09-27 and refined its scope 2026-10-06.
   Delivery steps 1 and 2 are complete; backup work is now post-publication.
   Step 1 added the Supabase CLI as a devDependency, `supabase/config.toml`,
   `scripts/db-dump-schema.sh` (Docker-free dump + platform snapshot), CI job
   `migrations`. CLI logged in and linked to production (2026-09-29); app-schema
   dump in `supabase/prod-schema.sql` (12 tables, 27 functions, 13 policies) via
   `db dump --linked --dry-run`, no password needed. The CLI's temporary login
   role cannot read `cron`, so the platform snapshot
   (`supabase/prod-schema.platform.txt`: 1 cron job, `avatars` bucket, 4 storage
   policies) was taken in the SQL editor. Production's `supabase_migrations`
   history had been empty (`0001`–`0014` were applied by hand). Staging project
   `hearth-staging` (`lrksljvljdgkbgtklila`, us-west-2, PG 17.6) created
   2026-09-29; the CLI is now linked to staging. Baseline assembled in
   `supabase/migrations/20260929000000_baseline.sql` (revokes anon's default
   function EXECUTE first, omits platform `rls_auto_enable()`, hand-carries cron,
   bucket, and storage policies); `0001`–`0014` moved to `supabase/archive/`.
   Pushed to staging 2026-09-29 and compared with production: cron job, bucket,
   and storage policies match; the only schema differences were the omitted
   `rls_auto_enable()` and authenticated EXECUTE on the two invite-code
   generators (default privileges again). The baseline now revokes those
   explicitly. Staging was reset and re-compared: identical to production except
   `rls_auto_enable()`, and staging's history records the baseline. Production's history
   now records the baseline as applied (`migration repair --project-ref`, no
   password needed); a dry-run push to production reports up to date. Seed
   `supabase/seed.sql` (Maple Street Household, Members Alex and Sam, and sample
   Chores/Events/To-dos/Grocery Items) applied to staging and verified by row
   count. The bulk seed is separate in `supabase/seeds/scale.sql`. The CLI login
   role can `set role postgres` to read data and platform
   schemas. Local `.env.local` and Vercel Preview now point at staging
   (2026-09-29); production values are backed up in `web/.env.prod.local` and
   stay Production-only in Vercel (`NEXT_PUBLIC_*` re-created as Config).
   Committed as `15a07a2` and pushed to `dev`; CI `checks` and `migrations`
   both passed (fresh database rebuilt from baseline + seed), and the Preview
   deployed. Ethan signed in to the Preview as `alex@example.test`
   and saw staging data: **delivery step 1 is done.** Delivery step 2 began with
   the scale test (design section "Scale test"). Scale seed
   (`supabase/seeds/scale.sql`, staging only; CI seed is now demo-only) and
   harness (`scripts/scale/`) built; baseline run FAILED (RLS scanned all 100,000
   rows per list read, ~7.5 s under load). Step 2 committed (`08ffa79`, CI green) and
   applied to production 2026-09-29 by Ethan via `db push --project-ref`;
   verified on production (all Household policies use `my_household_ids()`, no
   per-row `is_member` policies remain, three indexes and
   `memberships_user_id_key` present, helpers not executable by anon): migrations `20260929120000_tenant_scale`
   and `20260929130000_profile_policy_scale`, explicit `household_id` filters,
   guard test `lib/tenant-filters.test.ts`. Scale test now PASSES: 50 and 100
   Users, 0 errors, ~3 ms database time per page (results in the design doc).
   Second Household refused, including a concurrent insert race. App code with the
   explicit filters reaches production when `dev` merges to `master`. The
   end-to-end Preview `k6` run is optional; draft scripts exist untracked at
   `web/scripts/scale/e2e.{js,sh}`. The migration baseline rebuilds schema and sample data, not
   production Household records. Production and staging Supabase Auth sign-up
   were disabled 2026-10-06 after confirming production has two existing,
   confirmed Auth Users with Memberships. Local Auth configuration now also
   disables sign-up. The sign-up action and button are removed in the `dev` working
   tree; production app UI changes await deployment. Public sign-up is deferred.
   Public repository cleanup, README, and screenshots using fictional data are
   priority one; see
   `docs/design/public-showcase.md`. A live dummy-guest Demo is deferred.
2. CI (`.github/workflows/ci.yml`, job `checks`) is committed and merged to
   `master` via PR #1; runs pass on `dev` and `master`. Revisit required checks
   on `master` when repository visibility changes; they are not configured yet.
3. v0.4.5 Event Reminders & Browser Push is deferred until Ethan chooses to
   start it.

## Blockers

- Backup setup follows repository publication. Until a restore is tested,
  production Household records are not recoverable from the migrations.
- Production Auth blocks new accounts, but the deployed login page may still
  show its stale sign-up button until the `dev` UI change reaches production.
- Repository publication needs final review of the exact changes and Ethan's
  decision about licensing and exposed commit email; see the
  [publication review](audits/2026-10-06-repository-publication.md). The staging
  test account passwords have been rotated; a staging reset must rotate them
  again.
- Deferred public sign-up needs Ethan's domain (name not yet chosen).
- v0.4.5 requires Ethan for VAPID keys/secrets, Supabase Cron configuration, and
  installed-iPhone push testing.
