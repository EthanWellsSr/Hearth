-- Event reminder configuration is Household-scoped. Push subscriptions belong
-- to a User and device endpoint so they remain valid across Membership changes.

create table event_reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  offset_minutes integer not null check (offset_minutes between 0 and 525600),
  created_at timestamptz not null default now(),
  unique (event_id, offset_minutes)
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table event_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  reminder_id uuid not null references event_reminders(id) on delete cascade,
  occurrence_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null references push_subscriptions(id) on delete cascade,
  channel text not null default 'web_push' check (channel = 'web_push'),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'expired')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reminder_id, occurrence_key, user_id, subscription_id, channel)
);

create or replace function validate_event_reminder_household()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from events
    where id = new.event_id and household_id = new.household_id
  ) then
    raise exception 'Reminder and Event must belong to the same Household.';
  end if;
  return new;
end;
$$;

create trigger event_reminders_validate_household
before insert or update of household_id, event_id on event_reminders
for each row execute function validate_event_reminder_household();

alter table event_reminders enable row level security;
alter table push_subscriptions enable row level security;
alter table event_reminder_deliveries enable row level security;

create policy "event reminders in my household" on event_reminders
  for all to authenticated
  using (is_member(household_id))
  with check (is_member(household_id));

create policy "users manage their push subscriptions" on push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "members read reminder deliveries" on event_reminder_deliveries
  for select to authenticated
  using (is_member(household_id) and user_id = auth.uid());

create index event_reminder_deliveries_due_idx
  on event_reminder_deliveries (status, scheduled_for)
  where status in ('pending', 'failed');
