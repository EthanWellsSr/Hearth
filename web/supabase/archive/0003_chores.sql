-- 0003_chores.sql
-- Chores: household tasks that recur on a schedule. Single-row model — each chore
-- carries its recurrence rule and a next_due date that advances on completion
-- (no separate occurrences table). RLS scopes to the household, like other tables.

create table chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  freq text not null check (freq in ('every_n_days', 'weekly')),
  interval_days int check (interval_days is null or interval_days >= 1),
  weekday smallint check (weekday is null or (weekday between 0 and 6)), -- 0=Sun..6=Sat
  next_due date not null,
  created_at timestamptz not null default now(),
  -- the rule column for the chosen freq must be present
  check (
    (freq = 'every_n_days' and interval_days is not null) or
    (freq = 'weekly' and weekday is not null)
  )
);

alter table chores enable row level security;

create policy "chores in my household" on chores
  for all using (is_member(household_id)) with check (is_member(household_id));
