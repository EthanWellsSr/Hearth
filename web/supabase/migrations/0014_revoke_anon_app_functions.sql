-- Close the anonymous call path to every remaining app function. Supabase grants
-- EXECUTE on new public functions directly to anon (and Postgres grants it to
-- PUBLIC), so earlier `revoke all ... from public` statements did not stop anon.
-- Every SECURITY DEFINER function already rejects or returns false/empty for a
-- null auth.uid(); this is defense in depth, not a live data leak.
--
-- is_member(): five early policies have no role clause, so Postgres evaluated
-- is_member() for anon and returned empty results. Revoking anon EXECUTE alone
-- would turn those reads into permission errors. Scoping the policies to
-- authenticated first (matching every policy since 0006) means anon gets no
-- applicable policy, so RLS still returns empty results without calling it.
--
-- Trigger functions need no EXECUTE grant to fire; Postgres checks it only when
-- the trigger is created.

begin;

-- 1. Scope the role-less policies to authenticated.
alter policy "member households read" on households to authenticated;
alter policy "household memberships" on memberships to authenticated;
alter policy "todos in my household" on todos to authenticated;
alter policy "groceries in my household" on grocery_items to authenticated;
alter policy "chores in my household" on chores to authenticated;

-- 2. Functions never revoked from PUBLIC: revoke from PUBLIC and anon, then grant
--    authenticated explicitly where the app or its policies need them.
revoke execute on function is_member(uuid) from public, anon;
grant execute on function is_member(uuid) to authenticated;

revoke execute on function upsert_event_occurrence_exception(
  uuid, text, integer, integer, boolean, text, text, boolean, date, date, timestamptz, timestamptz
) from public, anon;
revoke execute on function truncate_event_series(uuid, integer, date) from public, anon;
revoke execute on function split_event_series(
  uuid, integer, date, text, text, boolean, date, date, timestamptz, timestamptz, date, integer
) from public, anon;
grant execute on function upsert_event_occurrence_exception(
  uuid, text, integer, integer, boolean, text, text, boolean, date, date, timestamptz, timestamptz
) to authenticated;
grant execute on function truncate_event_series(uuid, integer, date) to authenticated;
grant execute on function split_event_series(
  uuid, integer, date, text, text, boolean, date, date, timestamptz, timestamptz, date, integer
) to authenticated;

-- Invite-code generators are internal: only SECURITY DEFINER functions and the
-- households.invite_code default (inserted only by create_household_with_owner)
-- call them, all as the function owner. 0006 revoked PUBLIC without granting
-- authenticated, so no client role was meant to call them.
revoke execute on function generate_invite_code() from public, anon, authenticated;
revoke execute on function generate_unique_invite_code() from public, anon, authenticated;

-- 3. Functions already revoked from PUBLIC in 0006/0007: drop anon's direct grant.
revoke execute on function shares_household_with(uuid) from anon;
revoke execute on function is_household_owner(uuid) from anon;
revoke execute on function join_household_with_invite(text) from anon;
revoke execute on function create_household_with_owner(text) from anon;
revoke execute on function create_household_with_owner(text, text) from anon;
revoke execute on function rotate_household_invite() from anon;
revoke execute on function remove_household_member(uuid) from anon;
revoke execute on function set_household_timezone(text) from anon;
revoke execute on function transfer_household_ownership(uuid) from anon;
revoke execute on function leave_household() from anon;

-- 4. Trigger functions: not callable as RPCs, but anon has no reason to hold EXECUTE.
revoke execute on function set_user_profile_updated_at() from public, anon;
revoke execute on function validate_assignee_household() from public, anon;
revoke execute on function set_event_updated_at_and_version() from public, anon;
revoke execute on function validate_event_creator_household() from public, anon;
revoke execute on function sync_todo_completed_at() from public, anon;
revoke execute on function validate_event_recurrence_timezone() from public, anon;
revoke execute on function validate_event_exception_household() from public, anon;
revoke execute on function validate_event_reminder_household() from public, anon;

-- 5. Stop future functions created by this role from granting anon EXECUTE.
alter default privileges in schema public revoke execute on functions from anon;

commit;

-- Verify (expect zero rows): public functions anon can still execute.
--   select p.oid::regprocedure
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and has_function_privilege('anon', p.oid, 'EXECUTE');
