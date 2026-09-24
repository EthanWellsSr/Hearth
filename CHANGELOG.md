# Changelog

All notable changes to Hearth are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and Hearth uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Planned releases belong in [`docs/ROADMAP.md`](docs/ROADMAP.md). Current work and
handoff state belong in [`docs/STATUS.md`](docs/STATUS.md).

## [Unreleased]

## [0.4.2] - 2026-09-24

### Added

- Added `web/scripts/measure-navigation.js`, a browser-console harness that
  measures 20 in-app transitions against the v0.4.2 latency targets.
- Added tests for assignee rollback, dropdown dismissal, and pending submit
  buttons.
- Added a persistent authenticated application shell and immediate route loading
  state so navigation retains the header and acknowledges a selection while
  page-specific data loads.
- Added migration `0012` with RLS-active Household-context and Calendar-window
  functions, reducing those read paths to one database round trip each.
  Migration `0013` revokes their anonymous execute grant.
- Added pending states to common list, Chore, Event, and Household actions.
- Added a formatted Licenses page listing each package and its license text,
  replacing the raw notices file link in the footer.

### Changed

- Configured Vercel Functions for Portland (`pdx1`) near the Supabase primary and
  cached private Avatar signed URLs below their one-hour validity.
- Enabled client router caching (`staleTimes`: 30s dynamic, 180s static) so
  recently visited pages reappear instantly; Server Actions still revalidate.
- Stopped prefetching the per-day and per-hour add-Event links in the Month and
  Week views, which issued dozens of server requests on every Calendar load.

### Fixed

- The web app manifest now loads behind Vercel Deployment Protection: it is
  served from `/site.webmanifest` and linked with `crossorigin="use-credentials"`,
  replacing Next's auto-injected link that failed with CORS errors.
- Calendar view tabs and month/week paging acknowledge a click immediately with
  a pending state; these same-page navigations never showed the route loading
  state and previously sat unresponsive for about 300ms.
- A failed To-do or Chore reassignment now restores the previous assignee and
  shows an error; the reassign actions report database failures and
  RLS-rejected updates instead of silently succeeding.
- Assignee and avatar dropdowns now open above neighboring cards and the footer,
  and close on an outside click, Escape, or opening another dropdown.
- Reduced authenticated navigation latency by deduplicating request-scoped User
  and User Profile loading, validating sessions with locally verifiable JWT
  claims, loading Memberships alongside User Profiles, and reusing the Household
  timezone returned with Membership context.
- Removed redundant Household-timezone queries from Calendar and Chore screens
  and mutations, and parallelized the independent Chore-list queries.
- Added migration `0014`, which revokes anonymous execute on every remaining app
  function, scopes the five role-less Household-data policies to authenticated
  users, and stops future public functions from granting anonymous execute.

## [0.4.1] - 2026-09-19

### Added

- Added Recurring Events with a typed, RFC 5545-compatible rule set: daily,
  weekly, monthly, and yearly frequencies; configurable intervals; multiple
  weekdays for weekly rules; and never, on-a-date, or after-a-count end
  conditions. Occurrences expand only for the requested Calendar window.
- Added a series master plus Event Occurrence exceptions, with per-occurrence,
  this-and-future, and entire-series changes and deletions. Moved occurrences keep
  their original identity, this-and-future changes split the series transactionally,
  and all mutations use optimistic concurrency that rejects stale writes.
- Added the seven-day Week view with an all-day lane and a 24-hour time grid,
  side-by-side overlaps, phone horizontal scrolling with sticky day headers and
  time gutter, an Upcoming sidebar at wide widths, and click-to-prefill of a new
  Event's date and time.
- Added Chores on the Calendar as all-day Calendar Items on their stored `next_due`
  date, an explicit Upcoming overdue section, and direct completion that refreshes
  both Calendar and Chores. Events and Chores remain separate entities.
- Added a shared Calendar Item projection with bounded, date-range Calendar queries
  so Month, Upcoming, and Week never load the full Event history.
- Made Chore scheduling and completed To-do cleanup use each Household's timezone;
  completed To-dos now record `completed_at` and are cleared per Household-local
  day.
- Added migrations `0008` (Household-timezone maintenance), `0009` (Recurring
  Events and occurrence exceptions), and `0011` (transactional occurrence mutation
  functions), applied to Supabase. Migration `0010` (reminder and push schema) is
  applied as groundwork for the reminders release.
- Hardened the PWA manifest (id, scope, icons) and added 192px and 512px app
  icons.
- Expanded automated coverage to 58 tests across recurrence expansion, occurrence
  exceptions, and split arithmetic.

### Changed

- Reorganized project documentation around a root domain glossary and changelog,
  a future-only roadmap, and a concise release status handoff.
