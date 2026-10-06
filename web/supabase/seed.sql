-- Staging and CI seed: one fictional Household to click through. The scale data
-- for load tests and index evidence lives in seeds/scale.sql (staging only).
-- Never production data. Dates are relative to now() so the Calendar and Chores
-- always have something current.
--
-- Local and CI sign-in: alex@example.test or sam@example.test, password
-- hearth-staging-demo. This fixed test password is public. If the seed is
-- applied to remote staging, rotate both Auth passwords before sharing access.

-- 1. Users. Supabase Auth needs both the user and its email identity row.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
  u.email, extensions.crypt('hearth-staging-demo', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
from (values
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'alex@example.test'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'sam@example.test')
) as u(id, email);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at,
  created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.email in ('alex@example.test', 'sam@example.test');

insert into public.user_profiles (user_id, display_name, setup_completed) values
  ('a1000000-0000-4000-8000-000000000001', 'Alex', true),
  ('a1000000-0000-4000-8000-000000000002', 'Sam', true);

-- 2. The demo Household and its two Members.
insert into public.households (id, name, timezone) values
  ('b1000000-0000-4000-8000-000000000001', 'Maple Street', 'America/Chicago');

insert into public.memberships (id, user_id, household_id, role, display_name) values
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
   'b1000000-0000-4000-8000-000000000001', 'owner', 'Alex'),
  ('c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002',
   'b1000000-0000-4000-8000-000000000001', 'member', 'Sam');

-- 3. Sample Chores, Events, To-dos, and Grocery Items.
insert into public.chores (household_id, title, freq, interval_days, weekday, next_due, assignee_id) values
  ('b1000000-0000-4000-8000-000000000001', 'Take out trash', 'weekly', null, 1,
   current_date + 1, 'c1000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000001', 'Water plants', 'every_n_days', 3, null,
   current_date, 'c1000000-0000-4000-8000-000000000002'),
  ('b1000000-0000-4000-8000-000000000001', 'Vacuum living room', 'weekly', null, 6,
   current_date + 4, null),
  ('b1000000-0000-4000-8000-000000000001', 'Change air filter', 'every_n_days', 90, null,
   current_date + 30, null);

insert into public.events (
  household_id, title, details, all_day, start_date, end_date, starts_at, ends_at,
  created_by_membership_id, recurrence_frequency, recurrence_interval,
  recurrence_weekdays, recurrence_timezone
) values
  ('b1000000-0000-4000-8000-000000000001', 'Dentist', 'Bring insurance card', false,
   null, null, date_trunc('hour', now()) + interval '2 days 3 hours',
   date_trunc('hour', now()) + interval '2 days 4 hours',
   'c1000000-0000-4000-8000-000000000001', null, null, null, null),
  ('b1000000-0000-4000-8000-000000000001', 'Weekend trip', null, true,
   current_date + 9, current_date + 11, null, null,
   'c1000000-0000-4000-8000-000000000002', null, null, null, null),
  ('b1000000-0000-4000-8000-000000000001', 'Gym', null, false,
   null, null, date_trunc('day', now()) + interval '1 day 13 hours',
   date_trunc('day', now()) + interval '1 day 14 hours',
   'c1000000-0000-4000-8000-000000000001', 'weekly', 1, '{1,3,5}', 'America/Chicago'),
  ('b1000000-0000-4000-8000-000000000001', 'Pay rent', null, true,
   (date_trunc('month', current_date) + interval '1 month')::date, null, null, null,
   'c1000000-0000-4000-8000-000000000002', 'monthly', 1, null, 'America/Chicago');

insert into public.todos (household_id, text, done, completed_at, assignee_id) values
  ('b1000000-0000-4000-8000-000000000001', 'Book flights', false, null,
   'c1000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000001', 'Return library books', false, null,
   'c1000000-0000-4000-8000-000000000002'),
  ('b1000000-0000-4000-8000-000000000001', 'Schedule car service', false, null, null),
  ('b1000000-0000-4000-8000-000000000001', 'Renew passport', true, now(), null);

insert into public.grocery_items (household_id, name, bought) values
  ('b1000000-0000-4000-8000-000000000001', 'Milk', false),
  ('b1000000-0000-4000-8000-000000000001', 'Eggs', false),
  ('b1000000-0000-4000-8000-000000000001', 'Coffee', false),
  ('b1000000-0000-4000-8000-000000000001', 'Bananas', true);
