-- 0004_chore_assignee.sql
-- Assignee for chores: the Member responsible for it (may be unset = anyone).
-- Assignee is a Member, so it references memberships(id), not a raw user.

-- A display label for a Member within a household (e.g. "Ethan"). We don't expose
-- auth.users to the app client, so the household-scoped name lives on the membership.
alter table memberships add column display_name text;

-- Default each existing member's name to the local part of their email.
update memberships m
set display_name = split_part(u.email, '@', 1)
from auth.users u
where m.user_id = u.id and m.display_name is null;

-- The link. on delete set null: removing a Member leaves the chore, just unassigned.
alter table chores
  add column assignee_id uuid references memberships(id) on delete set null;

-- Members must be able to SEE their co-members to pick an assignee. Broaden the
-- memberships read policy from "own row only" to "everyone in my household".
-- (is_member is SECURITY DEFINER, so this does not recurse.)
drop policy "own memberships" on memberships;
create policy "household memberships" on memberships
  for select using (is_member(household_id));
