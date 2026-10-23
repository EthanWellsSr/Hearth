-- Staging only. Fictional Users and all fixtures roll back.
begin;
create temporary table google_fixture as select gen_random_uuid() u1,gen_random_uuid() u2,gen_random_uuid() u3,
 gen_random_uuid() h1,gen_random_uuid() h2,gen_random_uuid() m1,gen_random_uuid() m2,gen_random_uuid() m3,
 gen_random_uuid() c1,gen_random_uuid() c2,gen_random_uuid() c3,gen_random_uuid() s1,gen_random_uuid() s2,gen_random_uuid() s3,gen_random_uuid() lease;
grant select on google_fixture to authenticated,service_role;
insert into auth.users(id,email,aud,role)
select u1,u1::text||'@example.test','authenticated','authenticated' from google_fixture
union all select u2,u2::text||'@example.test','authenticated','authenticated' from google_fixture
union all select u3,u3::text||'@example.test','authenticated','authenticated' from google_fixture;
insert into public.households(id,name) select h1,'Google verification A' from google_fixture union all select h2,'Google verification B' from google_fixture;
insert into public.memberships(id,user_id,household_id,role)
select m1,u1,h1,'owner' from google_fixture union all select m2,u2,h1,'member' from google_fixture union all select m3,u3,h2,'owner' from google_fixture;
insert into public.google_connections(id,household_id,membership_id,user_id,google_subject,email)
select c1,h1,m1,u1,'fictional-a','a@example.test' from google_fixture union all
select c2,h1,m2,u2,'fictional-b','b@example.test' from google_fixture union all
select c3,h2,m3,u3,'fictional-c','c@example.test' from google_fixture;
insert into public.google_calendar_credentials(connection_id,encrypted_tokens) select c1,'fictional-encrypted-token' from google_fixture;
insert into public.google_calendar_sources(id,household_id,connection_id,google_calendar_id,name,range_start,range_end,lock_token,lock_until)
select s1,h1,c1,'shared@example.test','Shared','2025-01-01'::date,'2028-01-01'::date,lease,now()+interval '5 minutes' from google_fixture union all
select s2,h1,c2,'shared@example.test','Shared','2025-01-01','2028-01-01',null,null from google_fixture union all
select s3,h2,c3,'other@example.test','Other','2025-01-01','2028-01-01',null,null from google_fixture;

set local role service_role;
do $$ declare f record; ok boolean; stable_id uuid; begin
 select * into f from pg_temp.google_fixture;
 ok:=public.commit_google_calendar_snapshot(f.s1,f.h1,f.lease,'2025-01-01','2028-01-01',
 '[{"google_id":"event-one","title":"Fictional Event","all_day":true,"start_date":"2026-10-23","end_date":"2026-10-23","attendees":[],"limited":false}]');
 if not ok then raise exception 'Valid snapshot rejected'; end if;
 select id into stable_id from public.google_calendar_events where source_id=f.s1 and google_id='event-one';
 ok:=public.commit_google_calendar_snapshot(f.s1,f.h1,f.lease,'2025-01-01','2028-01-01',
 '[{"google_id":"event-one","title":"Changed title","all_day":true,"start_date":"2026-10-23","end_date":"2026-10-23","attendees":[],"limited":false}]');
 if not ok or not exists(select 1 from public.google_calendar_events where id=stable_id and title='Changed title') then raise exception 'Event identity changed on refresh'; end if;
 if public.commit_google_calendar_snapshot(f.s1,f.h1,gen_random_uuid(),'2025-01-01','2028-01-01','[]') then raise exception 'Stale lease accepted'; end if;
 if public.commit_google_calendar_snapshot(f.s1,f.h1,f.lease,'2024-01-01','2028-01-01','[]') then raise exception 'Stale range accepted'; end if;
 if not public.checkpoint_google_calendar_sync(f.s1,f.h1,f.lease,'2025-01-01','2028-01-01','checkpoint-one') then raise exception 'Valid incremental checkpoint rejected'; end if;
 if public.checkpoint_google_calendar_sync(f.s1,f.h1,gen_random_uuid(),'2025-01-01','2028-01-01','stale-token') then raise exception 'Stale incremental checkpoint accepted'; end if;
 if not exists(select 1 from public.google_calendar_sources where id=f.s1 and sync_token='checkpoint-one') then raise exception 'Incremental token corrupted'; end if;
 perform public.expand_google_calendar_range(f.s2,f.h1,'2024-01-01','2027-01-01');
 perform public.expand_google_calendar_range(f.s2,f.h1,'2025-01-01','2029-01-01');
 if not exists(select 1 from public.google_calendar_sources where id=f.s2 and range_start='2024-01-01' and range_end='2029-01-01') then raise exception 'Date range shrank'; end if;
