# Changelog

All notable changes to Hearth are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and Hearth uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Planned releases belong in [`docs/ROADMAP.md`](docs/ROADMAP.md). Current work and
handoff state belong in [`docs/STATUS.md`](docs/STATUS.md).

## [Unreleased]

### Changed

- Reorganized project documentation around a root domain glossary and changelog,
  a future-only roadmap, and a concise release status handoff.
- Added generated third-party software notices and a Licenses link in the app
  footer.

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

[Unreleased]: https://github.com/EthanWellsSr/Hearth/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/EthanWellsSr/Hearth/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/EthanWellsSr/Hearth/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/EthanWellsSr/Hearth/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/EthanWellsSr/Hearth/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/EthanWellsSr/Hearth/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/EthanWellsSr/Hearth/releases/tag/v0.1.0
