-- CLI migration creation was unavailable: its config directory is read-only.
begin;

create sequence public.todos_sort_order_seq;
alter table public.todos add column due_date date, add column sort_order bigint;
with ranked as (
  select id, row_number() over (order by created_at, id) as position from public.todos
)
update public.todos t set sort_order = ranked.position from ranked where ranked.id = t.id;
select setval('public.todos_sort_order_seq', coalesce((select max(sort_order) from public.todos), 0) + 1, false);
alter table public.todos alter column sort_order set default nextval('public.todos_sort_order_seq'),
  alter column sort_order set not null;
alter sequence public.todos_sort_order_seq owned by public.todos.sort_order;
grant usage on sequence public.todos_sort_order_seq to authenticated, service_role;
create index todos_household_order_idx on public.todos (household_id, done, sort_order, id);

create function public.move_todo(p_household_id uuid, p_id uuid, p_target_id uuid, p_after boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  ordered_ids uuid[];
  insert_at integer;
  moved_done boolean;
  target_done boolean;
begin
  if auth.uid() is null or not public.is_member(p_household_id) then
    raise exception 'Household membership required';
  end if;
  -- Serialize moves, then lock rows in a stable order. RLS stays active.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_household_id::text, 453));
  perform id from public.todos where household_id = p_household_id order by id for update;
  select done into moved_done from public.todos where household_id = p_household_id and id = p_id;
  select done into target_done from public.todos where household_id = p_household_id and id = p_target_id;
  if moved_done is null or target_done is null or moved_done <> target_done or p_after is null then
    raise exception 'To-dos must exist in the same Household and completion section';
  end if;
  if p_id = p_target_id then return; end if;
  select array_agg(id order by sort_order, id) into ordered_ids
    from public.todos where household_id = p_household_id and id <> p_id;
  insert_at := array_position(ordered_ids, p_target_id) + case when p_after then 1 else 0 end;
  ordered_ids := coalesce(ordered_ids[1:insert_at-1], '{}'::uuid[]) || array[p_id] || coalesce(ordered_ids[insert_at:array_length(ordered_ids, 1)], '{}'::uuid[]);
  update public.todos t set sort_order = position
    from unnest(ordered_ids) with ordinality as ordered(id, position)
    where t.id = ordered.id and t.household_id = p_household_id;
end;
$$;
revoke all on function public.move_todo(uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.move_todo(uuid, uuid, uuid, boolean) to authenticated;

commit;
