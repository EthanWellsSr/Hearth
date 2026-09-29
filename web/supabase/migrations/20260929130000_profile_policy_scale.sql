-- Second scale fix from the v0.4.3 scale test. After 20260929120000,
-- get_my_household_context() was 97% of database time (~55 ms per page): the
-- profile read policy ran shares_household_with() on every User Profile, and the
-- function's `p.user_id = auth.uid()` could not become an index condition under
-- RLS because auth.uid() is not leakproof. Wrapping it in a scalar subquery
-- turns it into a once-per-statement parameter that can.

-- The caller plus everyone sharing a Household with them, resolved once per
-- statement. SECURITY DEFINER for the same reason as my_household_ids().
create function my_household_user_ids() returns setof uuid
language sql stable security definer
set search_path = public
rows 2
as $$
  select auth.uid()
  union
  select theirs.user_id
  from memberships mine
  join memberships theirs on theirs.household_id = mine.household_id
  where mine.user_id = auth.uid();
$$;

revoke all on function my_household_user_ids() from public, anon;
grant execute on function my_household_user_ids() to authenticated, service_role;

alter policy "household profiles read" on user_profiles
  using (user_id in (select my_household_user_ids()));

create or replace function get_my_household_context() returns jsonb
language sql stable
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
  where p.user_id = (select auth.uid())
  order by m.created_at
  limit 1;
$$;
