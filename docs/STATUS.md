# Hearth status

Short handoff for the current release and immediate work. Update this file when
the active plan changes and as part of every release.

## Active priority — finish backup configuration outside this cloud session

- Hearth is public; the private `EthanWellsSr/Hearth-Backup` repository now exists.
  Ethan created it and authorized workflow setup after the database discussion.
- Backup repository commit `576f495` publishes the workflow, export/encryption
  script, setup README, and ignore rules. v0.4.4 is in progress, not released.
- Execution is gated by `BACKUP_ENABLED == 'true'`; an unset variable keeps it
  disabled. No production export, key generation, or restore has been performed.
- This connection can push files and dispatch workflows, but setting an Actions
  variable returned HTTP 403. Secret management has not been verified. Continue
  configuration through Ethan's GitHub settings or another authorized instance.
- Production and staging Auth sign-up were recorded as disabled on 2026-10-06;
  production deployment and live database state were not reverified this session.

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

- Backup setup, 2026-10-21: repository privacy verified; workflow passes
  `actionlint`, shell syntax, and synthetic success/failure-path checks. GitHub
  [run 39628307846](https://github.com/EthanWellsSr/Hearth-Backup/actions/runs/39628307846)
  completed as skipped, confirming the execution gate. No backup job steps ran.
- Actual database export, encryption/decryption, artifact storage size, and restore
  remain untested. Earlier app checks below are historical, not fresh runs.

- GitHub PR #2: six checks passed, including application and migration CI.
- Local release preparation on 2026-10-06: 75 tests, webpack build, and notices
  check passed. Lint passed for the merged repository.
- Fictional showcase screenshots were inspected at desktop and phone widths.
- Production Auth sign-up is disabled; two existing confirmed Users with
  Memberships were verified before the lock was applied.

## Next

1. Ethan generates the private `age` key on his trusted computer outside agent
   access and preserves a protected recovery copy. Configure only its public
   recipient in GitHub, plus the production connection secrets.
2. Follow [the handoff](../backup-creation.md): verify server/client compatibility
   and access, configure notifications, enable the workflow, run the first export,
   and prove a restore into an isolated target. Measure retention/storage, choose
   missed-run monitoring and restore cadence, and decide Avatar coverage.
3. Event Reminders & Browser Push remain planned as v0.4.6; implementation waits
   for Ethan to start that work and provide VAPID/Cron setup.

## Blockers

- Backup execution awaits public-recipient and connection configuration. The
  current connection cannot set Actions variables; the private key must remain
  outside agent access. Retention, monitoring, Avatar coverage, and restore
  acceptance remain open.
- The [publication review](audits/2026-10-06-repository-publication.md) remains
  a historical record of commit-email exposure and the licensing note; public
  visibility does not establish that a reuse license was granted.
- Until a restore is tested, production Household records are not recoverable
  from the migration baseline.
- Public sign-up has no release assignment; Ethan's domain is not selected.
