# Hearth status

Short handoff for the current release and immediate work. Update this file when
the active plan changes and as part of every release.

## Current completed version

- **v0.4.5 — To-do Editing & Ordering**, completed 2026-10-21 and accepted by
  Ethan. Either Member can edit text, optional due date, and Assignee. One
  Household order supports drag handles and move buttons; completed To-dos appear
  last and new To-dos append to the unfinished list. See the
  [design](design/v0.4.5-todo-editing-ordering.md).
- Implementation `8ced536` is on `dev`; GitHub CI passed. The matching database
  migration is applied to staging and production. PR #5 merged to `master` on
  2026-10-22 as `ce0d6b8`; Ethan confirmed checking the deployed To-do feature on 2026-10-22.
- Keep explicit `household_id` filters in every Household-scoped query; the guard
  test catches omissions.

## To-do checkbox follow-up — 2026-10-22

- Ethan requested square completion boxes after checking the deployed To-do feature.
- Changed the To-do completion button from a circle to a square, leaving unfinished
  boxes empty and retaining the checkmark for completed To-dos.
- Source review confirms the change only affects the completion control's shape
  and unfinished glyph. Existing submission, labels, disabled state, and sizes remain.
- Local lint, build, notices generation, and browser checks could not run because
  the execution environment's network proxy was unavailable. GitHub CI checks
  and migration jobs passed for checkbox commit `2925e6d`; live browser verification
  of the square-box follow-up remains unperformed.
- No database, dependency, or version changes.

## Verification and limitations

- 94 tests, lint, TypeScript, and production build passed. Build uses placeholder
  Supabase configuration because this checkout has no application credentials.
- An isolated PostgreSQL (PGlite) harness verified the migration and ordering,
  completion boundaries, new-item placement, and RLS/anonymous rejection using
  representative tenancy fixtures. This is not a full Supabase rebuild or a
  multi-session concurrency test.
- Desktop (1280 px) and phone (390 px) browser checks passed against actual
  components with simulated server responses: editing, failed-save retry,
  cancellation, completion, addition, arrow moves, pointer drag, and emulated
  touch drag. No horizontal overflow or browser errors.
- Staging migration `20261021222858_todo_editing_ordering` applied on
  2026-10-21 to `hearth-staging` (`lrksljvljdgkbgtklila`). Local filename matches
  the version recorded by the Supabase migration tool.
- All 99,446 existing To-dos retained identical original-field fingerprints;
  no missing positions, original creation order preserved, due dates unset.
- The reusable [staging SQL checks](../web/supabase/tests/todo_editing_ordering.sql)
  passed under the authenticated role as two fictional Members: field edits,
  clearing optional fields, shared order, before/after moves, completed-last,
  reopen position, new-item placement, and cross-Household read/write/move/
  Assignee rejection. Invalid dates and anonymous RPC access were rejected.
  All fictional Users, Memberships, Households, and To-dos were rolled back;
  the existing data fingerprint still matches after testing.
- Security advisors are unchanged from the pre-migration baseline; no new
  findings for this migration. Existing notices cover intentional
  [authenticated SECURITY DEFINER functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
  [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
  on `invite_join_attempts`, and
  [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

- Production migration applied on 2026-10-22 to `Hearth`
  (`gclfsxkmtjdxmawwlhba`) with Ethan's explicit authorization. All five existing
  To-dos retained identical original-field fingerprints and creation order;
  no missing positions, due dates unset, ordering index present, and RLS active.
  Reordering uses caller permissions; authenticated execution is allowed and
  anonymous execution denied. With Ethan’s separate approval, production
  migration history was aligned from tool-generated version `20261022001237`
  to repository/staging version `20261021222858`; the recorded entry was verified
  and the original data fingerprint still matches. No production test data was
  created.

- `AGENTS.md` now defines Ethan's end-to-end release workflow: design with
  `grill-with-docs`, record decisions, implement on `dev`, verify affected flows,
  apply agreed staging/production database updates, sweep repository docs, then
  commit, push, and create/update the PR without separate step approvals.

## Roadmap documentation update — 2026-10-22

- Recorded the confirmed Google Calendar scope as planned v0.4.6 and shifted
  subsequent 0.4.x releases by one. Swept all repository Markdown documents;
  updated README, vocabulary, changelog, roadmap, status, and affected designs.
- Checked changed relative links and release references; no broken targets found.
- Documentation only; application/package version remains v0.4.5.

## To-do retry test follow-up — 2026-10-22

- CI on the roadmap commit exposed a timing race in the edit-retry test: an
  error can render while the transition still disables form fields, so synthetic
  submission at that point omits the edited text from FormData.
- The test now waits until Save is enabled and clicks it before checking the
  retry payload. The existing edited-text assertion remains unchanged.
- Application behavior is unchanged. Local execution remains blocked by the
  unavailable network proxy; verification is delegated to GitHub CI.

## Next

1. **v0.4.6 — Google Calendar Integration** is the next feature release.
   Ethan confirmed the product scope on 2026-10-22; see the
   [design](design/v0.4.6-google-calendar-integration.md). Each User connects
   selected Google calendars for shared, read-only viewing. Each Member controls
   visibility; the Hearth toggle includes Hearth Events and due Chores.
   Automatic synchronization, Sync now, and last-sync times are included.
   Implementation has not started; technical and operational details remain to
   resolve before code.
2. **v0.4.7 — Event Reminders & Browser Push** follows Google Calendar integration;
   VAPID/Cron setup and real-device testing remain future work.
3. Event Organization moves to v0.4.8 and Event Collaboration to v0.4.9.
   The v0.5.0-and-later milestones retain their version numbers and follow these.

## Blockers

- The [publication review](audits/2026-10-06-repository-publication.md) remains
  a historical record of commit-email exposure and the licensing note; public
  visibility does not establish that a reuse license was granted.
- Public sign-up has no release assignment; Ethan's domain is not selected.
