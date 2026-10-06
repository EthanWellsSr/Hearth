-- Scale seed for staging load tests (docs/design/v0.4.3-production-foundations.md,
-- "Scale test"). Not in CI. Apply after seed.sql:
--   npx supabase db reset --linked --sql-paths ./seed.sql --sql-paths ./seeds/scale.sql
--
-- 1,000 Households, each with 2 Members, 100 To-dos, 100 Grocery Items,
-- 4 Events, and 4 Chores. IDs are deterministic so the load scripts can pick a
-- User or Household by number: User n (1..2000) belongs to Household (n+1)/2;
-- odd n is the owner.
--   User        5ca1e001-0000-4000-8000-<n, 12 digits>
--   Household   5ca1e002-0000-4000-8000-<h>
--   Membership  5ca1e003-0000-4000-8000-<n>
--   To-do       5ca1e004-<i, 4 digits>-4000-8000-<h>
-- Scale Users sign in as scale-<n>@example.test with the demo password in seed.sql.

create function pg_temp.sid(kind int, a int, b int default 0) returns uuid
language sql immutable as $$
  select format('5ca1e%s-%s-4000-8000-%s',
    lpad(kind::text, 3, '0'), lpad(b::text, 4, '0'), lpad(a::text, 12, '0'))::uuid
$$;

-- One bcrypt hash shared by every scale User keeps seeding fast.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', pg_temp.sid(1, n), 'authenticated',
  'authenticated', 'scale-' || n || '@example.test', pw.hash, now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
from generate_series(1, 2000) as n
cross join (select extensions.crypt('hearth-staging-demo', extensions.gen_salt('bf')) as hash) as pw;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at,
  created_at, updated_at
)
select
  gen_random_uuid(), pg_temp.sid(1, n), pg_temp.sid(1, n)::text, 'email',
  jsonb_build_object('sub', pg_temp.sid(1, n)::text,
    'email', 'scale-' || n || '@example.test', 'email_verified', true),
  now(), now(), now()
from generate_series(1, 2000) as n;

insert into public.user_profiles (user_id, display_name, setup_completed)
select pg_temp.sid(1, n), 'Scale ' || n, true
from generate_series(1, 2000) as n;

insert into public.households (id, name, timezone)
select pg_temp.sid(2, h), 'Scale ' || h, 'America/Chicago'
from generate_series(1, 1000) as h;

insert into public.memberships (id, user_id, household_id, role, display_name)
select pg_temp.sid(3, n), pg_temp.sid(1, n), pg_temp.sid(2, (n + 1) / 2),
  case when n % 2 = 1 then 'owner' else 'member' end, 'Scale ' || n
from generate_series(1, 2000) as n;

-- Done To-dos keep completed_at null so the purge job leaves the data stable.
insert into public.todos (id, household_id, text, done, created_at, assignee_id)
select pg_temp.sid(4, h, i), pg_temp.sid(2, h), 'Scale to-do ' || i, i % 4 = 0,
  now() - (i * interval '3 days 17 minutes'),
  case i % 3 when 0 then pg_temp.sid(3, 2 * h - 1) when 1 then pg_temp.sid(3, 2 * h) end
from generate_series(1, 1000) as h
cross join generate_series(1, 100) as i;

insert into public.grocery_items (household_id, name, bought, created_at)
select pg_temp.sid(2, h), 'Scale item ' || i, i % 3 = 0,
  now() - (i * interval '3 days 11 minutes')
from generate_series(1, 1000) as h
cross join generate_series(1, 100) as i;

insert into public.chores (household_id, title, freq, interval_days, weekday, next_due, assignee_id)
select pg_temp.sid(2, h), c.title, c.freq, c.interval_days, c.weekday,
  current_date + c.due_in, pg_temp.sid(3, 2 * h - c.who)
from generate_series(1, 1000) as h
cross join (values
  ('Take out trash', 'weekly', null::int, 1::smallint, 1, 1),
  ('Water plants', 'every_n_days', 3, null, 0, 0),
  ('Vacuum', 'weekly', null, 6::smallint, 4, 1),
  ('Change air filter', 'every_n_days', 90, null, 30, 0)
) as c(title, freq, interval_days, weekday, due_in, who);

insert into public.events (
  household_id, title, all_day, start_date, end_date, starts_at, ends_at,
  created_by_membership_id, recurrence_frequency, recurrence_interval,
  recurrence_weekdays, recurrence_timezone
)
select pg_temp.sid(2, h), e.title, e.all_day, e.start_date, e.end_date,
  e.starts_at, e.ends_at, pg_temp.sid(3, 2 * h - 1), e.freq, e.every,
  e.weekdays, e.tz
from generate_series(1, 1000) as h
cross join (values
  ('Dentist', false, null::date, null::date,
   date_trunc('hour', now()) + interval '2 days 3 hours',
   date_trunc('hour', now()) + interval '2 days 4 hours',
   null::text, null::int, null::smallint[], null::text),
  ('Weekend trip', true, current_date + 9, current_date + 11, null, null,
   null, null, null, null),
  ('Gym', false, null, null,
   date_trunc('day', now()) + interval '1 day 13 hours',
   date_trunc('day', now()) + interval '1 day 14 hours',
   'weekly', 1, '{1,3,5}'::smallint[], 'America/Chicago'),
  ('Pay rent', true, (date_trunc('month', current_date) + interval '1 month')::date,
   null, null, null, 'monthly', 1, null, 'America/Chicago')
) as e(title, all_day, start_date, end_date, starts_at, ends_at, freq, every, weekdays, tz);

analyze public.households, public.memberships, public.user_profiles,
  public.todos, public.grocery_items, public.chores, public.events;
