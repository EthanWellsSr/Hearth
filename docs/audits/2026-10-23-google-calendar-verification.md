# v0.4.6 draft implementation verification — 2026-10-23

## Result

Implementation is drafted, not released. Package versions remain v0.4.5.
The Google Cloud project, Calendar API, OAuth consent, and separate staging/
production clients are configured. Vercel connector configuration access returns 403 for
`hearth13`, while dashboard access works. Hosted authenticated staging fixture
and concurrent REST range checks passed in the continuation below. Real Google
account flows, scheduled recovery, and production rollout remain incomplete.

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

## Release continuation — 2026-10-23

- Re-ran all 104 automated tests, lint, route-type generation, TypeScript, and
  notices checks successfully in the local checkout.
- The production webpack build passed using the local staging configuration.
  The default Turbopack build could not complete: font fetching was blocked in
  the sandbox, and a network-enabled retry failed to bind a worker port. This
  is not recorded as a successful default build.
- The complete hosted staging SQL suite now passed under authenticated Member,
  service, and anonymous roles. Verified shared reads, Household isolation,
  connection ownership, visibility ownership, credential denial, read-only
  imports, stable IDs, lease/range/checkpoint protection, and cascade cleanup.
  All fictional fixtures rolled back. Post-test counts remained 99,446 To-dos,
  4,004 Events, 4,004 Chores, and 2,002 Memberships, with zero Google connections,
  sources, or imported Events.
- A temporary Node/Supabase REST harness issued simultaneous date-range
  expansion RPC requests against hosted staging. The resulting range preserved
  both expansions (`2024-01-01` through `2029-01-01`). The fictional Auth User,
  Household, Membership, connection, and source were removed in `finally`;
  source cleanup was verified. This checks actual concurrent requests, not
  provider synchronization.
- The local production server connected to hosted staging and the existing
  fictional Alex fixture. Calendar settings showed the expected unconfigured
  state. The Hearth visibility switch saved to the database, survived reload,
  and hid native Events and Chores together. Restored visibility and removed
  the newly created preference row. Phone width 390 px had no horizontal
  overflow or captured browser warnings/errors; the viewport was reset.
- Created the Google Cloud project `Hearth Calendar`
  (`charming-hearth-512602-h2`) and enabled the Google Calendar API after Ethan's
  explicit confirmations. Billing and paid resources were not enabled.
- Vercel connector configuration access still returns 403 for `hearth13` and
  exposes no team-authorization helper. Dashboard sign-in worked. Added the
  production `GOOGLE_CALENDAR_APP_ORIGIN` configuration value for the documented
  production origin; it requires a new deployment to take effect.
- OAuth consent/client creation, deployment credentials, real-provider tests,
  scheduled recovery, and production migrations remain release gates.

## OAuth setup and first live provider flow — 2026-10-23

- Accepted Google’s User Data Policy after Ethan’s explicit confirmation. The
  support/contact email is the account Ethan approved.
- Created separate staging and production Web OAuth clients. Staging redirects
  are the stable `dev` preview callback and localhost; production uses only the
  documented production callback. No JavaScript origins or write scopes added.
- Declared `openid`, email, calendar-list read, Event read, and availability read
  scopes. Ethan’s account is a test user; the app remains in Testing.
- Stored separate client credentials, encryption keys, and scheduler secrets in
  Vercel Secret fields for production and the `dev` preview branch. App origins
  are Config. Staging credentials are also in private `.env.local`.
- The real Google authorization flow completed against hosted staging after
  Ethan authorized the read-only grant. Calendar selection loaded from Google;
  the primary calendar was deselected before saving. Only a newly created
  fictional verification calendar was selected. No personal Events imported.
- Created fictional all-day, timed, and recurring Events with no other people
  invited. The initial provider snapshot committed to staging. Watch setup then
  failed because Google cannot deliver to the local HTTP callback; the source
  correctly showed an error while retaining the committed snapshot. A deployed
  HTTPS endpoint is required for notification verification.
- Hosted HTTPS notification/recovery checks, the remaining provider acceptance
  cases, fixture cleanup, and production migrations remain incomplete.

## Hosted notification verification and production rollout — 2026-10-27

- Scheduler changed to daily Vercel Cron by Ethan's decision; Vault/`pg_cron`
  installer removed. Watch addresses include the Vercel automation bypass when
  configured. 104 tests, lint, and TypeScript passed after both changes.
- On hosted staging (`dev` preview, signed in as fictional `alex@example.test`),
  Sync now recovered the errored source and registered a watch. With the bypass
  designated, a Google-side rename of a fictional Event reached Hearth 3 seconds
  later without user action. A Google-side cancellation removed it; a moved,
  renamed recurring occurrence updated only that instance. All-day/timed Events
  and their times are stored correctly. Phone width (375 px) shows no horizontal
  overflow. Fictional verification Events remain on the dedicated test calendar.
- Production (`Hearth`, `gclfsxkmtjdxmawwlhba`): applied
  `20261023002210`, `20261023002823`, and `20261023003744`; reconciled
  tool-generated versions to repository versions. Household, Membership, Event,
  Chore, To-do, and Grocery counts unchanged; RLS enabled on all new tables;
  service-only functions not executable by `authenticated`/`anon`. Only new
  advisor notice: intentional RLS-without-policy on `google_calendar_credentials`.
- **Not verified live:** a second Google account and shared-calendar
  deduplication, permission loss and reconnect, Gmail-created Events, calendar
  rename, live range expansion, a production Vercel Cron run (needs
  `CRON_SECRET` and merge), and a production Google connection.