- Added generated third-party software notices and a Licenses link in the app
  footer.

### Fixed

- Prevented stale-write conflicts in recurring Event mutations from using
  PostgreSQL's automatically retried serialization-failure code. Conflicts now
  return immediately as non-retryable application errors while real row-lock
  contention retains a three-second timeout.

### Deferred

- Event reminders and browser push moved to their own release (now v0.4.3) because
  they require deployment secrets, Supabase Cron, and real-device testing. Unwired
  opt-in and service-worker scaffolding remains in the working tree.

## [0.4.0] - 2026-09-18

### Added

- Added the shared Household Calendar with responsive month and upcoming views,
  all-day and timed Events, multi-day spans, details, editing, deletion, and
  optimistic concurrency protection.
- Added one configurable Household timezone, daylight-saving validation, and
  stable absolute-time storage for timed Events while preserving all-day dates.
- Added owner-only timezone management and ownership transfer, plus voluntary
  Household leaving with Invite Code rotation and Former Member attribution.
- Added optional To-do Assignees with Member display names and Avatars; departing
  Members are automatically unassigned from Chores and To-dos.
- Added migration `0007`, applied it to Supabase, and completed isolated live
  acceptance checks for Event CRUD, database constraints, RLS, ownership, leaving,
  and assignment cleanup.
- Expanded automated coverage to 45 tests and added Calendar as the first feature
  on the home hub.

## [0.3.2] - 2026-09-15

### Added

- Added complete Invitation Links that Members can copy or share from Household
  people while retaining the readable Invite Code as a backup.
- Added a public invitation screen that identifies the Household and carries the
  invitation through sign-in, signup, and User Profile setup.
- Added explicit join confirmation and clear invalid, rotated, and already-joined
  invitation states while preserving the existing rate-limited join function.
- Added selectable-link, text-message, and email fallbacks for browsers that
  restrict clipboard and native sharing APIs, including plain-HTTP phone testing.
- Expanded automated coverage to 28 tests, including Invitation Link construction,
  login preservation, sharing controls, and restricted-browser fallbacks.

## [0.3.1] - 2026-09-14

### Fixed

- Fixed Avatar saves from iPhone Photos by using a broadly supported browser
  encoding and normalizing uploaded image contents on the server.
- Added server-side Avatar validation and stable 512×512 WebP output without
  changing the existing private Supabase Storage model.
- Fixed inactive profile controls during local iPhone testing by permitting
  Next.js development resources from the development machine's LAN addresses.
- Expanded automated coverage to 19 tests, including browser image-format
  fallback and server-side Avatar normalization.

## [0.3.0] - 2026-09-14

### Added

- Added required User Profiles with editable display names and private Avatars.
- Added an Avatar editor with crop, pan, zoom, rotation, HEIC support, and the
  Hearth logo as the default image.
- Replaced email-based Chore assignments with Member display names and Avatars;
  assignments can be changed immediately or left Unassigned.
- Added the Household people screen with Member names, Avatars, and roles.
- Added reusable eight-character Invite Codes that every Member can view, copy,
  and share; owners can rotate them.
- Added owner-controlled Member removal, automatic Chore unassignment, and
  automatic Invite Code rotation after removal.
- Added profile and Household people navigation to the header and home hub.
- Expanded automated coverage to 16 tests across recurrence, profile validation,
  and Avatar form submission.

## [0.2.0] - 2026-09-12

### Added

- Added self-serve Household onboarding: a User can create a Household or join one
  with an Invite Code.
- Made Hearth installable as a progressive web app (PWA).
- Rebuilt the interface around the approved light meadow visual direction,
  including the Hearth logo, botanical backdrop, header, feature cards, forms,
  and responsive layouts.
- Added the repository guides used by contributors and coding agents.

## [0.1.0] - 2026-09-11

### Added

- Added email-and-password authentication.
- Added Household tenancy with Memberships and row-level security (RLS).
- Added shared To-dos with completion, deletion, and nightly cleanup.
- Added the Grocery List with bought-item handling and bulk cleanup.
- Added recurring Chores with due-date advancement and optional Member assignment.
- Added the initial responsive botanical interface and home navigation hub.
- Added recurrence tests and the application version footer.

[Unreleased]: https://github.com/EthanWellsSr/Hearth/compare/v0.4.2...HEAD
[0.4.2]: https://github.com/EthanWellsSr/Hearth/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/EthanWellsSr/Hearth/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/EthanWellsSr/Hearth/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/EthanWellsSr/Hearth/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/EthanWellsSr/Hearth/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/EthanWellsSr/Hearth/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/EthanWellsSr/Hearth/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/EthanWellsSr/Hearth/releases/tag/v0.1.0
