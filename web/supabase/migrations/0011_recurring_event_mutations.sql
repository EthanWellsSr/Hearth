-- Transactional mutation paths for recurring Events. Each function is
-- SECURITY INVOKER so row-level security stays active and the caller must be a
-- Member of the owning Household. Optimistic concurrency rejects stale writes by
-- comparing the caller's expected version against the locked row.

-- Create or replace a single occurrence override (or cancellation). The caller
-- passes the series version it saw and, when an exception already exists, that
-- exception's version. A null expected exception version means "expect none".
create or replace function upsert_event_occurrence_exception(
  p_series_id uuid,
  p_occurrence_key text,
  p_expected_series_version integer,
  p_expected_exception_version integer,
  p_cancelled boolean,
  p_title text,
  p_details text,
  p_all_day boolean,
  p_start_date date,
  p_end_date date,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns event_occurrence_exceptions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_household_id uuid;
  v_series_version integer;
  v_existing event_occurrence_exceptions;
  v_result event_occurrence_exceptions;
begin
  -- Fail fast instead of queueing behind a concurrent writer's row lock.
  set local lock_timeout = '3s';
  select household_id, version
    into v_household_id, v_series_version
  from events
  where id = p_series_id and recurrence_frequency is not null
  for update;
  if not found then
    raise exception 'This recurring Event is no longer available.'
      using errcode = 'no_data_found';
  end if;
  if v_series_version <> p_expected_series_version then
    raise exception 'This series changed while you were editing.'
      using errcode = 'P0001';
  end if;

  select *
    into v_existing
  from event_occurrence_exceptions
  where series_id = p_series_id and original_occurrence_key = p_occurrence_key
  for update;

  if found then
    if p_expected_exception_version is null
       or v_existing.version <> p_expected_exception_version then
      raise exception 'This occurrence changed while you were editing.'
        using errcode = 'P0001';
    end if;
    update event_occurrence_exceptions set
      cancelled = p_cancelled,
      title = p_title,
      details = p_details,
      all_day = p_all_day,
      start_date = p_start_date,
      end_date = p_end_date,
      starts_at = p_starts_at,
      ends_at = p_ends_at
    where id = v_existing.id
    returning * into v_result;
  else
    if p_expected_exception_version is not null then
      raise exception 'This occurrence changed while you were editing.'
        using errcode = 'P0001';
    end if;
    insert into event_occurrence_exceptions (
      household_id, series_id, original_occurrence_key,
      cancelled, title, details, all_day, start_date, end_date, starts_at, ends_at
    ) values (
      v_household_id, p_series_id, p_occurrence_key,
      p_cancelled, p_title, p_details, p_all_day, p_start_date, p_end_date, p_starts_at, p_ends_at
    )
    returning * into v_result;
  end if;

  return v_result;
end;
$$;

-- Delete this occurrence and every later one: end the original series the day
-- before the split date and drop exceptions on or after it. Occurrences before
-- the split are untouched.
create or replace function truncate_event_series(
  p_series_id uuid,
  p_expected_series_version integer,
  p_split_date date
)
returns events
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_series_version integer;
  v_result events;
begin
  set local lock_timeout = '3s';
  select version into v_series_version
  from events
  where id = p_series_id and recurrence_frequency is not null
  for update;
  if not found then
    raise exception 'This recurring Event is no longer available.'
      using errcode = 'no_data_found';
  end if;
  if v_series_version <> p_expected_series_version then
    raise exception 'This series changed while you were editing.'
      using errcode = 'P0001';
  end if;

  delete from event_occurrence_exceptions
  where series_id = p_series_id
    and original_occurrence_key >= p_split_date::text;

  update events set
    recurrence_end_date = p_split_date - 1,
    recurrence_count = null
  where id = p_series_id
  returning * into v_result;

  return v_result;
end;
$$;

-- Split a series at the split date. The original series is ended the day before;
-- a new series carries the edited content forward with the same recurrence rule
-- and timezone, the remaining end condition, inherited reminders, and any
-- exceptions on or after the split date (which keep their occurrence identity).
create or replace function split_event_series(
  p_series_id uuid,
  p_expected_series_version integer,
  p_split_date date,
  p_title text,
  p_details text,
  p_all_day boolean,
  p_start_date date,
  p_end_date date,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_recurrence_end_date date,
  p_recurrence_count integer
)
returns events
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old events;
  v_new_id uuid;
  v_result events;
begin
  set local lock_timeout = '3s';
  select * into v_old
  from events
  where id = p_series_id and recurrence_frequency is not null
  for update;
  if not found then
    raise exception 'This recurring Event is no longer available.'
      using errcode = 'no_data_found';
  end if;
  if v_old.version <> p_expected_series_version then
    raise exception 'This series changed while you were editing.'
      using errcode = 'P0001';
  end if;

  insert into events (
    household_id, created_by_membership_id,
    title, details, all_day, start_date, end_date, starts_at, ends_at,
    recurrence_frequency, recurrence_interval, recurrence_weekdays,
    recurrence_end_date, recurrence_count, recurrence_timezone
  ) values (
    v_old.household_id, v_old.created_by_membership_id,
    p_title, p_details, p_all_day, p_start_date, p_end_date, p_starts_at, p_ends_at,
    v_old.recurrence_frequency, v_old.recurrence_interval, v_old.recurrence_weekdays,
    p_recurrence_end_date, p_recurrence_count, v_old.recurrence_timezone
  )
  returning id into v_new_id;

  insert into event_reminders (household_id, event_id, offset_minutes)
  select household_id, v_new_id, offset_minutes
  from event_reminders
  where event_id = p_series_id;

  update event_occurrence_exceptions
    set series_id = v_new_id
  where series_id = p_series_id
    and original_occurrence_key >= p_split_date::text;

  update events set
    recurrence_end_date = p_split_date - 1,
    recurrence_count = null
  where id = p_series_id;

  select * into v_result from events where id = v_new_id;
  return v_result;
end;
$$;
