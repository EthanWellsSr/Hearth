# Hearth status

Short handoff for the current release and immediate work. Update this file when
the active plan changes and as part of every release.

## Active priority — documentation and database understanding

- Repository visibility is public, confirmed through GitHub on 2026-10-20.
  The README and fictional screenshots are present; a recorded walkthrough and
  live guest Demo remain deferred.
- Ethan wants a database walkthrough before deciding how to proceed with backups:
  explain the schema, relationships, Auth, RLS, migrations, staging, production,
  and what v0.4.3 changed. Explain backup frequency and encryption separately.
- v0.4.4 Production Backup remains proposed. Do not begin implementation until
  Ethan understands the options and confirms the completed design.
- Production and staging Auth sign-up were recorded as disabled on 2026-10-06.
  The sign-up action and UI removal are merged to `master`; production deployment
  status has not been reverified this session.

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

1. Review the documentation updates with Ethan, then provide the database
   walkthrough when he is ready to proceed.
2. Revisit [the v0.4.4 backup proposal](design/v0.4.4-production-backup.md)
   after that discussion. Resolve whether the proposed nightly encrypted export
   approach is appropriate, then connection credentials, retention, failure
   alerts, restore cadence, and Avatar coverage before implementation.
3. Event Reminders & Browser Push remain planned as v0.4.5; implementation waits
   for Ethan to start that work and provide VAPID/Cron setup.

## Blockers

- Backup design decisions remain open pending the database walkthrough.
- The [publication review](audits/2026-10-06-repository-publication.md) remains
  a historical record of commit-email exposure and the licensing note; public
  visibility does not establish that a reuse license was granted.
- Until a restore is tested, production Household records are not recoverable
  from the migration baseline.
- Public sign-up has no release assignment; Ethan's domain is not selected.
