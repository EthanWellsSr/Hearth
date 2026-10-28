-- Additive v0.4.6 schema. Move into migrations with the applied tool version.
create table public.google_connections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  google_subject text not null,
  email text not null,
  needs_reconnect boolean not null default false,
  selection_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (membership_id, google_subject), unique(id, household_id)
);
create table public.google_calendar_credentials (
  connection_id uuid primary key references public.google_connections(id) on delete cascade,
  encrypted_tokens text not null
);
create table public.google_calendar_sources (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  connection_id uuid not null,
  google_calendar_id text not null,
  name text not null,
  color text not null default '#78aeb9',
  status text not null default 'importing' check (status in ('importing','ready','error','unavailable')),
  last_synced_at timestamptz,
  last_error text,
  range_start date not null,
  range_end date not null,
  requested_at timestamptz not null default now(),
  lock_until timestamptz,
  lock_token uuid,
  watch_id text,
  watch_token text,
  watch_resource_id text,
  watch_expires_at timestamptz,
  foreign key(connection_id, household_id) references public.google_connections(id, household_id) on delete cascade,
  unique(connection_id, google_calendar_id), unique(id, household_id),
  check(range_end > range_start)
);
create table public.google_calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  source_id uuid not null,
  google_id text not null,
  title text not null,
  details text, location text,
  all_day boolean not null,
  start_date date, end_date date, starts_at timestamptz, ends_at timestamptz,
  source_timezone text, html_link text, meeting_link text,
  attendees jsonb not null default '[]', response_status text, limited boolean not null default false,
  foreign key(source_id, household_id) references public.google_calendar_sources(id, household_id) on delete cascade,
  unique(source_id, google_id),
  check ((all_day and start_date is not null and end_date >= start_date and starts_at is null and ends_at is null)
    or (not all_day and start_date is null and end_date is null and starts_at is not null and ends_at > starts_at))
);
create table public.calendar_visibility (
  household_id uuid not null references public.households(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  calendar_key text not null,
  visible boolean not null default true,
  primary key(membership_id, calendar_key)
);
create index google_connections_household on public.google_connections(household_id);
create index google_calendar_sources_household on public.google_calendar_sources(household_id);
create index google_calendar_events_dates on public.google_calendar_events(household_id, start_date, end_date);
create index google_calendar_events_instants on public.google_calendar_events(household_id, starts_at, ends_at);
create index calendar_visibility_household on public.calendar_visibility(household_id);

alter table public.google_connections enable row level security;
alter table public.google_calendar_credentials enable row level security;
alter table public.google_calendar_sources enable row level security;
alter table public.google_calendar_events enable row level security;
alter table public.calendar_visibility enable row level security;
revoke all on public.google_connections, public.google_calendar_credentials, public.google_calendar_sources, public.google_calendar_events, public.calendar_visibility from anon, authenticated;
grant select, delete on public.google_connections to authenticated;
grant delete on public.google_calendar_sources to authenticated;
grant select(id,household_id,connection_id,google_calendar_id,name,color,status,last_synced_at,last_error,range_start,range_end,requested_at) on public.google_calendar_sources to authenticated;
grant select on public.google_calendar_events to authenticated;
grant select, insert, update, delete on public.calendar_visibility to authenticated;
grant all on public.google_connections, public.google_calendar_credentials, public.google_calendar_sources, public.google_calendar_events, public.calendar_visibility to service_role;

create policy connections_read on public.google_connections for select to authenticated using
  (exists(select 1 from public.memberships m where m.household_id=google_connections.household_id and m.user_id=(select auth.uid())));
create policy connections_remove on public.google_connections for delete to authenticated using
  (user_id=(select auth.uid()) and exists(select 1 from public.memberships m where m.id=membership_id and m.user_id=(select auth.uid()) and m.household_id=google_connections.household_id));
create policy sources_read on public.google_calendar_sources for select to authenticated using
  (exists(select 1 from public.memberships m where m.household_id=google_calendar_sources.household_id and m.user_id=(select auth.uid())));
create policy sources_remove on public.google_calendar_sources for delete to authenticated using
  (exists(select 1 from public.google_connections c where c.id=connection_id and c.household_id=google_calendar_sources.household_id and c.user_id=(select auth.uid())));
create policy imported_events_read on public.google_calendar_events for select to authenticated using
  (exists(select 1 from public.memberships m where m.household_id=google_calendar_events.household_id and m.user_id=(select auth.uid())));
create policy visibility_own on public.calendar_visibility for all to authenticated using
  (exists(select 1 from public.memberships m where m.id=membership_id and m.household_id=calendar_visibility.household_id and m.user_id=(select auth.uid()))) with check
  (exists(select 1 from public.memberships m where m.id=membership_id and m.household_id=calendar_visibility.household_id and m.user_id=(select auth.uid())));

-- Worker commits atomically; a stale/deselected worker cannot resurrect data.
create function public.commit_google_calendar_snapshot(target_source uuid, target_household uuid, lease uuid, expected_start date, expected_end date, snapshot jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.google_calendar_sources where id=target_source and household_id=target_household
    and lock_token=lease and lock_until>now() and range_start=expected_start and range_end=expected_end for update;
  if not found then return false; end if;
  delete from public.google_calendar_events where source_id=target_source and household_id=target_household;
  insert into public.google_calendar_events(household_id,source_id,google_id,title,details,location,all_day,start_date,end_date,starts_at,ends_at,source_timezone,html_link,meeting_link,attendees,response_status,limited)
  select target_household,target_source,x.google_id,x.title,x.details,x.location,x.all_day,x.start_date,x.end_date,x.starts_at,x.ends_at,x.source_timezone,x.html_link,x.meeting_link,coalesce(x.attendees,'[]'),x.response_status,x.limited
  from jsonb_to_recordset(snapshot) as x(google_id text,title text,details text,location text,all_day boolean,start_date date,end_date date,starts_at timestamptz,ends_at timestamptz,source_timezone text,html_link text,meeting_link text,attendees jsonb,response_status text,limited boolean);
  update public.google_calendar_sources set status='ready',last_synced_at=now(),last_error=null
    where id=target_source and household_id=target_household;
  return true;
end $$;
revoke all on function public.commit_google_calendar_snapshot(uuid,uuid,uuid,date,date,jsonb) from public, anon, authenticated;
grant execute on function public.commit_google_calendar_snapshot(uuid,uuid,uuid,date,date,jsonb) to service_role;

create function public.fail_google_calendar_sync(target_source uuid, target_household uuid, lease uuid, access_lost boolean, message text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.google_calendar_sources where id=target_source and household_id=target_household and lock_token=lease for update;
  if not found then return; end if;
  if access_lost then
    delete from public.google_calendar_events where source_id=target_source and household_id=target_household;
  end if;
  update public.google_calendar_sources set status=case when access_lost then 'unavailable' else 'error' end,
    last_error=message,lock_token=null,lock_until=null where id=target_source and household_id=target_household;
end $$;
revoke all on function public.fail_google_calendar_sync(uuid,uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.fail_google_calendar_sync(uuid,uuid,uuid,boolean,text) to service_role;