end $$;
reset role;
set local role authenticated;
do $$ declare f record; n integer; blocked boolean; begin
 select * into f from pg_temp.google_fixture; perform set_config('request.jwt.claim.sub',f.u2::text,true);
 select count(*) into n from public.google_calendar_events where household_id=f.h1; if n<>1 then raise exception 'Shared Event not visible'; end if;
 select count(*) into n from public.google_calendar_sources where household_id=f.h2; if n<>0 then raise exception 'Cross-Household source leak'; end if;
 blocked:=false; begin perform encrypted_tokens from public.google_calendar_credentials; exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Credentials exposed'; end if;
 blocked:=false; begin perform watch_token from public.google_calendar_sources; exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Watch credential exposed'; end if;
 blocked:=false; begin perform sync_token from public.google_calendar_sources; exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Incremental token exposed'; end if;
 blocked:=false; begin update public.google_calendar_events set title='Changed' where household_id=f.h1; exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Imported Events editable'; end if;
 delete from public.google_connections where id=f.c1 and household_id=f.h1; get diagnostics n=row_count; if n<>0 then raise exception 'Member disconnected another User'; end if;
 delete from public.google_calendar_sources where id=f.s1 and household_id=f.h1; get diagnostics n=row_count; if n<>0 then raise exception 'Member deselected another User calendar'; end if;
 insert into public.calendar_visibility(household_id,membership_id,calendar_key,visible) values(f.h1,f.m2,'hearth',false);
 blocked:=false; begin insert into public.calendar_visibility(household_id,membership_id,calendar_key,visible) values(f.h1,f.m1,'hearth',false); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Another Member visibility writable'; end if;
 perform set_config('request.jwt.claim.sub',f.u1::text,true);
 select count(*) into n from public.calendar_visibility where household_id=f.h1; if n<>0 then raise exception 'Another Member preferences leaked'; end if;
 delete from public.google_connections where id=f.c1 and household_id=f.h1; get diagnostics n=row_count; if n<>1 then raise exception 'Own disconnect rejected'; end if;
 select count(*) into n from public.google_calendar_events where household_id=f.h1; if n<>0 then raise exception 'Disconnect did not remove supplied Events'; end if;
 select count(*) into n from public.google_calendar_sources where id=f.s2 and household_id=f.h1; if n<>1 then raise exception 'Other connection removed'; end if;
end $$;
reset role;
set local role service_role;
do $$ declare f record; begin
 select * into f from pg_temp.google_fixture;
 if public.commit_google_calendar_snapshot(f.s1,f.h1,f.lease,'2025-01-01','2028-01-01','[]') then raise exception 'Disconnected worker resurrected source'; end if;
end $$;
reset role;
set local role anon;
do $$ declare blocked boolean:=false; begin
 begin perform id from public.google_calendar_events; exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Anonymous Event read allowed'; end if;
end $$;
reset role;
select 'Google Calendar RLS, snapshot leases, ownership, isolation, and cleanup checks passed; fixtures rolled back' as result;
rollback;
