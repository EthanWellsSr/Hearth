# Hearth status

Short handoff for the current release and immediate work. Update this file when
the active plan changes and as part of every release.

## Current release

- **v0.4.1 — Calendar Rhythm**, released 2026-09-19. Recurring Events,
  occurrence exceptions and mutations, the Week view, Chores on the Calendar,
  the Calendar Item projection, and Household-timezone maintenance.
- `dev`, `master`, and tag `v0.4.1` resolve to the release merge.
- Event reminders and browser push were split into their own release (v0.4.2).
- Migrations `0008`, `0009`, `0011` are applied to Supabase (`0010` reminder/push
  schema is applied as groundwork).
- Production deployment and post-deploy performance confirmation are outstanding.

## Verified this cycle

- Recurring Events verified in-browser: Week view (desktop + phone, sticky
  gutter/headers, click-to-prefill); multi-weekday expansion across Week and Month
  bounded to the window; occurrence override (identity preserved), cancel,
  this-and-future split, whole-series edit.
- Optimistic concurrency: a stale write is rejected in ~0.6s with a clear message
  and applies nothing.
- `npm run lint`, `npm test` (58), `npm run build -- --webpack`, and
  `npm run notices:check` all pass.

## Reminders split — state of the deferred work (v0.4.2)

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
- Do not begin another feature until v0.4.1 is deployed and authenticated
  interaction timing confirms the app remains responsive under normal use.

## Next

1. Confirm the v0.4.1 production deployment, measure authenticated navigation and
   mutation latency, and verify CPU remains normal with no new 504 retry storm.
2. Dev-database cleanup of verification artifacts: the "Weekly standup"/"Standup
   v4" split pair and the "Concurrency probe v3" series (awaiting Ethan's go-ahead).
3. Only after the performance gate passes, begin v0.4.2 (Event Reminders & Browser
   Push) with the config/persistence slice, then delivery via Supabase Cron.

## Blockers

- Feature work is paused pending post-deploy performance confirmation.
