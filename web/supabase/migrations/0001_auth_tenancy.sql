-- 0001_auth_tenancy.sql
-- Adds multi-tenancy (Household / Membership) and turns RLS into real enforcement.
-- PHASE A is safe to run now (the secret key still bypasses RLS, so the app keeps working).
-- PHASE B runs AFTER Ethan has signed up in the app (it needs his auth.users id).

-- ============================ PHASE A (run now) ============================

-- Household: the tenant. Owns all data.
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Membership: links a User (auth.users) to a Household. Many-to-many join table,
-- even though each user has exactly one membership for now.
create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (user_id, household_id)
);

-- Helper: does the current user belong to this household?
-- SECURITY DEFINER lets it read memberships without re-triggering RLS (avoids the
-- recursive-policy trap). Used by every data-table policy below.
create or replace function is_member(hid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- Tenant key on the data tables. Nullable for now (existing rows have none);
-- Phase B backfills then locks it to NOT NULL.
alter table todos add column household_id uuid references households(id);
alter table grocery_items add column household_id uuid references households(id);

-- Turn on row-level security for the new tables (todos/grocery_items already have it).
alter table households enable row level security;
alter table memberships enable row level security;

-- memberships: you can read only your own membership rows.
-- Direct column comparison, NO subquery -> non-recursive (this is the trap-avoider).
create policy "own memberships" on memberships
  for select using (user_id = auth.uid());

-- households: members may read and rename their own household.
create policy "member households read" on households
  for select using (is_member(id));
create policy "member households update" on households
  for update using (is_member(id));

-- todos + grocery_items: all access scoped to a household you belong to.
create policy "todos in my household" on todos
  for all using (is_member(household_id)) with check (is_member(household_id));
create policy "groceries in my household" on grocery_items
  for all using (is_member(household_id)) with check (is_member(household_id));

-- NOTE: intentionally NO insert policy on households/memberships for normal users.
-- Manual/admin model: households and memberships are created with the secret key
-- (admin). A self-serve invite/join flow is a later feature.


-- ======================= PHASE B (run AFTER signup) =======================
-- Keyed off the single existing auth user + the household name, so no manual
-- UUID copying. If more than one user exists, scope step 2 by email instead.

insert into households (name) values ('Wells');

insert into memberships (user_id, household_id, role)
select (select id from auth.users order by created_at limit 1), h.id, 'owner'
from households h
where h.name = 'Wells';

update todos
  set household_id = (select id from households where name = 'Wells' limit 1)
  where household_id is null;
update grocery_items
  set household_id = (select id from households where name = 'Wells' limit 1)
  where household_id is null;

alter table todos         alter column household_id set not null;
alter table grocery_items alter column household_id set not null;
