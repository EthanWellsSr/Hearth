alter table public.google_calendar_sources add column cached_range_start date;
alter table public.google_calendar_sources add column cached_range_end date;
grant select(cached_range_start,cached_range_end) on public.google_calendar_sources to authenticated;

create function public.expand_google_calendar_range(target_source uuid,target_household uuid,requested_start date,requested_end date)
returns void language sql security invoker set search_path='' as $$
 update public.google_calendar_sources set range_start=least(range_start,requested_start),range_end=greatest(range_end,requested_end),requested_at=now()
 where id=target_source and household_id=target_household;
$$;
revoke all on function public.expand_google_calendar_range(uuid,uuid,date,date) from public,anon,authenticated;
grant execute on function public.expand_google_calendar_range(uuid,uuid,date,date) to service_role;

create or replace function public.commit_google_calendar_snapshot(target_source uuid, target_household uuid, lease uuid, expected_start date, expected_end date, snapshot jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.google_calendar_sources where id=target_source and household_id=target_household
    and lock_token=lease and lock_until>now() and range_start=expected_start and range_end=expected_end for update;
  if not found then return false; end if;
  delete from public.google_calendar_events e where source_id=target_source and household_id=target_household
    and not exists(select 1 from jsonb_array_elements(snapshot) x where x->>'google_id'=e.google_id);
  insert into public.google_calendar_events(household_id,source_id,google_id,title,details,location,all_day,start_date,end_date,starts_at,ends_at,source_timezone,html_link,meeting_link,attendees,response_status,limited)
  select target_household,target_source,x.google_id,x.title,x.details,x.location,x.all_day,x.start_date,x.end_date,x.starts_at,x.ends_at,x.source_timezone,x.html_link,x.meeting_link,coalesce(x.attendees,'[]'),x.response_status,x.limited
  from jsonb_to_recordset(snapshot) as x(google_id text,title text,details text,location text,all_day boolean,start_date date,end_date date,starts_at timestamptz,ends_at timestamptz,source_timezone text,html_link text,meeting_link text,attendees jsonb,response_status text,limited boolean)
  on conflict(source_id,google_id) do update set
    title=excluded.title,details=excluded.details,location=excluded.location,all_day=excluded.all_day,start_date=excluded.start_date,end_date=excluded.end_date,
    starts_at=excluded.starts_at,ends_at=excluded.ends_at,source_timezone=excluded.source_timezone,html_link=excluded.html_link,meeting_link=excluded.meeting_link,
    attendees=excluded.attendees,response_status=excluded.response_status,limited=excluded.limited;
  update public.google_calendar_sources set status='ready',last_synced_at=now(),last_error=null,cached_range_start=expected_start,cached_range_end=expected_end
    where id=target_source and household_id=target_household;
  return true;
end $$;
