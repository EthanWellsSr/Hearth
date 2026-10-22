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
  migration is applied to staging. Production still has v0.4.4; no production
  migration, merge to `master`, or deployment was performed in this work.
- Keep explicit `household_id` filters in every Household-scoped query; the guard
  test catches omissions.

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

## Next

1. **v0.4.6 — Event Reminders & Browser Push** is the next feature release.
   Implementation awaits Ethan starting that work and providing VAPID/Cron setup.
2. Production rollout of the completed v0.4.5 is a separate step: apply its
   migration to production, merge to `master`, and verify the deployed app.

## Blockers

- The [publication review](audits/2026-10-06-repository-publication.md) remains
  a historical record of commit-email exposure and the licensing note; public
  visibility does not establish that a reuse license was granted.
- Public sign-up has no release assignment; Ethan's domain is not selected.
