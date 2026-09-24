-- v0.4.2: collapse the authenticated request context and bounded Calendar
-- window into one RLS-active database call each.

create index if not exists chores_household_next_due_idx
  on chores (household_id, next_due);

create or replace function get_my_household_context()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'user_id', p.user_id,
    'display_name', p.display_name,
    'avatar_path', p.avatar_path,
    'setup_completed', p.setup_completed,
    'membership_id', m.id,
    'household_id', m.household_id,
    'membership_role', m.role,
    'household_timezone', h.timezone
  )
  from user_profiles p
  left join memberships m on m.user_id = p.user_id
  left join households h on h.id = m.household_id
  where p.user_id = auth.uid()
  order by m.created_at
  limit 1;
$$;

revoke all on function get_my_household_context() from public;
grant execute on function get_my_household_context() to authenticated;

create or replace function get_calendar_window(
  target_household_id uuid,
  window_start date,
  window_end date,
  window_start_instant timestamptz,
  window_end_exclusive timestamptz,
  local_today date
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with event_rows as (
    select
      e.id, e.title, e.details, e.all_day, e.start_date, e.end_date,
      e.starts_at, e.ends_at, e.created_by_membership_id, e.version,
      e.created_at, e.updated_at, e.recurrence_frequency,
      e.recurrence_interval, e.recurrence_weekdays, e.recurrence_end_date,
      e.recurrence_count, e.recurrence_timezone
    from events e
    where e.household_id = target_household_id
      and (
        (
          e.recurrence_frequency is null
          and (
            (
              e.all_day
              and (
                (e.end_date is null and e.start_date between window_start and window_end)
                or
                (e.end_date is not null and e.start_date <= window_end and e.end_date >= window_start)
              )
            )
            or
            (
              not e.all_day
              and (
                (e.ends_at is null and e.starts_at >= window_start_instant and e.starts_at < window_end_exclusive)
                or
                (e.ends_at is not null and e.starts_at < window_end_exclusive and e.ends_at > window_start_instant)
              )
            )
          )
        )
        or
        (
          e.recurrence_frequency is not null
          and (
            (
              e.all_day
              and e.start_date <= window_end
              and (e.recurrence_end_date is null or e.recurrence_end_date >= window_start)
            )
            or
            (
              not e.all_day
              and e.starts_at < window_end_exclusive
              and (e.recurrence_end_date is null or e.recurrence_end_date >= window_start)
            )
          )
        )
      )

    union

    (
      select
        e.id, e.title, e.details, e.all_day, e.start_date, e.end_date,
        e.starts_at, e.ends_at, e.created_by_membership_id, e.version,
        e.created_at, e.updated_at, e.recurrence_frequency,
        e.recurrence_interval, e.recurrence_weekdays, e.recurrence_end_date,
        e.recurrence_count, e.recurrence_timezone
      from events e
      where e.household_id = target_household_id
        and e.all_day
        and e.recurrence_frequency is null
        and e.start_date > window_end
      order by e.start_date
      limit 1
    )

    union

    (
      select
        e.id, e.title, e.details, e.all_day, e.start_date, e.end_date,
        e.starts_at, e.ends_at, e.created_by_membership_id, e.version,
        e.created_at, e.updated_at, e.recurrence_frequency,
        e.recurrence_interval, e.recurrence_weekdays, e.recurrence_end_date,
        e.recurrence_count, e.recurrence_timezone
      from events e
      where e.household_id = target_household_id
        and not e.all_day
        and e.recurrence_frequency is null
        and e.starts_at >= window_end_exclusive
      order by e.starts_at
      limit 1
    )
  ),
  chore_rows as (
    select c.id, c.title, c.next_due
    from chores c
    where c.household_id = target_household_id
      and (
        c.next_due between window_start and window_end
        or c.next_due < local_today
      )

    union

    (
      select c.id, c.title, c.next_due
      from chores c
      where c.household_id = target_household_id
        and c.next_due > window_end
      order by c.next_due
      limit 1
    )
  ),
  exception_rows as (
    select
      x.id, x.series_id, x.original_occurrence_key, x.cancelled,
      x.title, x.details, x.all_day, x.start_date, x.end_date,
      x.starts_at, x.ends_at, x.version
    from event_occurrence_exceptions x
    where x.household_id = target_household_id
      and x.series_id in (
        select id from event_rows where recurrence_frequency is not null
      )
      and (
        (
          x.original_occurrence_key >= window_start::text
          and x.original_occurrence_key < (window_end + 1)::text
        )
        or (x.start_date between window_start and window_end)
        or (x.starts_at >= window_start_instant and x.starts_at < window_end_exclusive)
      )
  )
  select jsonb_build_object(
    'events', coalesce((select jsonb_agg(to_jsonb(e)) from event_rows e), '[]'::jsonb),
    'chores', coalesce((select jsonb_agg(to_jsonb(c)) from chore_rows c), '[]'::jsonb),
    'exceptions', coalesce((select jsonb_agg(to_jsonb(x)) from exception_rows x), '[]'::jsonb)
  );
$$;

revoke all on function get_calendar_window(uuid, date, date, timestamptz, timestamptz, date) from public;
grant execute on function get_calendar_window(uuid, date, date, timestamptz, timestamptz, date) to authenticated;
