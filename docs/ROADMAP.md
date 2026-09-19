# Hearth roadmap

Future work is grouped into planned releases. Release names and contents are
plans; shipped work moves to [`CHANGELOG.md`](../CHANGELOG.md).

## v0.4.1 — Calendar Rhythm

**Status:** Planned

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

**Goal:** Help Members organize and distinguish a busier Household Calendar.

### Proposed scope

- [ ] Add an optional location to Events
- [ ] Add Event colors
- [ ] Add Event categories
- [ ] Decide whether colors belong to individual Events, categories, Members, or a
  combination during the pre-code design gate

## v0.4.3 — Event Collaboration

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

- CI that runs automated checks on every push
- Multi-Household support and an active-Household switcher
