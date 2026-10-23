# v0.4.6 draft implementation verification — 2026-10-23

## Result

Implementation is drafted, not released. Package versions remain v0.4.5.
The Google OAuth app does not exist yet. Vercel team configuration access returns
403 for `hearth13`. Real Google account flows, scheduled recovery, authenticated
staging fixture execution, and production rollout remain incomplete.

## Evidence

- 104 automated tests passed, including import normalization, credential
  encryption/context binding/tamper rejection, and the existing app tests.
- TypeScript and lint passed. Production webpack build passed with placeholder
  Supabase configuration; it does not demonstrate live credentials or OAuth.
- Third-party notices regenerated and their check passed; no application
  dependencies were added.
- Desktop (1280 px) and phone (390 px) browser checks used the actual Calendar
  components with fictional static data in a temporary local verification route.
  Verified calendar switches, sync/error status, imported Event links, keyboard
  focus, and no horizontal page overflow or JavaScript exceptions. No live
  server actions, OAuth connection, or provider synchronization were exercised.
  The temporary route was removed afterward.
- An isolated PGlite/PostgreSQL harness applied all three migrations and ran
  `web/supabase/tests/google_calendar_integration.sql` against representative
  tenancy fixtures. It verified shared reads, another Household's rejection,
  owner-only source removal, per-Member visibility, credential/watch-token denial,
  read-only imported Events, stable Event IDs, stale lease/range rejection,
  nonshrinking range expansion, cascade cleanup, and anonymous denial.
  Fixtures rolled back. This is supplemental, not hosted Supabase integration.
- Staging migrations `20261023002210_google_calendar_integration` and
  `20261023002823_google_calendar_consistency`, and
  `20261023003744_google_calendar_incremental_sync` applied to `hearth-staging`
  (`lrksljvljdgkbgtklila`). The CLI could not create its home-directory state;
  migration filenames use the versions generated and verified by the hosted tool.
- Hosted staging metadata confirms RLS on all five new tables, no authenticated
  credential/watch-token read grant, and no imported-Event mutation grant.
  Native counts remained 99,446 To-dos, 4,004 Events, 4,004 Chores, and 2,002
  Memberships; there are no Google connections or persistent test fixtures.
- The hosted rollback-fixture SQL call twice returned `Invalid or expired
  requestState`. Hosted authenticated fixture assertions therefore remain unrun.
- Staging advisors show an intentional new INFO notice for RLS with no policies
  on the credential table: authenticated/anonymous grants are revoked, and only
  the server role can access it. See
  [the advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
  Existing SECURITY DEFINER and password-protection advisories remain.
- Parallel Standards and Spec reviews found unstable imported IDs and concurrent
  range overwrite risks. Both were fixed and covered by database harness checks.

## Implementation boundaries and outstanding work

- The draft reads Google's paginated incremental change feed separately from
  bounded occurrence snapshots. It persists a token only after all pages and a
  matching atomic snapshot/checkpoint succeed; expired tokens rebuild the feed.
  Unchanged sources skip occurrence reloading. The provider boundary has tests
  for pagination, unchanged feeds, missing final tokens, and expired-token recovery.
  A refreshed occurrence snapshot currently caps at 25,000 Events/3 MB or 180
  seconds; larger imports fail visibly and retain cached data. Large-source
  scalability and real-provider quota behavior still require verification.
- Separate requested and successfully cached date ranges prevent a busy worker
  from making an unfilled range appear loaded. Automatic navigation refresh and
  manual retry exist; hosted concurrency and actual provider recovery still need
  verification.
- Source watches are renewed by sync work; the 15-minute scheduler installer is
  prepared but not installed because endpoint configuration is incomplete.
- No production schema, credentials, scheduler, or data were changed.

Follow [Google Calendar setup](../setup/google-calendar.md) and complete the
[design acceptance criteria](../design/v0.4.6-google-calendar-integration.md)
before marking this release complete, bumping package versions, or merging.
