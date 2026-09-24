# Hearth status

Short handoff for the current release and immediate work. Update this file when
the active plan changes and as part of every release.

## Current release

- **v0.4.2 — Responsive Application Architecture**, released 2026-09-24.
  Vercel Functions in `pdx1` beside the Supabase primary, a persistent
  authenticated shell with route loading state, cached Avatar signed URLs,
  one-round-trip Household-context and Calendar-window functions, client router
  caching (`staleTimes`), pending states on common actions, no prefetch on
  Calendar add-Event slots, a formatted `/licenses` page, and dropdowns that
  layer above neighboring cards and dismiss on outside click or Escape.
- `dev`, `master`, and tag `v0.4.2` resolve to the release merge.
- Migrations `0012`, `0013`, and `0014` are applied and verified live: anon can
  execute no app function (42501), Household-data policies are scoped to
  authenticated, and future public functions no longer grant anon execute.
- Ethan reports production navigation feels much faster.

## Verified this cycle

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

## Reminders split — state of the deferred work (v0.4.4)

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

1. v0.4.3 Public Launch Readiness, scoped from
   `docs/audits/2026-09-24-public-launch-readiness.md`. Decided: Ethan buys a
   domain (for Resend SMTP and Hearth's URL); backups via a free scheduled GitHub
   Action, not Supabase Pro. Next: Ethan runs `/grill-with-docs` for the design
   gate before implementation.
2. CI is written (`.github/workflows/ci.yml`, job `checks`) but
   uncommitted. After the repo goes public: PR `dev` → `master`, then require
   both jobs on `master` with bypass disabled. Branch protection is unavailable
   while the repo is private on GitHub Free.
3. v0.4.4 Event Reminders & Browser Push is deferred until Ethan chooses to
   start it.

## Blockers

- v0.4.4 requires Ethan for VAPID keys/secrets, Supabase Cron configuration, and
  installed-iPhone push testing.
