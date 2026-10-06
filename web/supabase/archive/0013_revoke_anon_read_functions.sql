-- Supabase's default privileges grant EXECUTE on new public functions to anon
-- directly, so 0012's `revoke ... from public` left anon able to call these.
-- RLS already returned no rows to anon; this closes the call path itself.

revoke execute on function get_my_household_context() from anon;
revoke execute on function get_calendar_window(uuid, date, date, timestamptz, timestamptz, date) from anon;
