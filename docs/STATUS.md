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
- `dev` and `master` resolve to the release merge. Tag `v0.4.2` is cut after
  the harness run passes.
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
- Before v0.4.2, production warm Calendar view changes measured 648ms and Home
  to Calendar 977ms.

## Reminders split — state of the deferred work (v0.4.3)

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

1. Ethan runs `web/scripts/measure-navigation.js` in the DevTools Console while
   signed in on production. It measures 20 transitions (ack ≤100ms, median
   ≤500ms, p95 ≤1,000ms) and reports the function region from `x-vercel-id`
   (expect `pdx1`). On PASS, record the results here and tag `v0.4.2`. If it
   fails, the next lever is broader optimistic UI. The signed-in smoke check
   after `0014` passed.
   First run (2026-09-24): region `cle1::pdx1` confirmed; FAIL on ack (Calendar
   view changes 301–348ms with no feedback, now fixed with `PendingLink`) and
   one Home → Chores outlier at 11,029ms. Server-rendered transitions otherwise
   ran 301–585ms (median 330ms). Re-run after deploy; if Chores stalls again,
   read its duration in Vercel Logs.
2. Dev-database cleanup of verification artifacts: the "Weekly standup"/"Standup
   v4" split pair and the "Concurrency probe v3" series (awaiting Ethan's go-ahead).
3. Rotate the Supabase secret key as a precaution (it was printed into a session
   log on 2026-09-24) and update it in Vercel and `web/.env.local`.
4. Begin v0.4.3 Event Reminders & Browser Push.

## Blockers

- v0.4.3 requires Ethan for VAPID keys/secrets, Supabase Cron configuration, and
  installed-iPhone push testing.
