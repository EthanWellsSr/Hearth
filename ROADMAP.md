# Hearth roadmap

Future work is grouped into planned releases. Release names and contents are plans;
the matching Git tag is created only when a release ships.

## Development-cycle gate

For `v0.4.0` and every later feature release, invoke Matt Pocock's
`grill-with-docs` skill before any code is written. It invokes the `grilling` and
`domain-modeling` skills so Ethan and the agent establish and record a shared
understanding of the release goal, user flows, data model, boundaries, and
acceptance criteria. Implementation begins only after Ethan confirms that the
design tree is resolved.

The skills come from [Matt Pocock's skill library](https://github.com/mattpocock/skills)
and are installed globally for Codex under `~/.codex/skills/`, independent of this
repository and its branches. The entrypoint is
`~/.codex/skills/grill-with-docs/SKILL.md`. If the library is missing, reinstall it
with `npx skills@latest add mattpocock/skills` before beginning implementation.

## v0.3.0 — Familiar Faces

**Status:** Released 2026-09-14

**Goal:** Make every Member recognizable by name and face wherever household work
is assigned.

### Features

- [x] Add a profile for each User
  - A User can set and edit their display name
  - A User can upload, replace, or remove their avatar photo
  - Hearth uses the Hearth logo as the default avatar when no photo is selected
  - Avatar files live in private storage; the database stores their file locations
  - Display names are required, 1–50 characters, and do not need to be unique
- [x] Add profile setup and management
  - After authentication, new Users complete their profile before creating or
    joining a Household
  - Existing Users review their prefilled display name once after the upgrade
  - Users can edit their own profile from a profile settings screen
  - The avatar editor supports crop, pan, zoom, and 90-degree rotation, then saves
    a normalized 512×512 image
  - The editor accepts JPEG, PNG, WebP, and iPhone HEIC source images up to 10 MB
- [x] Personalize Chore assignments
  - Each assigned Chore shows the Assignee's avatar and display name
  - The assignment control presents Members by avatar and display name
  - Chores can remain Unassigned
  - Selecting an Assignee saves immediately
- [x] Add a Household people screen
  - Members can see every Member's avatar, display name, and Membership role, but
    not their email address
  - Every Member can view, copy, and share the current Invite Code
  - An owner can rotate the Invite Code, immediately invalidating the previous code
  - New Invite Codes contain eight readable characters and join attempts are
    throttled
  - An owner can remove another non-owner Member after explicit confirmation;
    their User Profile and Avatar remain, their Chores become Unassigned, and the
    Invite Code rotates automatically
- [x] Add profile and people navigation
  - The header avatar opens My profile, Household people, and Sign out actions
  - The home welcome card links to Household people with a compact Member avatar row

## v0.4.0 — Calendar

**Status:** Planned

**Pre-code gate:** Required; complete Matt Pocock's `grill-with-docs` process with
Ethan first.

**Goal:** Give every Member a shared view of what is happening in the Household.

### Proposed scope

- [ ] Add the shared Household Calendar
- [ ] Let Members create, edit, and delete Events
- [ ] Support timed and all-day Events with a title, date, time, and optional details
- [ ] Provide useful month and upcoming views at desktop and phone widths
- [ ] Make the Household timezone configurable and use it consistently for Events
- [ ] Keep external calendar synchronization out of this release
- [ ] Let a non-owner Member leave a Household voluntarily
- [ ] Let an owner transfer ownership before leaving a Household
- [ ] Add optional Assignees to To-dos and show their Avatars and display names

## v0.5.0 — Meal Plan

**Status:** Planned

**Pre-code gate:** Required; complete Matt Pocock's `grill-with-docs` process with
Ethan first.

**Goal:** Let Members plan Meals manually and establish the structured food data
needed for later automation.

### Proposed scope

- [ ] Add a weekly Meal Plan
- [ ] Let Members add, edit, move, and remove Meals for each day
- [ ] Add reusable Recipes with Ingredients and preparation steps
- [ ] Let Members build the Meal Plan from saved Recipes or simple custom Meals
- [ ] Keep AI generation and Grocery List generation out of this release

## v0.6.0 — Connected Expenses

**Status:** Planned; integration provider not selected

**Pre-code gate:** Required; complete Matt Pocock's `grill-with-docs` process with
Ethan first.

**Goal:** Show a live Household Expense feed sourced from a linked Payment Source.

### Proposed scope

- [ ] Add the Household Expense feed and supporting Expense data model
- [ ] Let an authorized Member link and manage a Payment Source through a
  third-party aggregator
- [ ] Import new Expenses automatically and prevent duplicate imports
- [ ] Show synchronization status and clear reconnect or failure states
- [ ] Keep aggregator credentials and tokens server-only and preserve Household
  isolation throughout synchronization

## v0.7.0 — AI-assisted Meal Plan

**Status:** Planned

**Pre-code gate:** Required; complete Matt Pocock's `grill-with-docs` process with
Ethan first.

**Goal:** Generate an editable Meal Plan and turn its Recipe Ingredients into useful
Grocery Items.

### Proposed scope

- [ ] Let Members provide planning preferences and request a generated Meal Plan
- [ ] Present AI suggestions as a draft that Members can edit, regenerate, or accept
- [ ] Save accepted Meals as structured Meals, Recipes, and Ingredients
- [ ] Add selected Recipe Ingredients to the Grocery List
- [ ] Combine duplicate Ingredients and preserve useful quantities where practical
- [ ] Explain what Household information is sent to the AI provider before generation

## v0.8.0 — Household Messaging & Notifications

**Status:** Planned

**Pre-code gate:** Required; complete Matt Pocock's `grill-with-docs` process with
Ethan first.

**Goal:** Let Members communicate inside Hearth and reliably notice new Messages
and Chore activity that needs their attention.

### Proposed scope

- [ ] Add a Household messaging interface
  - Let Members send and receive Messages within their Household
  - Show each sender's Avatar and display name with the Message timestamp
  - Provide unread state so Members can distinguish new Messages
- [ ] Add a shared notification system for Messages and Chores
  - Notify Members about new unread Messages
  - Notify a Member when a Chore is assigned or reassigned to them
  - Notify the Assignee when a Chore is approaching its due time or becomes overdue
  - Let Members view notifications in Hearth and mark them as read
  - Decide browser or device push delivery and notification preferences during the
    pre-code design gate
- [ ] Keep all Messages and notifications Household-scoped and protected by RLS

## Unscheduled product scope

These capabilities are part of Hearth's documented product vocabulary but have not
been assigned to a release:

- Notes

## Unscheduled platform work

- CI that runs automated checks on every push
- Multi-Household support and an active-Household switcher

## Release template

```md
## v0.x.0 — Release name

**Status:** Planned
**Pre-code gate:** Required for `v0.4.0` and later; complete Matt Pocock's
`grill-with-docs` process with Ethan before writing code.
**Goal:** One user-facing outcome for this release.

### Features

- [ ] Feature name
  - What a Member can do when it is complete
  - Important acceptance checks or boundaries
```
