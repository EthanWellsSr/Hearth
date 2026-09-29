-- v0.4.3 delivery step 2: scale fixes found by the baseline scale test, plus one
-- Household per User.
--
-- The baseline run showed RLS calling is_member(household_id) once per row: a
-- To-do list read checked all 100,000 rows to return one Household's 100 and
-- took ~7.5 s under load. Policies now compare household_id against the
-- caller's Households, looked up once per statement, so Postgres can use the
-- household_id indexes whether or not the app also filters.

-- 1. One Household per User, enforced by the database. Fail loudly on existing
-- duplicates instead of deleting anything.
do $$
begin
  if exists (select 1 from memberships group by user_id having count(*) > 1) then
    raise exception 'A User belongs to more than one Household; resolve by hand before applying.';
  end if;
end;
$$;

alter table memberships add constraint memberships_user_id_key unique (user_id);

-- 2. The caller's Households, resolved once per statement. SECURITY DEFINER so
-- it can read memberships without recursing through memberships' own policy.
-- ROWS 1 tells the planner to expect a single Household.
create function my_household_ids() returns setof uuid
language sql stable security definer
set search_path = public
rows 1
as $$
  select household_id from memberships where user_id = auth.uid();
$$;

revoke all on function my_household_ids() from public, anon;
grant execute on function my_household_ids() to authenticated, service_role;

-- 3. Rewrite the Household policies from a per-row function call to a set
-- membership test.
alter policy "todos in my household" on todos
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));
alter policy "groceries in my household" on grocery_items
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));
alter policy "chores in my household" on chores
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));
alter policy "events in my household" on events
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));
alter policy "event exceptions in my household" on event_occurrence_exceptions
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));
alter policy "event reminders in my household" on event_reminders
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));
alter policy "household memberships" on memberships
  using (household_id in (select my_household_ids()));
alter policy "member households read" on households
  using (id in (select my_household_ids()));
alter policy "members read reminder deliveries" on event_reminder_deliveries
  using (household_id in (select my_household_ids()) and user_id = (select auth.uid()));

-- 4. Indexes for the Household-scoped list reads. Plain CREATE INDEX locks
-- writes on the table while it builds; fine at Hearth's size. On a large live
-- table this would be CREATE INDEX CONCURRENTLY in its own migration, since it
-- cannot run inside a transaction.
create index todos_household_created_idx on todos (household_id, created_at);
create index grocery_items_household_created_idx on grocery_items (household_id, created_at);
create index memberships_household_id_idx on memberships (household_id);

-- 5. Translate a racing second Household into the existing message. The
-- advisory lock and existence check already serialize one User's requests;
-- the constraint is the backstop if any other path inserts a Membership.
create or replace function create_household_with_owner(household_name text, household_timezone text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_household_id uuid;
  clean_name text := btrim(household_name);
  clean_timezone text := btrim(household_timezone);
  violated text;
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
exception
  when unique_violation then
    get stacked diagnostics violated = constraint_name;
    if violated = 'memberships_user_id_key' then
      raise exception 'This User already belongs to a Household.';
    end if;
    raise;
end;
$$;
