-- Run as the staging database administrator. Fictional rows are rolled back.
-- Never run against production. Sequence values consumed by this test are not
-- rolled back, which is normal and harmless for ordering.
begin;
create temporary table todo_verification_fixture as select
  gen_random_uuid() u1, gen_random_uuid() u2, gen_random_uuid() u3,
  gen_random_uuid() h1, gen_random_uuid() h2,
  gen_random_uuid() m1, gen_random_uuid() m2, gen_random_uuid() m3,
  gen_random_uuid() a, gen_random_uuid() b, gen_random_uuid() c,
  gen_random_uuid() d, gen_random_uuid() outsider;
grant select on todo_verification_fixture to authenticated;
insert into auth.users(id, email, aud, role)
select u1, u1::text || '@example.test', 'authenticated', 'authenticated' from todo_verification_fixture
union all select u2, u2::text || '@example.test', 'authenticated', 'authenticated' from todo_verification_fixture
union all select u3, u3::text || '@example.test', 'authenticated', 'authenticated' from todo_verification_fixture;
insert into public.households(id,name)
select h1,'To-do verification A' from todo_verification_fixture
union all select h2,'To-do verification B' from todo_verification_fixture;
insert into public.memberships(id,user_id,household_id,role)
select m1,u1,h1,'owner' from todo_verification_fixture
union all select m2,u2,h1,'member' from todo_verification_fixture
union all select m3,u3,h2,'owner' from todo_verification_fixture;
insert into public.todos(id,household_id,text)
select a,h1,'First' from todo_verification_fixture
union all select b,h1,'Second' from todo_verification_fixture
union all select c,h1,'Third' from todo_verification_fixture
union all select outsider,h2,'Other Household' from todo_verification_fixture;

set local role authenticated;
do $$
declare f record; actual uuid[]; blocked boolean; changed integer;
begin
  select * into f from pg_temp.todo_verification_fixture;
  perform set_config('request.jwt.claim.sub',f.u1::text,true);
  perform public.move_todo(f.h1,f.c,f.a,false);
  select array_agg(id order by done,sort_order,id) into actual from public.todos where household_id=f.h1;
  if actual <> array[f.c,f.a,f.b] then raise exception 'Move before failed: %',actual; end if;
  perform public.move_todo(f.h1,f.c,f.b,true);
  select array_agg(id order by done,sort_order,id) into actual from public.todos where household_id=f.h1;
  if actual <> array[f.a,f.b,f.c] then raise exception 'Move after failed'; end if;

  -- A second Member sees and can change the same list.
  perform set_config('request.jwt.claim.sub',f.u2::text,true);
  update public.todos set text='Edited by second Member',due_date='2028-02-29',assignee_id=f.m1
    where id=f.a and household_id=f.h1;
  get diagnostics changed = row_count;
  if changed<>1 then raise exception 'Second Member cannot edit'; end if;
  if not exists(select 1 from public.todos where id=f.a and text='Edited by second Member' and due_date='2028-02-29' and assignee_id=f.m1) then raise exception 'Field edit failed'; end if;
  update public.todos set due_date=null,assignee_id=null where id=f.a and household_id=f.h1;
  if not exists(select 1 from public.todos where id=f.a and due_date is null and assignee_id is null) then raise exception 'Optional field clearing failed'; end if;
  perform public.move_todo(f.h1,f.c,f.a,false);
  perform set_config('request.jwt.claim.sub',f.u1::text,true);
  select array_agg(id order by done,sort_order,id) into actual from public.todos where household_id=f.h1;
  if actual<>array[f.c,f.a,f.b] then raise exception 'Shared order failed'; end if;

  update public.todos set done=true where id=f.a and household_id=f.h1;
  if not exists(select 1 from public.todos where id=f.a and completed_at is not null) then raise exception 'Completion timestamp trigger failed'; end if;
  insert into public.todos(id,household_id,text) values(f.d,f.h1,'New');
  select array_agg(id order by done,sort_order,id) into actual from public.todos where household_id=f.h1;
  if actual<>array[f.c,f.b,f.d,f.a] then raise exception 'Completed-last/new-item placement failed'; end if;
  blocked:=false;
  begin perform public.move_todo(f.h1,f.a,f.b,false); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Cross-section move allowed'; end if;
  update public.todos set done=false where id=f.a and household_id=f.h1;
  select array_agg(id order by done,sort_order,id) into actual from public.todos where household_id=f.h1;
  if actual<>array[f.c,f.a,f.b,f.d] then raise exception 'Reopen position failed'; end if;

  if exists(select 1 from public.todos where id=f.outsider) then raise exception 'Cross-Household read allowed'; end if;
  update public.todos set text='Unauthorized' where id=f.outsider and household_id=f.h2;
  get diagnostics changed = row_count;
  if changed<>0 then raise exception 'Cross-Household edit allowed'; end if;
  blocked:=false;
  begin perform public.move_todo(f.h2,f.outsider,f.a,false); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Cross-Household reorder allowed'; end if;
  blocked:=false;
  begin perform public.move_todo(f.h1,f.a,f.outsider,false); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Cross-Household target allowed'; end if;
  blocked:=false;
  begin update public.todos set assignee_id=f.m3 where id=f.a and household_id=f.h1; exception when others then blocked:=true; end;
  if not blocked then raise exception 'Cross-Household Assignee allowed'; end if;
  blocked:=false;
  begin update public.todos set due_date='2026-02-30' where id=f.a and household_id=f.h1; exception when datetime_field_overflow then blocked:=true; end;
  if not blocked then raise exception 'Invalid calendar date allowed'; end if;
end $$;
reset role;
do $$
begin
  if has_function_privilege('anon','public.move_todo(uuid,uuid,uuid,boolean)','execute') then raise exception 'Anonymous reorder execution allowed'; end if;
  if (select prosecdef from pg_proc where oid='public.move_todo(uuid,uuid,uuid,boolean)'::regprocedure) then raise exception 'Reorder bypasses caller RLS'; end if;
end $$;
rollback;
select 'PASS: both Members, field edits/clearing, shared order, before/after moves, completion/reopen, new-item placement, Household isolation, invalid date/Assignee, anonymous denial; fixtures rolled back' as verification;
