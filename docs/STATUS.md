# Hearth status

Short handoff for the current release and immediate work. Update this file when
the active plan changes and as part of every release.

## Current release

- **v0.4.4 — Production Backup**, released 2026-10-21. A nightly job in the
  private `EthanWellsSr/Hearth-Backup` repository commits production data to
  `backup.sql`; see the [design](design/v0.4.4-production-backup.md). PR #3
  merged to `master` as `1c2b6fe`.
- **v0.4.3 — Production Foundations**, released 2026-10-06: migration baseline,
  CI rebuild, Household query scale fixes, sign-up lock, and public showcase.
- Keep explicit `household_id` filters in every Household-scoped query; the guard
  test catches omissions.

## Verified this cycle

- Backup, 2026-10-21: a manual run committed `backup.sql` (38 KB) containing both
  Auth Users, the Household, its Memberships, and app records. The Restore test
  workflow loaded it into a throwaway Supabase with matching counts and no
  broken links.
- GitHub PR #3: all checks passed. PR #2 (v0.4.3): six checks passed,
  including application and migration CI.
- Local release preparation on 2026-10-06: 75 tests, webpack build, and notices
  check passed. Lint passed for the merged repository.
- Fictional showcase screenshots were inspected at desktop and phone widths.
- Production Auth sign-up is disabled; two existing confirmed Users with
  Memberships were verified before the lock was applied.

## Active work

- **v0.4.5 — To-do Editing & Ordering** is implemented on `dev` and
  verified against staging; unreleased. Ethan confirmed the design and authorized recording
  it without the unavailable `grill-with-docs` skill; see the
  [design](design/v0.4.5-todo-editing-ordering.md).
- Includes optional due dates, atomic field edits, a shared persisted order,
  pointer handles, accessible move buttons, completed-last presentation, and
  recoverable save errors.
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
- `AGENTS.md` now requires staging verification for every implementation and
  records Ethan's standing authorization for staging migrations and fictional
  verification data without separate approval.

## Next

1. Review the `dev` preview with the matching staging schema. Live browser
   integration and multi-session concurrency testing remain follow-up checks;
   authenticated database verification passed. Production was not changed.
2. Event Reminders & Browser Push remain planned as v0.4.6; implementation waits
   for Ethan to start that work and provide VAPID/Cron setup.

## Blockers

- The [publication review](audits/2026-10-06-repository-publication.md) remains
  a historical record of commit-email exposure and the licensing note; public
  visibility does not establish that a reuse license was granted.
- Public sign-up has no release assignment; Ethan's domain is not selected.
