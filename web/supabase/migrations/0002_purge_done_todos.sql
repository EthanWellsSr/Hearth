-- 0002_purge_done_todos.sql
-- Nightly auto-purge of completed to-dos, run inside the database by pg_cron.
-- Fires at local midnight America/Chicago (the Household timezone), DST-correct.
--
-- PREREQ: enable the pg_cron extension first (Dashboard > Database > Extensions >
-- search "pg_cron" > Enable), then run this.

create extension if not exists pg_cron;

-- Why '0 5,6 * * *' + the hour gate: pg_cron schedules in UTC. Midnight in
-- America/Chicago is 06:00 UTC in winter (CST) and 05:00 UTC in summer (CDT).
-- We fire the job at BOTH candidate hours, and the WHERE gate ('local hour = 0')
-- lets only the run that actually lands on local midnight delete anything. This
-- tracks daylight saving automatically instead of drifting by an hour.
select cron.schedule(
  'purge-done-todos',
  '0 5,6 * * *',
  $$
    delete from todos
    where done = true
      and extract(hour from now() at time zone 'America/Chicago') = 0
  $$
);

-- The cron job runs as a privileged role (bypasses RLS), so it purges done to-dos
-- across the whole table. Fine while there is one Household on one timezone; when
-- per-Household timezones land, this becomes per-Household.

-- Verify it registered:   select jobname, schedule from cron.job;
-- Remove it if needed:     select cron.unschedule('purge-done-todos');
