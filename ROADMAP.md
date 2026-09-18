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

## v0.3.2 — Invitation Links

**Status:** Released 2026-09-15

**Goal:** Let someone who has never used Hearth open a Household invitation and
complete the entire joining flow in their browser.

### Features

- [x] Share and copy a complete Invitation Link from Household people
- [x] Keep the readable Invite Code visible as a backup
- [x] Provide manual, text-message, and email fallbacks when browser sharing APIs
  are unavailable
- [x] Add a public invitation screen that identifies the inviting Household
- [x] Carry the invitation through sign-in, signup, and User Profile setup
- [x] Require explicit confirmation before creating the Membership
- [x] Explain invalid, rotated, and already-joined invitation states
- [x] Keep the existing Invite Code rotation, throttling, and join database function
- [x] Support desktop and phone layouts without requiring Hearth to be installed

## v0.4.0 — Calendar

**Status:** Released 2026-09-18

**Pre-code gate:** Complete. Ethan confirmed the shared design in
`docs/design/v0.4.0-calendar.md` before implementation began.

**Goal:** Give every Member a shared view of what is happening in the Household.

### Confirmed scope

- [x] Add the shared Household Calendar
- [x] Let every Member create, edit, and delete every Event
- [x] Support single-day and multi-day Events
  - Require a 1–100 character title and start
  - Support all-day Events and timed Events with an optional end after the start
  - Treat an all-day end date as inclusive
  - Support up to 2,000 characters of plain-text details
  - Record the creating Member and creation/update timestamps
  - Store timed Events as absolute moments and all-day Events as calendar dates
  - Reject nonexistent daylight-saving times and disambiguate repeated times
  - Retain past Events and require confirmation before deletion
  - Detect concurrent edits instead of silently overwriting another Member's work
- [x] Present Events using familiar Google Calendar behavior
  - Render multi-day Events as continuous bars spanning their affected dates
  - Render timed Events as compact time-and-title rows in month cells
  - Show up to four Events per date on desktop and three on phones before using a
    visible overflow count, reducing this only when screen height requires it
  - Show each Event once in the upcoming list with its complete date range
  - Order all-day and multi-day Events before chronological timed Events
  - Include an Event on every date and upcoming window it overlaps
- [x] Provide a month view and nearby upcoming list on desktop
- [x] Open to the upcoming list on phones, with an easy switch to month view
  - Show compact truncated time-and-title entries and an overflow count in the
    phone month view
- [x] Show Events from the next seven days in the upcoming list
  - If that period is empty, show the next future Event
- [x] Sort and display overlapping Events without warnings or restrictions
- [x] Start weeks on Sunday, show adjacent-month dates in a muted style, and
  provide Today and previous/next controls
- [x] Provide an Add Event action, prefill a selected date, and open an Event into
  a responsive details screen with Edit and Delete actions
  - Preserve entered values and show an inline error when a save fails
  - Use stable routes and keep the selected month in the URL
  - Return Members to Calendar with a clear explanation when an Event is deleted or
    inaccessible
- [x] Add Calendar as the first feature card on the home hub
- [x] Use one soft blue Event treatment, green navigation accents, and restrained
  yellow highlighting for today until Event colors arrive in v0.4.2
- [x] Store a configurable Household timezone
  - Grandfather existing Households into `America/Chicago`
  - Detect the creator's timezone for new Households
  - Allow only an owner to change it from Household people
  - Use a friendly searchable timezone selector backed by IANA identifiers
  - Interpret Event input in the Household timezone regardless of a Member's
    current device timezone
  - Display Event times in the Household timezone without rewriting their absolute
    moments when the timezone changes
  - Keep all-day Events on their selected dates when the timezone changes
  - Warn the owner before a timezone change and explain its effect on timed and
    all-day Events
- [x] Keep external calendar synchronization out of this release
- [x] Keep recurrence, reminders, notifications, Chore display, locations, colors,
  categories, attendees, and attachments out of this release
- [x] Let a non-owner Member leave a Household after explicit confirmation
  - Rotate the Invite Code, retain their Events and User Profile, and make their
    assigned Chores and To-dos Unassigned
- [x] Let an owner transfer ownership to another Member after explicit confirmation
  - Enforce exactly one owner per Household
  - The prior owner becomes a Member and may then leave separately
  - A sole owner cannot leave or delete the Household in this release
  - Place transfer and leave controls in Household management on Household people
- [x] Add one optional Assignee to each To-do
  - Allow assignment during creation and immediate reassignment afterward
  - Show the Assignee's Avatar and display name and retain Unassigned as an option
  - Keep the Assignee visible after completion until normal To-do cleanup
- [x] Apply migration `0007` and verify live Event CRUD, database constraints,
  concurrent-edit detection, Household RLS, owner-only timezone changes, ownership
  transfer, voluntary leaving, Former Member attribution, Invite Code rotation, and
  To-do assignment/unassignment using isolated temporary Households
- [x] Verify ranges across month/year boundaries, daylight-saving behavior, and
  desktop/phone layouts through automated and browser checks
- [ ] Complete physical-iPhone, keyboard navigation, visible focus, and readable
  contrast follow-up after the initial release

## v0.4.1 — Calendar Rhythm

**Status:** Planned

**Pre-code gate:** Required; complete Matt Pocock's `grill-with-docs` process with
Ethan first.

**Goal:** Bring repeating Household responsibilities and timely reminders into the
Calendar.

### Proposed scope

- [ ] Add recurring Events
- [ ] Add Event reminders and notifications
- [ ] Add a seven-day time-grid view with Events positioned by time
- [ ] Show Chores on the Calendar
- [ ] Make Chore scheduling and Calendar presentation use the Household timezone
- [ ] Make completed To-do cleanup use the Household timezone
- [ ] Decide recurrence rules, reminder delivery channels, notification preferences,
  and Chore presentation during the pre-code design gate

## v0.4.2 — Event Organization

**Status:** Planned

**Pre-code gate:** Required; complete Matt Pocock's `grill-with-docs` process with
Ethan first.

**Goal:** Help Members organize and distinguish a busier Household Calendar.

### Proposed scope

- [ ] Add an optional location to Events
- [ ] Add Event colors
- [ ] Add Event categories
- [ ] Decide whether colors belong to individual Events, categories, Members, or a
  combination during the pre-code design gate

## v0.4.3 — Event Collaboration

**Status:** Planned

**Pre-code gate:** Required; complete Matt Pocock's `grill-with-docs` process with
Ethan first.

**Goal:** Let Members coordinate attendance and supporting material for Events.

### Proposed scope

- [ ] Add Event attendees
- [ ] Add Event attachments
- [ ] Decide attendance states, attachment limits, storage, and access rules during
  the pre-code design gate

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

## v0.9.0 — Restricted Accounts

**Status:** Planned; exact roles and permissions intentionally undecided

**Pre-code gate:** Required; complete Matt Pocock's `grill-with-docs` process with
Ethan first.

**Goal:** Let a Household include people who should not receive every adult-level
permission.

### Proposed scope

- [ ] Define the restricted-account roles and their intended users
- [ ] Define permissions for Household data, communication, assignments, settings,
  invitations, and account management
- [ ] Define guardian or owner controls and safety boundaries
- [ ] Do not implement permissions until the complete design tree is resolved and
  Ethan confirms the model

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
