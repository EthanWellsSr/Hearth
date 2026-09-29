-- v0.3.0: global User Profiles, private Avatars, readable Invite Codes,
-- rate-limited joining, and owner-managed Household membership.

-- A User Profile belongs to the auth identity, not to a Household. Membership
-- remains the Household-specific relationship and role.
create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null
    check (
      display_name = btrim(display_name)
      and char_length(display_name) between 1 and 50
    ),
  avatar_path text
    check (avatar_path is null or avatar_path = user_id::text || '/avatar.webp'),
  setup_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing Users get the name Hearth already displayed, but must review it once.
insert into user_profiles (user_id, display_name, setup_completed)
select distinct on (m.user_id)
  m.user_id,
  left(
    coalesce(
      nullif(btrim(m.display_name), ''),
      nullif(split_part(u.email, '@', 1), ''),
      'Household member'
    ),
    50
  ),
  false
from memberships m
join auth.users u on u.id = m.user_id
order by m.user_id, m.created_at
on conflict (user_id) do nothing;

create or replace function set_user_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_set_updated_at on user_profiles;
create trigger user_profiles_set_updated_at
before update on user_profiles
for each row execute function set_user_profile_updated_at();

-- SECURITY DEFINER avoids recursive RLS while answering only the narrow
-- question needed by profile and Avatar read policies.
create or replace function shares_household_with(other_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from memberships mine
    join memberships theirs on theirs.household_id = mine.household_id
    where mine.user_id = auth.uid()
      and theirs.user_id = other_user_id
  );
$$;

alter table user_profiles enable row level security;

drop policy if exists "self profile insert" on user_profiles;
create policy "self profile insert" on user_profiles
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "self profile update" on user_profiles;
create policy "self profile update" on user_profiles
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "household profiles read" on user_profiles;
create policy "household profiles read" on user_profiles
  for select to authenticated using (
    user_id = auth.uid() or shares_household_with(user_id)
  );

-- Avatars are private objects. A User owns the folder named for their auth id;
-- only that User and current co-members may read the image.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update own avatar" on storage.objects;
create policy "users update own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "household avatars read" on storage.objects;
create policy "household avatars read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and exists (
      select 1
      from user_profiles p
      where p.avatar_path = name
        and (p.user_id = auth.uid() or shares_household_with(p.user_id))
    )
  );

-- Eight readable characters, excluding O/0/I/1. The alphabet has 32 symbols,
-- so each byte maps evenly without modulo bias.
create or replace function generate_invite_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  random_bytes bytea := uuid_send(gen_random_uuid());
begin
  for i in 1..8 loop
    result := result || substr(alphabet, (get_byte(random_bytes, i - 1) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

create or replace function generate_unique_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := generate_invite_code();
    exit when not exists (
      select 1 from households where invite_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

-- Moving every Household to the new format intentionally invalidates legacy
-- six-character codes at deployment.
update households
set invite_code = generate_unique_invite_code()
where invite_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$';
alter table households alter column invite_code set default generate_unique_invite_code();
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'households_readable_invite_code'
      and conrelid = 'households'::regclass
  ) then
    alter table households add constraint households_readable_invite_code
      check (invite_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$');
  end if;
end;
$$;

create or replace function is_household_owner(hid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where household_id = hid
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

-- Household changes go through narrow owner-only functions so an owner cannot
-- replace the Invite Code with a chosen value through the table API.
drop policy if exists "member households update" on households;

create table if not exists invite_join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists invite_join_attempts_user_time_idx
  on invite_join_attempts (user_id, attempted_at desc);

alter table invite_join_attempts enable row level security;
-- Deliberately no direct policies: only the validated join function may access it.

create or replace function join_household_with_invite(input_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_household_id uuid;
begin
  if current_user_id is null then
    return 'not_authenticated';
  end if;

  -- Serialize attempts for this User so concurrent requests cannot outrun the cap.
  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  delete from invite_join_attempts
  where user_id = current_user_id
    and attempted_at <= now() - interval '24 hours';

  if not exists (
    select 1 from user_profiles
    where user_id = current_user_id and setup_completed
  ) then
    return 'profile_required';
  end if;

  if exists (select 1 from memberships where user_id = current_user_id) then
    return 'already_member';
  end if;

  if (
    select count(*)
    from invite_join_attempts
    where user_id = current_user_id
      and attempted_at > now() - interval '15 minutes'
  ) >= 5 then
    return 'throttled';
  end if;

  insert into invite_join_attempts (user_id) values (current_user_id);

  select id into target_household_id
  from households
  where invite_code = upper(btrim(input_code));

  if target_household_id is null then
    return 'invalid_code';
  end if;

  insert into memberships (user_id, household_id, role)
  values (current_user_id, target_household_id, 'member');

  return 'joined';
exception
  when unique_violation then
    return 'already_member';
end;
$$;

create or replace function create_household_with_owner(household_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_household_id uuid;
  clean_name text := btrim(household_name);
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  if char_length(clean_name) not between 1 and 50 then
    raise exception 'Household name must be between 1 and 50 characters.';
  end if;
  if not exists (
    select 1 from user_profiles
    where user_id = current_user_id and setup_completed
  ) then
    raise exception 'Complete your User Profile first.';
  end if;
  if exists (select 1 from memberships where user_id = current_user_id) then
    raise exception 'This User already belongs to a Household.';
  end if;

  insert into households (name)
  values (clean_name)
  returning id into new_household_id;

  insert into memberships (user_id, household_id, role)
  values (current_user_id, new_household_id, 'owner');

  return new_household_id;
end;
$$;

create or replace function rotate_household_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_household_id uuid;
  next_code text;
begin
  select household_id into owned_household_id
  from memberships
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if owned_household_id is null then
    raise exception 'Only a Household owner can rotate its Invite Code.';
  end if;

  next_code := generate_unique_invite_code();
  update households
  set invite_code = next_code
  where id = owned_household_id;

  return next_code;
end;
$$;

create or replace function remove_household_member(target_membership_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_household_id uuid;
  removed_count integer;
begin
  select household_id into owned_household_id
  from memberships
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if owned_household_id is null then
    raise exception 'Only a Household owner can remove a Member.';
  end if;

  delete from memberships
  where id = target_membership_id
    and household_id = owned_household_id
    and role <> 'owner';

  get diagnostics removed_count = row_count;
  if removed_count = 0 then
    return false;
  end if;

  update households
  set invite_code = generate_unique_invite_code()
  where id = owned_household_id;

  return true;
end;
$$;

revoke all on function join_household_with_invite(text) from public;
revoke all on function create_household_with_owner(text) from public;
revoke all on function rotate_household_invite() from public;
revoke all on function remove_household_member(uuid) from public;
revoke all on function shares_household_with(uuid) from public;
revoke all on function is_household_owner(uuid) from public;
revoke all on function generate_unique_invite_code() from public;
grant execute on function join_household_with_invite(text) to authenticated;
grant execute on function create_household_with_owner(text) to authenticated;
grant execute on function rotate_household_invite() to authenticated;
grant execute on function remove_household_member(uuid) to authenticated;
grant execute on function shares_household_with(uuid) to authenticated;
grant execute on function is_household_owner(uuid) to authenticated;
