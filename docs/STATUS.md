# Hearth status

Short handoff for the current release and immediate work. Update this file when
the active plan changes and as part of every release.

## Current release

- **v0.4.1 — Calendar Rhythm**, released 2026-09-19. Recurring Events,
  occurrence exceptions and mutations, the Week view, Chores on the Calendar,
  the Calendar Item projection, and Household-timezone maintenance.
- `dev`, `master`, and tag `v0.4.1` resolve to the release merge.
- Event reminders and browser push were split into their own release (now v0.4.3).
- Migrations `0008`, `0009`, `0011` are applied to Supabase (`0010` reminder/push
  schema is applied as groundwork).
- The v0.4.1 production deployment and follow-up authenticated-navigation
  optimization are confirmed in production.

## Verified this cycle

- Recurring Events verified in-browser: Week view (desktop + phone, sticky
  gutter/headers, click-to-prefill); multi-weekday expansion across Week and Month
  bounded to the window; occurrence override (identity preserved), cancel,
  this-and-future split, whole-series edit.
- Optimistic concurrency: a stale write is rejected in ~0.6s with a clear message
  and applies nothing.
- `npm run lint`, `npm test` (61), `npm run build -- --webpack`, and
  `npm run notices:check` all pass.
- Request-scoped authentication context now deduplicates User/User Profile work,
  loads Membership and User Profile concurrently, and includes the Household
  timezone. Middleware and application guards use verified JWT claims instead of
  mandatory Auth-server User lookups.
- Authenticated local navigation improved from roughly 1.7–2.7s before the fix to
  659–681ms between Calendar views and 935ms from Home to Calendar after warm-up.
- Production verification after deployment measured a warm Calendar view change
  at 648ms and Home to Calendar at 977ms. The first two Calendar view changes
  after a fresh reload were 1.40s and 1.52s; no browser errors were recorded.

## Active work — v0.4.2 Responsive Application Architecture

- Design is confirmed in `docs/design/v0.4.2-performance-architecture.md`.
- Implementation is ready for verification: Vercel is configured for `pdx1`,
  authenticated pages share a persistent shell and loading state, private Avatar
  URLs are cached, Household context and Calendar reads have consolidated
  RLS-active functions, and common mutations expose immediate pending state.
- The app retains legacy read fallbacks until migration `0012` is applied, so the
  current dev database continues to work but cannot demonstrate the final
  database-round-trip improvement yet.
- `npm run lint`, `npm test` (63), `npm run build -- --webpack`,
  `npm run notices:check`, and local browser checks at desktop and 390px phone
  width pass. The browser check visibly confirmed the persistent header and
  route-group loading state during a slow navigation.
- Deployment authorized and pushed to `master` on 2026-09-24. Migration `0012`
  must be applied by Ethan in the Supabase SQL Editor (no DB credentials or CLI
  are available to sessions); until then the legacy read fallbacks serve reads.

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

1. Dev-database cleanup of verification artifacts: the "Weekly standup"/"Standup
   v4" split pair and the "Concurrency probe v3" series (awaiting Ethan's go-ahead).
2. Ethan applies migration `0012` in Supabase, confirms the Vercel Functions
   region shows `pdx1`, and tests whether production feels fast enough; then run
   the production latency acceptance sample. Client router caching
   (`staleTimes`) and the formatted `/licenses` page were added on 2026-09-24 as
   part of v0.4.2; if still sluggish, the next lever is broader optimistic UI.
   Migration `0013` (revokes anon EXECUTE on the 0012 functions) is applied and
   verified live (anon receives 42501). Ethan still confirms the function region
   via the `x-vercel-id` header (Deployment Protection blocks sessions).

## Blockers

- Production latency acceptance is blocked on Ethan applying migration `0012`. v0.4.3 still requires Ethan for VAPID keys/secrets,
  Supabase Cron configuration, and installed-iPhone push testing.
