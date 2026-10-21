# Hearth status

Short handoff for the current release and immediate work. Update this file when
the active plan changes and as part of every release.

## Current release

- **v0.4.4 — Production Backup**, released 2026-10-21. A nightly job in the
  private `EthanWellsSr/Hearth-Backup` repository commits production data to
  `backup.sql`; see the [design](design/v0.4.4-production-backup.md).
- **v0.4.3 — Production Foundations**, released 2026-10-06: migration baseline,
  CI rebuild, Household query scale fixes, sign-up lock, and public showcase.
- Keep explicit `household_id` filters in every Household-scoped query; the guard
  test catches omissions.

## Verified this cycle

- Backup, 2026-10-21: a manual run committed `backup.sql` (38 KB) containing both
  Auth Users, the Household, its Memberships, and app records. No restore has
  been rehearsed.
- GitHub PR #2: six checks passed, including application and migration CI.
- Local release preparation on 2026-10-06: 75 tests, webpack build, and notices
  check passed. Lint passed for the merged repository.
- Fictional showcase screenshots were inspected at desktop and phone widths.
- Production Auth sign-up is disabled; two existing confirmed Users with
  Memberships were verified before the lock was applied.

## Next

1. Rehearse a restore: apply migrations to a throwaway database and load
   `backup.sql`.
2. v0.4.5 To-do Editing & Ordering is next on the roadmap.
3. Event Reminders & Browser Push remain planned as v0.4.6; implementation waits
   for Ethan to start that work and provide VAPID/Cron setup.

## Blockers

- The [publication review](audits/2026-10-06-repository-publication.md) remains
  a historical record of commit-email exposure and the licensing note; public
  visibility does not establish that a reuse license was granted.
- Public sign-up has no release assignment; Ethan's domain is not selected.
