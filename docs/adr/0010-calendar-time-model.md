# Calendar time model

Date: 2026-09-17

## Status

Accepted

## Context

Hearth needs one shared Calendar whose meaning remains stable when the Household
timezone changes and across daylight-saving transitions. Timed Events and all-day
Events have different invariants: a timed Event represents a moment, while an
all-day Event represents a calendar date.

## Decision

Hearth stores timed Events as absolute instants and all-day Events as calendar
dates, while each Household owns one IANA timezone used for entry and display.
This deliberately avoids forcing two different meanings into timestamps: timed
Events must survive timezone changes without changing when they occur, while
all-day Events must remain on their chosen dates. Local-to-instant conversion is
centralized in one calendar-domain module so daylight-saving gaps and repeated
times are handled consistently across forms, views, and tests.

## Consequences

- Changing the Household timezone changes the displayed clock time for timed
  Events without rewriting their stored instants.
- All-day Events remain on their selected dates.
- Local times that do not exist are rejected; repeated local times require an
  explicit earlier-or-later choice.
- Calendar range, formatting, ordering, and validation logic lives in
  `web/lib/calendar.ts` instead of being duplicated across screens.
- Hearth depends on the Temporal polyfill until the required Temporal API is
  available in every supported runtime.
