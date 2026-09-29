-- v0.4.0: Household Calendar, configurable timezone, exactly-one-owner transfer,
-- voluntary leaving, and optional To-do Assignees.

-- Existing Households retain Hearth's historical timezone. New Households pass
-- an IANA timezone through create_household_with_owner below.
alter table households
  add column if not exists timezone text not null default 'America/Chicago';

alter table households
  drop constraint if exists households_timezone_not_blank;
alter table households
  add constraint households_timezone_not_blank
  check (timezone = btrim(timezone) and char_length(timezone) between 1 and 100);

-- A Household has exactly one owner in application state. The partial unique
-- index enforces the "at most one" half; the transactional functions below keep
-- an owner present while ownership or Membership changes.
create unique index if not exists memberships_one_owner_per_household
  on memberships (household_id)
  where role = 'owner';

alter table todos
  add column if not exists assignee_id uuid references memberships(id) on delete set null;

create or replace function validate_assignee_household()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from memberships
    where id = new.assignee_id
      and household_id = new.household_id
  ) then
    raise exception 'Assignee must belong to the same Household.';
  end if;
  return new;
end;
$$;

drop trigger if exists todos_validate_assignee_household on todos;
create trigger todos_validate_assignee_household
before insert or update of assignee_id, household_id on todos
for each row execute function validate_assignee_household();

drop trigger if exists chores_validate_assignee_household on chores;
create trigger chores_validate_assignee_household
before insert or update of assignee_id, household_id on chores
for each row execute function validate_assignee_household();

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null
    check (title = btrim(title) and char_length(title) between 1 and 100),
  details text
    check (details is null or char_length(details) <= 2000),
  all_day boolean not null default false,
  start_date date,
  end_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by_membership_id uuid references memberships(id) on delete set null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_shape check (
    (
      all_day
      and start_date is not null
      and starts_at is null
      and ends_at is null
      and (end_date is null or end_date >= start_date)
    )
    or
    (
      not all_day
      and start_date is null
      and end_date is null
      and starts_at is not null
      and (ends_at is null or ends_at > starts_at)
    )
  )
);

create index if not exists events_household_start_date_idx
  on events (household_id, start_date)
  where all_day;
create index if not exists events_household_starts_at_idx
  on events (household_id, starts_at)
  where not all_day;
create index if not exists todos_assignee_id_idx on todos (assignee_id);

create or replace function set_event_updated_at_and_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$;

drop trigger if exists events_set_updated_at_and_version on events;
create trigger events_set_updated_at_and_version
before update on events
for each row execute function set_event_updated_at_and_version();

create or replace function validate_event_creator_household()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.household_id is distinct from old.household_id then
    raise exception 'An Event cannot move between Households.';
  end if;
  -- ON DELETE SET NULL must be able to preserve an Event when its creator's
  -- Membership is removed. Other creator changes would rewrite authorship.
  if tg_op = 'UPDATE'
    and new.created_by_membership_id is distinct from old.created_by_membership_id
    and new.created_by_membership_id is not null then
    raise exception 'An Event creator cannot be reassigned.';
  end if;
  if new.created_by_membership_id is not null and not exists (
    select 1 from memberships
    where id = new.created_by_membership_id
      and household_id = new.household_id
  ) then
    raise exception 'Event creator must belong to the Event Household.';
  end if;
  return new;
end;
$$;

drop trigger if exists events_validate_creator_household on events;
create trigger events_validate_creator_household
before insert or update of created_by_membership_id, household_id on events
for each row execute function validate_event_creator_household();

alter table events enable row level security;
drop policy if exists "events in my household" on events;
create policy "events in my household" on events
  for all to authenticated
  using (is_member(household_id))
  with check (is_member(household_id));

-- Keep the existing one-argument creation function for backward compatibility
-- with the currently deployed app. The new two-argument overload sets the
-- Household timezone atomically with its first owner Membership.
create or replace function create_household_with_owner(
  household_name text,
  household_timezone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_household_id uuid;
  clean_name text := btrim(household_name);
  clean_timezone text := btrim(household_timezone);
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  if char_length(clean_name) not between 1 and 50 then
    raise exception 'Household name must be between 1 and 50 characters.';
  end if;
  if not exists (select 1 from pg_timezone_names where name = clean_timezone) then
    raise exception 'Choose a valid Household timezone.';
  end if;
  if not exists (
    select 1 from user_profiles
    where user_id = current_user_id and setup_completed
  ) then
    raise exception 'Complete your User Profile first.';
  end if;
  if exists (select 1 from memberships where user_id = current_user_id) then
    raise exception 'This User already belongs to a Household.';
  end if;

  insert into households (name, timezone)
  values (clean_name, clean_timezone)
  returning id into new_household_id;

  insert into memberships (user_id, household_id, role)
  values (current_user_id, new_household_id, 'owner');

  return new_household_id;
end;
$$;

create or replace function set_household_timezone(input_timezone text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_household_id uuid;
  clean_timezone text := btrim(input_timezone);
begin
  select household_id into owned_household_id
  from memberships
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if owned_household_id is null then
    raise exception 'Only a Household owner can change its timezone.';
  end if;
  if not exists (select 1 from pg_timezone_names where name = clean_timezone) then
    raise exception 'Choose a valid Household timezone.';
  end if;

  update households set timezone = clean_timezone where id = owned_household_id;
  return clean_timezone;
end;
$$;

create or replace function transfer_household_ownership(target_membership_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_owner_id uuid;
  owned_household_id uuid;
  target_id uuid;
begin
  select id, household_id into current_owner_id, owned_household_id
  from memberships
  where user_id = auth.uid() and role = 'owner'
  for update;

  if current_owner_id is null then
    raise exception 'Only a Household owner can transfer ownership.';
  end if;

  select id into target_id from memberships
  where id = target_membership_id
    and household_id = owned_household_id
    and role = 'member'
  for update;

  if target_id is null then
    return false;
  end if;

  update memberships set role = 'member' where id = current_owner_id;
  update memberships set role = 'owner' where id = target_membership_id;
  return true;
end;
$$;

create or replace function leave_household()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_membership_id uuid;
  current_household_id uuid;
begin
  select id, household_id into current_membership_id, current_household_id
  from memberships
  where user_id = auth.uid()
  for update;

  if current_membership_id is null then
    return false;
  end if;
  if exists (
    select 1 from memberships
    where id = current_membership_id and role = 'owner'
  ) then
    raise exception 'Transfer ownership before leaving the Household.';
  end if;

  delete from memberships where id = current_membership_id;
  update households
  set invite_code = generate_unique_invite_code()
  where id = current_household_id;
  return true;
end;
$$;

revoke all on function create_household_with_owner(text, text) from public;
revoke all on function set_household_timezone(text) from public;
revoke all on function transfer_household_ownership(uuid) from public;
revoke all on function leave_household() from public;
grant execute on function create_household_with_owner(text, text) to authenticated;
grant execute on function set_household_timezone(text) to authenticated;
grant execute on function transfer_household_ownership(uuid) to authenticated;
grant execute on function leave_household() to authenticated;
