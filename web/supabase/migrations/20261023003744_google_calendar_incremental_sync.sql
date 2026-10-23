alter table public.google_calendar_sources add column sync_token text;
alter table public.google_calendar_sources add column sync_metadata text;

create function public.commit_google_calendar_sync(target_source uuid,target_household uuid,lease uuid,expected_start date,expected_end date,next_token text,metadata text,snapshot jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare accepted boolean;
begin
 accepted:=public.commit_google_calendar_snapshot(target_source,target_household,lease,expected_start,expected_end,snapshot);
 if accepted then
   update public.google_calendar_sources set sync_token=next_token,sync_metadata=metadata where id=target_source and household_id=target_household and lock_token=lease;
 end if;
 return accepted;
end $$;
create function public.checkpoint_google_calendar_sync(target_source uuid,target_household uuid,lease uuid,expected_start date,expected_end date,next_token text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.google_calendar_sources set sync_token=next_token,status='ready',last_error=null,last_synced_at=now()
 where id=target_source and household_id=target_household and lock_token=lease and lock_until>now()
 and range_start=expected_start and range_end=expected_end and cached_range_start=expected_start and cached_range_end=expected_end;
 return found;
end $$;
revoke all on function public.commit_google_calendar_sync(uuid,uuid,uuid,date,date,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.checkpoint_google_calendar_sync(uuid,uuid,uuid,date,date,text) from public,anon,authenticated;
grant execute on function public.commit_google_calendar_sync(uuid,uuid,uuid,date,date,text,text,jsonb) to service_role;
grant execute on function public.checkpoint_google_calendar_sync(uuid,uuid,uuid,date,date,text) to service_role;
