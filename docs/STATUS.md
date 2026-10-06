# Hearth status

Short handoff for the current release and immediate work. Update this file when
the active plan changes and as part of every release.

## Active priority — public repository

- The README and fictional screenshots are ready. The repo is still private while
  Ethan reviews the historical commit-email exposure and decides whether to add
  a license. Do not change visibility until he approves.
- Production and staging Supabase Auth block new sign-ups. The sign-up action and
  UI removal are merged to `master`; production deployment status should be
  confirmed separately.
- Database backup follows repository publication and is now planned for v0.4.4.
  Migrations and fictional seed data cannot recover production Household records.

## Current release

- **v0.4.3 — Production Foundations**, released 2026-10-06. PR #2 merged to
  `master` as `fbe981e`; GitHub reported all six checks passed. The release adds
  the migration baseline and CI rebuild, Household query and database scale
  improvements, sign-up lock, and public showcase materials.
- Production schema baseline and scale migrations were applied and verified on
  2026-09-29. The staging scale test passed at 50 and 100 active Users on its
  1,000-Household seed, with zero errors and about 3 ms database time per page.
- The scale test showed RLS can scan many rows before filtering. Keep explicit
  `household_id` filters in every Household-scoped query; the guard test catches
  omissions.

## Verified this cycle

- GitHub PR #2: six checks passed, including application and migration CI.
- Local release preparation on 2026-10-06: 75 tests, webpack build, and notices
  check passed. Lint passed with one warning from a local untracked scale-test
  draft. The warning is not in the merged repository.
- Fictional showcase screenshots were inspected at desktop and phone widths.
- Production Auth sign-up is disabled; two existing confirmed Users with
  Memberships were verified before the lock was applied.

## Next

1. Complete the public repository review and change visibility only after Ethan
   approves the known email exposure and licensing choice. The live guest Demo
   remains deferred.
2. After publication, start v0.4.4 Production Backup using
   [`docs/design/v0.4.4-production-backup.md`](design/v0.4.4-production-backup.md).
   Resolve connection credentials, retention, failure alerts, restore cadence,
   and whether Avatar objects need separate coverage before implementation.
3. Event Reminders & Browser Push remain planned as v0.4.5; implementation waits
   for Ethan to start that work and provide VAPID/Cron setup.

## Blockers

- Repository visibility still needs Ethan's explicit approval. See the
  [publication review](audits/2026-10-06-repository-publication.md) for the
  historical email exposure and license note.
- Until a restore is tested, production Household records are not recoverable
  from the migration baseline.
- Public sign-up has no release assignment; Ethan's domain is not selected.
