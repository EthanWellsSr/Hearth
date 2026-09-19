-- Household-local Chore calculations happen in application actions. This
-- migration makes completed To-do retention timezone-aware in the database.

alter table todos
  add column if not exists completed_at timestamptz;

update todos
set completed_at = coalesce(completed_at, now())
where done = true;

create or replace function sync_todo_completed_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.done and (not old.done or new.completed_at is null) then
    new.completed_at := now();
  elsif not new.done then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists todos_sync_completed_at on todos;
create trigger todos_sync_completed_at
before update of done on todos
for each row execute function sync_todo_completed_at();

-- Replace the original Chicago-only job. Running hourly covers every IANA
-- timezone; the local-hour gate performs one cleanup pass per Household day.
do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'purge-done-todos'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'purge-done-todos-by-household-timezone',
  '15 * * * *',
  $job$
    delete from todos t
    using households h
    where t.household_id = h.id
      and t.done = true
      and t.completed_at is not null
      and extract(hour from now() at time zone h.timezone) = 3
      and (t.completed_at at time zone h.timezone)::date
        < (now() at time zone h.timezone)::date
  $job$
);

create index if not exists todos_completed_cleanup_idx
  on todos (household_id, completed_at)
  where done = true;
