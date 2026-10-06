# Hearth roadmap

Future work is grouped into planned releases. Release names and contents are
plans; shipped work moves to [`CHANGELOG.md`](../CHANGELOG.md).

## Public project showcase — priority one

**Status:** Scope agreed 2026-10-06; [design](design/public-showcase.md).
Clean and publish the repository with an accurate README and screenshots made
with fictional data. Review tracked files and Git history before changing
visibility. A short recorded walkthrough can follow publication. The deployed
app remains limited to Ethan and his wife. A live guest Demo is deferred unless
it becomes useful.

## v0.4.4 — Production Backup

**Status:** Planned after repository publication. Opening sign-up remains
deferred while Hearth is for Ethan and his wife. See the
[backup design](design/v0.4.4-production-backup.md).

**Goal:** Recover production Household records without upgrading Supabase from
the Free plan.

### Scope

- [ ] Run nightly encrypted database exports from a separate private GitHub
  repository and retain them within the GitHub Free storage allowance.
- [ ] Keep the decryption key outside GitHub and monitor failed or missed runs.
- [ ] Restore a backup into an isolated non-production database and verify it.
- [ ] Decide whether private Avatar objects need a separate Storage backup.

## Public Sign-up — deferred

**Status:** No release assigned. Hearth remains usable only by Ethan and his
wife. The [partial design](design/v0.4.4-public-sign-up.md) is retained for a
future decision; it does not govern repository visibility.

## v0.4.5 — Event Reminders & Browser Push

**Status:** Planned; design already recorded in
[`docs/design/v0.4.1-calendar-rhythm.md`](design/v0.4.1-calendar-rhythm.md)

**Goal:** Deliver timely Event reminders to opted-in Members through browser push.

**Split note:** This scope began as part of v0.4.1 (Calendar Rhythm). Recurring
Events, the week view, Chores on the Calendar, and timezone-correct maintenance
shipped in v0.4.1; reminders were split into their own release because they
require deployment secrets, Supabase Cron, and real-device testing that the rest
of the calendar work did not. The reminder/push schema (migration `0010`:
`event_reminders`, `push_subscriptions`, `event_reminder_deliveries`) is already
applied as groundwork, and unwired opt-in/service-worker scaffolding exists in the
working tree.

### Proposed scope

- [ ] Configure reminder offsets on Events (multiple offsets or none), inherited by
  a series unless an Event Occurrence overrides them
- [ ] Persist Event and reminder changes together transactionally
- [ ] Populate an idempotent delivery outbox keyed by reminder, occurrence,
  recipient, and channel, with all-day reminders at 9:00 AM in the Event timezone
- [ ] Add a protected sender (route or Supabase Edge Function) invoked by Supabase
  Cron using deployment-held VAPID secrets, rechecking Event, Membership, and
  subscription state before sending
- [ ] Send per-device browser push to opted-in Members with a payload of title and
  time only — never Event details
- [ ] Handle retries and remove expired (404/410) subscriptions
- [x] Decide recurrence rules, reminder delivery channels, notification
  preferences, and Chore presentation during the pre-code design gate

## v0.4.6 — Event Organization

**Status:** Planned

**Goal:** Help Members organize and distinguish a busier Household Calendar.

### Proposed scope

- [ ] Add an optional location to Events
- [ ] Add Event colors
- [ ] Add Event categories
- [ ] Decide whether colors belong to individual Events, categories, Members, or a
  combination during the pre-code design gate

## v0.4.7 — Event Collaboration

**Status:** Planned

**Goal:** Let Members coordinate attendance and supporting material for Events.

### Proposed scope

- [ ] Add Event attendees
- [ ] Add Event attachments
- [ ] Decide attendance states, attachment limits, storage, and access rules during
  the pre-code design gate

## v0.5.0 — Meal Plan

**Status:** Planned

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

- Multi-Household support and an active-Household switcher
