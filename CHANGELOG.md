# Hearth changelog

This file records the high-level contents of shipped Hearth releases. Planned
releases belong in `ROADMAP.md`; the current implementation and handoff state
belong in `PROGRESS.md`.

## v0.3.2 — Invitation Links — 2026-09-15

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

## v0.3.1 — 2026-09-14

- Fixed Avatar saves from iPhone Photos by using a broadly supported browser
  encoding and normalizing uploaded image contents on the server.
- Added server-side Avatar validation and stable 512×512 WebP output without
  changing the existing private Supabase Storage model.
- Fixed inactive profile controls during local iPhone testing by permitting
  Next.js development resources from the development machine's LAN addresses.
- Expanded automated coverage to 19 tests, including browser image-format
  fallback and server-side Avatar normalization.

## v0.3.0 — Familiar Faces — 2026-09-14

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

## v0.2.0 — 2026-09-12

- Added self-serve Household onboarding: a User can create a Household or join one
  with an Invite Code.
- Made Hearth installable as a progressive web app (PWA).
- Rebuilt the interface around the approved light meadow visual direction,
  including the Hearth logo, botanical backdrop, header, feature cards, forms,
  and responsive layouts.
- Added the repository guides used by contributors and coding agents.

## v0.1.0 — 2026-09-11

- Added email-and-password authentication.
- Added Household tenancy with Memberships and row-level security (RLS).
- Added shared To-dos with completion, deletion, and nightly cleanup.
- Added the Grocery List with bought-item handling and bulk cleanup.
- Added recurring Chores with due-date advancement and optional Member assignment.
- Added the initial responsive botanical interface and home navigation hub.
- Added recurrence tests and the application version footer.
