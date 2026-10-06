-- Recurring Event series retain the existing Event row as their master. The
-- rule is a typed RFC 5545-compatible subset. Exceptions preserve the stable
-- identity of the original occurrence even when it is moved.

alter table events
  add column recurrence_frequency text
    check (recurrence_frequency is null or recurrence_frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  add column recurrence_interval integer
    check (recurrence_interval is null or recurrence_interval between 1 and 99),
  add column recurrence_weekdays smallint[],
  add column recurrence_end_date date,
  add column recurrence_count integer
    check (recurrence_count is null or recurrence_count between 1 and 999),
  add column recurrence_timezone text;

alter table events add constraint events_recurrence_shape check (
  (
    recurrence_frequency is null
    and recurrence_interval is null
    and recurrence_weekdays is null
    and recurrence_end_date is null
    and recurrence_count is null
    and recurrence_timezone is null
  )
  or
  (
    recurrence_frequency is not null
    and recurrence_interval is not null
    and recurrence_timezone is not null
    and not (recurrence_end_date is not null and recurrence_count is not null)
    and (
      recurrence_frequency <> 'weekly'
      or (
        recurrence_weekdays is not null
        and cardinality(recurrence_weekdays) between 1 and 7
        and recurrence_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
      )
    )
  )
);

create index events_active_recurrence_idx
  on events (household_id, recurrence_end_date)
  where recurrence_frequency is not null;

create or replace function validate_event_recurrence_timezone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.recurrence_timezone is not null and not exists (
    select 1 from pg_timezone_names where name = new.recurrence_timezone
  ) then
    raise exception 'Choose a valid recurrence timezone.';
  end if;
  return new;
end;
$$;

create trigger events_validate_recurrence_timezone
before insert or update of recurrence_timezone on events
for each row execute function validate_event_recurrence_timezone();

create table event_occurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  series_id uuid not null references events(id) on delete cascade,
  original_occurrence_key text not null,
  cancelled boolean not null default false,
  title text check (title is null or (title = btrim(title) and char_length(title) between 1 and 100)),
  details text check (details is null or char_length(details) <= 2000),
  all_day boolean,
  start_date date,
  end_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, original_occurrence_key),
  check (
    cancelled
    or (
      title is not null
      and all_day is not null
      and (
        (all_day and start_date is not null and starts_at is null and ends_at is null and (end_date is null or end_date >= start_date))
        or
        (not all_day and start_date is null and end_date is null and starts_at is not null and (ends_at is null or ends_at > starts_at))
      )
    )
  )
);

create or replace function validate_event_exception_household()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from events
    where id = new.series_id
      and household_id = new.household_id
      and recurrence_frequency is not null
  ) then
    raise exception 'Exception and recurring Event must belong to the same Household.';
  end if;
  return new;
end;
$$;

create trigger event_exceptions_validate_household
before insert or update of household_id, series_id on event_occurrence_exceptions
for each row execute function validate_event_exception_household();

create trigger event_exceptions_set_updated_at_and_version
before update on event_occurrence_exceptions
for each row execute function set_event_updated_at_and_version();

alter table event_occurrence_exceptions enable row level security;
create policy "event exceptions in my household" on event_occurrence_exceptions
  for all to authenticated
  using (is_member(household_id))
  with check (is_member(household_id));
