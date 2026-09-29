-- To-dos page: the Household's To-dos, Members, profiles.
\set u random(1, 2000)
\set h (:u + 1) / 2
BEGIN;
SELECT set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', '5ca1e001-0000-4000-8000-' || lpad(':u', 12, '0'), 'role', 'authenticated')::text, true);
SELECT get_my_household_context();
SELECT id, text, done, assignee_id FROM todos WHERE household_id = ('5ca1e002-0000-4000-8000-' || lpad(':h', 12, '0'))::uuid ORDER BY created_at;
SELECT id, user_id FROM memberships WHERE household_id = ('5ca1e002-0000-4000-8000-' || lpad(':h', 12, '0'))::uuid;
SELECT user_id, display_name, avatar_path FROM user_profiles WHERE user_id IN (SELECT user_id FROM memberships WHERE household_id = ('5ca1e002-0000-4000-8000-' || lpad(':h', 12, '0'))::uuid);
COMMIT;
