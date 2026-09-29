-- Baseline: production's schema on 2026-09-29, replacing 0001-0014 (now in
-- ../archive/). Generated with `supabase db dump`, then edited by hand:
--   - The default-privileges revoke below comes first. Supabase grants anon
--     EXECUTE on every new public function; pg_dump writes production's final
--     default privileges only at the end, after the functions exist, so without
--     this every function would be callable by anon again (undoing 0013/0014).
--     The same applies to authenticated on the two invite-code generators,
--     revoked explicitly beside their grants.
--   - Supabase's platform function rls_auto_enable() is left out.
--   - The pg_cron job and the avatars Storage bucket and policies live in
--     schemas the dump skips, so they are carried by hand at the bottom.
-- Production records this version as already applied; it never runs there.

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE EXECUTE ON FUNCTIONS FROM "anon";

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "public"."create_household_with_owner"("household_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

ALTER FUNCTION "public"."create_household_with_owner"("household_name" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."create_household_with_owner"("household_name" "text", "household_timezone" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  new_household_id uuid;
  clean_name text := btrim(household_name);
  clean_timezone text := btrim(household_timezone);
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  if char_length(clean_name) not between 1 and 50 then
    raise exception 'Household name must be between 1 and 50 characters.';
  end if;
  if not exists (select 1 from pg_timezone_names where name = clean_timezone) then
    raise exception 'Choose a valid Household timezone.';
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

  insert into households (name, timezone)
  values (clean_name, clean_timezone)
  returning id into new_household_id;

  insert into memberships (user_id, household_id, role)
  values (current_user_id, new_household_id, 'owner');

  return new_household_id;
end;
$$;

ALTER FUNCTION "public"."create_household_with_owner"("household_name" "text", "household_timezone" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."generate_invite_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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

ALTER FUNCTION "public"."generate_invite_code"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."generate_unique_invite_code"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

ALTER FUNCTION "public"."generate_unique_invite_code"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_calendar_window"("target_household_id" "uuid", "window_start" "date", "window_end" "date", "window_start_instant" timestamp with time zone, "window_end_exclusive" timestamp with time zone, "local_today" "date") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  with event_rows as (
    select
      e.id, e.title, e.details, e.all_day, e.start_date, e.end_date,
      e.starts_at, e.ends_at, e.created_by_membership_id, e.version,
      e.created_at, e.updated_at, e.recurrence_frequency,
      e.recurrence_interval, e.recurrence_weekdays, e.recurrence_end_date,
      e.recurrence_count, e.recurrence_timezone
    from events e
    where e.household_id = target_household_id
      and (
        (
          e.recurrence_frequency is null
          and (
            (
              e.all_day
              and (
                (e.end_date is null and e.start_date between window_start and window_end)
                or
                (e.end_date is not null and e.start_date <= window_end and e.end_date >= window_start)
              )
            )
            or
            (
              not e.all_day
              and (
                (e.ends_at is null and e.starts_at >= window_start_instant and e.starts_at < window_end_exclusive)
                or
                (e.ends_at is not null and e.starts_at < window_end_exclusive and e.ends_at > window_start_instant)
              )
            )
          )
        )
        or
        (
          e.recurrence_frequency is not null
          and (
            (
              e.all_day
              and e.start_date <= window_end
              and (e.recurrence_end_date is null or e.recurrence_end_date >= window_start)
            )
            or
            (
              not e.all_day
              and e.starts_at < window_end_exclusive
              and (e.recurrence_end_date is null or e.recurrence_end_date >= window_start)
            )
          )
        )
      )

    union

    (
      select
        e.id, e.title, e.details, e.all_day, e.start_date, e.end_date,
        e.starts_at, e.ends_at, e.created_by_membership_id, e.version,
        e.created_at, e.updated_at, e.recurrence_frequency,
        e.recurrence_interval, e.recurrence_weekdays, e.recurrence_end_date,
        e.recurrence_count, e.recurrence_timezone
      from events e
      where e.household_id = target_household_id
        and e.all_day
        and e.recurrence_frequency is null
        and e.start_date > window_end
      order by e.start_date
      limit 1
    )

    union

    (
      select
        e.id, e.title, e.details, e.all_day, e.start_date, e.end_date,
        e.starts_at, e.ends_at, e.created_by_membership_id, e.version,
        e.created_at, e.updated_at, e.recurrence_frequency,
        e.recurrence_interval, e.recurrence_weekdays, e.recurrence_end_date,
        e.recurrence_count, e.recurrence_timezone
      from events e
      where e.household_id = target_household_id
        and not e.all_day
        and e.recurrence_frequency is null
        and e.starts_at >= window_end_exclusive
      order by e.starts_at
      limit 1
    )
  ),
  chore_rows as (
    select c.id, c.title, c.next_due
    from chores c
    where c.household_id = target_household_id
      and (
        c.next_due between window_start and window_end
        or c.next_due < local_today
      )

    union

    (
      select c.id, c.title, c.next_due
      from chores c
      where c.household_id = target_household_id
        and c.next_due > window_end
      order by c.next_due
      limit 1
    )
  ),
  exception_rows as (
    select
      x.id, x.series_id, x.original_occurrence_key, x.cancelled,
      x.title, x.details, x.all_day, x.start_date, x.end_date,
      x.starts_at, x.ends_at, x.version
    from event_occurrence_exceptions x
    where x.household_id = target_household_id
      and x.series_id in (
        select id from event_rows where recurrence_frequency is not null
      )
      and (
        (
          x.original_occurrence_key >= window_start::text
          and x.original_occurrence_key < (window_end + 1)::text
        )
        or (x.start_date between window_start and window_end)
        or (x.starts_at >= window_start_instant and x.starts_at < window_end_exclusive)
      )
  )
  select jsonb_build_object(
    'events', coalesce((select jsonb_agg(to_jsonb(e)) from event_rows e), '[]'::jsonb),
    'chores', coalesce((select jsonb_agg(to_jsonb(c)) from chore_rows c), '[]'::jsonb),
    'exceptions', coalesce((select jsonb_agg(to_jsonb(x)) from exception_rows x), '[]'::jsonb)
  );
$$;

ALTER FUNCTION "public"."get_calendar_window"("target_household_id" "uuid", "window_start" "date", "window_end" "date", "window_start_instant" timestamp with time zone, "window_end_exclusive" timestamp with time zone, "local_today" "date") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_my_household_context"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select jsonb_build_object(
    'user_id', p.user_id,
    'display_name', p.display_name,
    'avatar_path', p.avatar_path,
    'setup_completed', p.setup_completed,
    'membership_id', m.id,
    'household_id', m.household_id,
    'membership_role', m.role,
    'household_timezone', h.timezone
  )
  from user_profiles p
  left join memberships m on m.user_id = p.user_id
  left join households h on h.id = m.household_id
  where p.user_id = auth.uid()
  order by m.created_at
  limit 1;
$$;

ALTER FUNCTION "public"."get_my_household_context"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."is_household_owner"("hid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from memberships
    where household_id = hid
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

ALTER FUNCTION "public"."is_household_owner"("hid" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."is_member"("hid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from memberships
    where household_id = hid and user_id = auth.uid()
  );
$$;

ALTER FUNCTION "public"."is_member"("hid" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."join_household_with_invite"("input_code" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

ALTER FUNCTION "public"."join_household_with_invite"("input_code" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."leave_household"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_membership_id uuid;
  current_household_id uuid;
begin
  select id, household_id into current_membership_id, current_household_id
  from memberships
  where user_id = auth.uid()
  for update;

  if current_membership_id is null then
    return false;
  end if;
  if exists (
    select 1 from memberships
    where id = current_membership_id and role = 'owner'
  ) then
    raise exception 'Transfer ownership before leaving the Household.';
  end if;

  delete from memberships where id = current_membership_id;
  update households
  set invite_code = generate_unique_invite_code()
  where id = current_household_id;
  return true;
end;
$$;

ALTER FUNCTION "public"."leave_household"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."remove_household_member"("target_membership_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

ALTER FUNCTION "public"."remove_household_member"("target_membership_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."rotate_household_invite"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

ALTER FUNCTION "public"."rotate_household_invite"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_event_updated_at_and_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$;

ALTER FUNCTION "public"."set_event_updated_at_and_version"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_household_timezone"("input_timezone" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  owned_household_id uuid;
  clean_timezone text := btrim(input_timezone);
begin
  select household_id into owned_household_id
  from memberships
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if owned_household_id is null then
    raise exception 'Only a Household owner can change its timezone.';
  end if;
  if not exists (select 1 from pg_timezone_names where name = clean_timezone) then
    raise exception 'Choose a valid Household timezone.';
  end if;

  update households set timezone = clean_timezone where id = owned_household_id;
  return clean_timezone;
end;
$$;

ALTER FUNCTION "public"."set_household_timezone"("input_timezone" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_user_profile_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."set_user_profile_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."shares_household_with"("other_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from memberships mine
    join memberships theirs on theirs.household_id = mine.household_id
    where mine.user_id = auth.uid()
      and theirs.user_id = other_user_id
  );
$$;

ALTER FUNCTION "public"."shares_household_with"("other_user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "details" "text",
    "all_day" boolean DEFAULT false NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "created_by_membership_id" "uuid",
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recurrence_frequency" "text",
    "recurrence_interval" integer,
    "recurrence_weekdays" smallint[],
    "recurrence_end_date" "date",
    "recurrence_count" integer,
    "recurrence_timezone" "text",
    CONSTRAINT "events_details_check" CHECK ((("details" IS NULL) OR ("char_length"("details") <= 2000))),
    CONSTRAINT "events_recurrence_count_check" CHECK ((("recurrence_count" IS NULL) OR (("recurrence_count" >= 1) AND ("recurrence_count" <= 999)))),
    CONSTRAINT "events_recurrence_frequency_check" CHECK ((("recurrence_frequency" IS NULL) OR ("recurrence_frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"])))),
    CONSTRAINT "events_recurrence_interval_check" CHECK ((("recurrence_interval" IS NULL) OR (("recurrence_interval" >= 1) AND ("recurrence_interval" <= 99)))),
    CONSTRAINT "events_recurrence_shape" CHECK (((("recurrence_frequency" IS NULL) AND ("recurrence_interval" IS NULL) AND ("recurrence_weekdays" IS NULL) AND ("recurrence_end_date" IS NULL) AND ("recurrence_count" IS NULL) AND ("recurrence_timezone" IS NULL)) OR (("recurrence_frequency" IS NOT NULL) AND ("recurrence_interval" IS NOT NULL) AND ("recurrence_timezone" IS NOT NULL) AND (NOT (("recurrence_end_date" IS NOT NULL) AND ("recurrence_count" IS NOT NULL))) AND (("recurrence_frequency" <> 'weekly'::"text") OR (("recurrence_weekdays" IS NOT NULL) AND (("cardinality"("recurrence_weekdays") >= 1) AND ("cardinality"("recurrence_weekdays") <= 7)) AND ("recurrence_weekdays" <@ ARRAY[(0)::smallint, (1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint])))))),
    CONSTRAINT "events_time_shape" CHECK ((("all_day" AND ("start_date" IS NOT NULL) AND ("starts_at" IS NULL) AND ("ends_at" IS NULL) AND (("end_date" IS NULL) OR ("end_date" >= "start_date"))) OR ((NOT "all_day") AND ("start_date" IS NULL) AND ("end_date" IS NULL) AND ("starts_at" IS NOT NULL) AND (("ends_at" IS NULL) OR ("ends_at" > "starts_at"))))),
    CONSTRAINT "events_title_check" CHECK ((("title" = "btrim"("title")) AND (("char_length"("title") >= 1) AND ("char_length"("title") <= 100)))),
    CONSTRAINT "events_version_check" CHECK (("version" > 0))
);

ALTER TABLE "public"."events" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."split_event_series"("p_series_id" "uuid", "p_expected_series_version" integer, "p_split_date" "date", "p_title" "text", "p_details" "text", "p_all_day" boolean, "p_start_date" "date", "p_end_date" "date", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_recurrence_end_date" "date", "p_recurrence_count" integer) RETURNS "public"."events"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_old events;
  v_new_id uuid;
  v_result events;
begin
  set local lock_timeout = '3s';
  select * into v_old
  from events
  where id = p_series_id and recurrence_frequency is not null
  for update;
  if not found then
    raise exception 'This recurring Event is no longer available.'
      using errcode = 'no_data_found';
  end if;
  if v_old.version <> p_expected_series_version then
    raise exception 'This series changed while you were editing.'
      using errcode = 'P0001';
  end if;

  insert into events (
    household_id, created_by_membership_id,
    title, details, all_day, start_date, end_date, starts_at, ends_at,
    recurrence_frequency, recurrence_interval, recurrence_weekdays,
    recurrence_end_date, recurrence_count, recurrence_timezone
  ) values (
    v_old.household_id, v_old.created_by_membership_id,
    p_title, p_details, p_all_day, p_start_date, p_end_date, p_starts_at, p_ends_at,
    v_old.recurrence_frequency, v_old.recurrence_interval, v_old.recurrence_weekdays,
    p_recurrence_end_date, p_recurrence_count, v_old.recurrence_timezone
  )
  returning id into v_new_id;

  insert into event_reminders (household_id, event_id, offset_minutes)
  select household_id, v_new_id, offset_minutes
  from event_reminders
  where event_id = p_series_id;

  update event_occurrence_exceptions
    set series_id = v_new_id
  where series_id = p_series_id
    and original_occurrence_key >= p_split_date::text;

  update events set
    recurrence_end_date = p_split_date - 1,
    recurrence_count = null
  where id = p_series_id;

  select * into v_result from events where id = v_new_id;
  return v_result;
end;
$$;

ALTER FUNCTION "public"."split_event_series"("p_series_id" "uuid", "p_expected_series_version" integer, "p_split_date" "date", "p_title" "text", "p_details" "text", "p_all_day" boolean, "p_start_date" "date", "p_end_date" "date", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_recurrence_end_date" "date", "p_recurrence_count" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."sync_todo_completed_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.done and (not old.done or new.completed_at is null) then
    new.completed_at := now();
  elsif not new.done then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

ALTER FUNCTION "public"."sync_todo_completed_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."transfer_household_ownership"("target_membership_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_owner_id uuid;
  owned_household_id uuid;
  target_id uuid;
begin
  select id, household_id into current_owner_id, owned_household_id
  from memberships
  where user_id = auth.uid() and role = 'owner'
  for update;

  if current_owner_id is null then
    raise exception 'Only a Household owner can transfer ownership.';
  end if;

  select id into target_id from memberships
  where id = target_membership_id
    and household_id = owned_household_id
    and role = 'member'
  for update;

  if target_id is null then
    return false;
  end if;

  update memberships set role = 'member' where id = current_owner_id;
  update memberships set role = 'owner' where id = target_membership_id;
  return true;
end;
$$;

ALTER FUNCTION "public"."transfer_household_ownership"("target_membership_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."truncate_event_series"("p_series_id" "uuid", "p_expected_series_version" integer, "p_split_date" "date") RETURNS "public"."events"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_series_version integer;
  v_result events;
begin
  set local lock_timeout = '3s';
  select version into v_series_version
  from events
  where id = p_series_id and recurrence_frequency is not null
  for update;
  if not found then
    raise exception 'This recurring Event is no longer available.'
      using errcode = 'no_data_found';
  end if;
  if v_series_version <> p_expected_series_version then
    raise exception 'This series changed while you were editing.'
      using errcode = 'P0001';
  end if;

  delete from event_occurrence_exceptions
  where series_id = p_series_id
    and original_occurrence_key >= p_split_date::text;

  update events set
    recurrence_end_date = p_split_date - 1,
    recurrence_count = null
  where id = p_series_id
  returning * into v_result;

  return v_result;
end;
$$;

ALTER FUNCTION "public"."truncate_event_series"("p_series_id" "uuid", "p_expected_series_version" integer, "p_split_date" "date") OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."event_occurrence_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "series_id" "uuid" NOT NULL,
    "original_occurrence_key" "text" NOT NULL,
    "cancelled" boolean DEFAULT false NOT NULL,
    "title" "text",
    "details" "text",
    "all_day" boolean,
    "start_date" "date",
    "end_date" "date",
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_occurrence_exceptions_check" CHECK (("cancelled" OR (("title" IS NOT NULL) AND ("all_day" IS NOT NULL) AND (("all_day" AND ("start_date" IS NOT NULL) AND ("starts_at" IS NULL) AND ("ends_at" IS NULL) AND (("end_date" IS NULL) OR ("end_date" >= "start_date"))) OR ((NOT "all_day") AND ("start_date" IS NULL) AND ("end_date" IS NULL) AND ("starts_at" IS NOT NULL) AND (("ends_at" IS NULL) OR ("ends_at" > "starts_at"))))))),
    CONSTRAINT "event_occurrence_exceptions_details_check" CHECK ((("details" IS NULL) OR ("char_length"("details") <= 2000))),
    CONSTRAINT "event_occurrence_exceptions_title_check" CHECK ((("title" IS NULL) OR (("title" = "btrim"("title")) AND (("char_length"("title") >= 1) AND ("char_length"("title") <= 100))))),
    CONSTRAINT "event_occurrence_exceptions_version_check" CHECK (("version" > 0))
);

ALTER TABLE "public"."event_occurrence_exceptions" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."upsert_event_occurrence_exception"("p_series_id" "uuid", "p_occurrence_key" "text", "p_expected_series_version" integer, "p_expected_exception_version" integer, "p_cancelled" boolean, "p_title" "text", "p_details" "text", "p_all_day" boolean, "p_start_date" "date", "p_end_date" "date", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) RETURNS "public"."event_occurrence_exceptions"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_household_id uuid;
  v_series_version integer;
  v_existing event_occurrence_exceptions;
  v_result event_occurrence_exceptions;
begin
  -- Fail fast instead of queueing behind a concurrent writer's row lock.
  set local lock_timeout = '3s';
  select household_id, version
    into v_household_id, v_series_version
  from events
  where id = p_series_id and recurrence_frequency is not null
  for update;
  if not found then
    raise exception 'This recurring Event is no longer available.'
      using errcode = 'no_data_found';
  end if;
  if v_series_version <> p_expected_series_version then
    raise exception 'This series changed while you were editing.'
      using errcode = 'P0001';
  end if;

  select *
    into v_existing
  from event_occurrence_exceptions
  where series_id = p_series_id and original_occurrence_key = p_occurrence_key
  for update;

  if found then
    if p_expected_exception_version is null
       or v_existing.version <> p_expected_exception_version then
      raise exception 'This occurrence changed while you were editing.'
        using errcode = 'P0001';
    end if;
    update event_occurrence_exceptions set
      cancelled = p_cancelled,
      title = p_title,
      details = p_details,
      all_day = p_all_day,
      start_date = p_start_date,
      end_date = p_end_date,
      starts_at = p_starts_at,
      ends_at = p_ends_at
    where id = v_existing.id
    returning * into v_result;
  else
    if p_expected_exception_version is not null then
      raise exception 'This occurrence changed while you were editing.'
        using errcode = 'P0001';
    end if;
    insert into event_occurrence_exceptions (
      household_id, series_id, original_occurrence_key,
      cancelled, title, details, all_day, start_date, end_date, starts_at, ends_at
    ) values (
      v_household_id, p_series_id, p_occurrence_key,
      p_cancelled, p_title, p_details, p_all_day, p_start_date, p_end_date, p_starts_at, p_ends_at
    )
    returning * into v_result;
  end if;

  return v_result;
end;
$$;

ALTER FUNCTION "public"."upsert_event_occurrence_exception"("p_series_id" "uuid", "p_occurrence_key" "text", "p_expected_series_version" integer, "p_expected_exception_version" integer, "p_cancelled" boolean, "p_title" "text", "p_details" "text", "p_all_day" boolean, "p_start_date" "date", "p_end_date" "date", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."validate_assignee_household"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from memberships
    where id = new.assignee_id
      and household_id = new.household_id
  ) then
    raise exception 'Assignee must belong to the same Household.';
  end if;
  return new;
end;
$$;

ALTER FUNCTION "public"."validate_assignee_household"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."validate_event_creator_household"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'UPDATE' and new.household_id is distinct from old.household_id then
    raise exception 'An Event cannot move between Households.';
  end if;
  -- ON DELETE SET NULL must be able to preserve an Event when its creator's
  -- Membership is removed. Other creator changes would rewrite authorship.
  if tg_op = 'UPDATE'
    and new.created_by_membership_id is distinct from old.created_by_membership_id
    and new.created_by_membership_id is not null then
    raise exception 'An Event creator cannot be reassigned.';
  end if;
  if new.created_by_membership_id is not null and not exists (
    select 1 from memberships
    where id = new.created_by_membership_id
      and household_id = new.household_id
  ) then
    raise exception 'Event creator must belong to the Event Household.';
  end if;
  return new;
end;
$$;

ALTER FUNCTION "public"."validate_event_creator_household"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."validate_event_exception_household"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if not exists (
    select 1 from events
    where id = new.series_id
      and household_id = new.household_id
      and recurrence_frequency is not null
  ) then
    raise exception 'Exception and recurring Event must belong to the same Household.';
  end if;
  return new;
end;
$$;

ALTER FUNCTION "public"."validate_event_exception_household"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."validate_event_recurrence_timezone"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.recurrence_timezone is not null and not exists (
    select 1 from pg_timezone_names where name = new.recurrence_timezone
  ) then
    raise exception 'Choose a valid recurrence timezone.';
  end if;
  return new;
end;
$$;

ALTER FUNCTION "public"."validate_event_recurrence_timezone"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."validate_event_reminder_household"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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

ALTER FUNCTION "public"."validate_event_reminder_household"() OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."chores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "freq" "text" NOT NULL,
    "interval_days" integer,
    "weekday" smallint,
    "next_due" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assignee_id" "uuid",
    CONSTRAINT "chores_check" CHECK (((("freq" = 'every_n_days'::"text") AND ("interval_days" IS NOT NULL)) OR (("freq" = 'weekly'::"text") AND ("weekday" IS NOT NULL)))),
    CONSTRAINT "chores_freq_check" CHECK (("freq" = ANY (ARRAY['every_n_days'::"text", 'weekly'::"text"]))),
    CONSTRAINT "chores_interval_days_check" CHECK ((("interval_days" IS NULL) OR ("interval_days" >= 1))),
    CONSTRAINT "chores_weekday_check" CHECK ((("weekday" IS NULL) OR (("weekday" >= 0) AND ("weekday" <= 6))))
);

ALTER TABLE "public"."chores" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."event_reminder_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "reminder_id" "uuid" NOT NULL,
    "occurrence_key" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "channel" "text" DEFAULT 'web_push'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "scheduled_for" timestamp with time zone NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_reminder_deliveries_attempts_check" CHECK (("attempts" >= 0)),
    CONSTRAINT "event_reminder_deliveries_channel_check" CHECK (("channel" = 'web_push'::"text")),
    CONSTRAINT "event_reminder_deliveries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'expired'::"text"])))
);

ALTER TABLE "public"."event_reminder_deliveries" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."event_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "offset_minutes" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_reminders_offset_minutes_check" CHECK ((("offset_minutes" >= 0) AND ("offset_minutes" <= 525600)))
);

ALTER TABLE "public"."event_reminders" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."grocery_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "bought" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "household_id" "uuid" NOT NULL
);

ALTER TABLE "public"."grocery_items" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."households" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invite_code" "text" DEFAULT "public"."generate_unique_invite_code"() NOT NULL,
    "timezone" "text" DEFAULT 'America/Chicago'::"text" NOT NULL,
    CONSTRAINT "households_readable_invite_code" CHECK (("invite_code" ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'::"text")),
    CONSTRAINT "households_timezone_not_blank" CHECK ((("timezone" = "btrim"("timezone")) AND (("char_length"("timezone") >= 1) AND ("char_length"("timezone") <= 100))))
);

ALTER TABLE "public"."households" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."invite_join_attempts" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."invite_join_attempts" OWNER TO "postgres";

ALTER TABLE "public"."invite_join_attempts" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."invite_join_attempts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "household_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text",
    CONSTRAINT "memberships_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'member'::"text"])))
);

ALTER TABLE "public"."memberships" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."todos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "text" "text" NOT NULL,
    "done" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "assignee_id" "uuid",
    "completed_at" timestamp with time zone
);

ALTER TABLE "public"."todos" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "user_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "avatar_path" "text",
    "setup_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_profiles_check" CHECK ((("avatar_path" IS NULL) OR ("avatar_path" = (("user_id")::"text" || '/avatar.webp'::"text")))),
    CONSTRAINT "user_profiles_display_name_check" CHECK ((("display_name" = "btrim"("display_name")) AND (("char_length"("display_name") >= 1) AND ("char_length"("display_name") <= 50))))
);

ALTER TABLE "public"."user_profiles" OWNER TO "postgres";

ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."event_occurrence_exceptions"
    ADD CONSTRAINT "event_occurrence_exceptions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."event_occurrence_exceptions"
    ADD CONSTRAINT "event_occurrence_exceptions_series_id_original_occurrence_k_key" UNIQUE ("series_id", "original_occurrence_key");

ALTER TABLE ONLY "public"."event_reminder_deliveries"
    ADD CONSTRAINT "event_reminder_deliveries_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."event_reminder_deliveries"
    ADD CONSTRAINT "event_reminder_deliveries_reminder_id_occurrence_key_user_i_key" UNIQUE ("reminder_id", "occurrence_key", "user_id", "subscription_id", "channel");

ALTER TABLE ONLY "public"."event_reminders"
    ADD CONSTRAINT "event_reminders_event_id_offset_minutes_key" UNIQUE ("event_id", "offset_minutes");

ALTER TABLE ONLY "public"."event_reminders"
    ADD CONSTRAINT "event_reminders_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."grocery_items"
    ADD CONSTRAINT "grocery_items_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."households"
    ADD CONSTRAINT "households_invite_code_key" UNIQUE ("invite_code");

ALTER TABLE ONLY "public"."households"
    ADD CONSTRAINT "households_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."invite_join_attempts"
    ADD CONSTRAINT "invite_join_attempts_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_household_id_key" UNIQUE ("user_id", "household_id");

ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");

ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."todos"
    ADD CONSTRAINT "todos_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id");

CREATE INDEX "chores_household_next_due_idx" ON "public"."chores" USING "btree" ("household_id", "next_due");

CREATE INDEX "event_reminder_deliveries_due_idx" ON "public"."event_reminder_deliveries" USING "btree" ("status", "scheduled_for") WHERE ("status" = ANY (ARRAY['pending'::"text", 'failed'::"text"]));

CREATE INDEX "events_active_recurrence_idx" ON "public"."events" USING "btree" ("household_id", "recurrence_end_date") WHERE ("recurrence_frequency" IS NOT NULL);

CREATE INDEX "events_household_start_date_idx" ON "public"."events" USING "btree" ("household_id", "start_date") WHERE "all_day";

CREATE INDEX "events_household_starts_at_idx" ON "public"."events" USING "btree" ("household_id", "starts_at") WHERE (NOT "all_day");

CREATE INDEX "invite_join_attempts_user_time_idx" ON "public"."invite_join_attempts" USING "btree" ("user_id", "attempted_at" DESC);

CREATE UNIQUE INDEX "memberships_one_owner_per_household" ON "public"."memberships" USING "btree" ("household_id") WHERE ("role" = 'owner'::"text");

CREATE INDEX "todos_assignee_id_idx" ON "public"."todos" USING "btree" ("assignee_id");

CREATE INDEX "todos_completed_cleanup_idx" ON "public"."todos" USING "btree" ("household_id", "completed_at") WHERE ("done" = true);

CREATE OR REPLACE TRIGGER "chores_validate_assignee_household" BEFORE INSERT OR UPDATE OF "assignee_id", "household_id" ON "public"."chores" FOR EACH ROW EXECUTE FUNCTION "public"."validate_assignee_household"();

CREATE OR REPLACE TRIGGER "event_exceptions_set_updated_at_and_version" BEFORE UPDATE ON "public"."event_occurrence_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_event_updated_at_and_version"();

CREATE OR REPLACE TRIGGER "event_exceptions_validate_household" BEFORE INSERT OR UPDATE OF "household_id", "series_id" ON "public"."event_occurrence_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_exception_household"();

CREATE OR REPLACE TRIGGER "event_reminders_validate_household" BEFORE INSERT OR UPDATE OF "household_id", "event_id" ON "public"."event_reminders" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_reminder_household"();

CREATE OR REPLACE TRIGGER "events_set_updated_at_and_version" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."set_event_updated_at_and_version"();

CREATE OR REPLACE TRIGGER "events_validate_creator_household" BEFORE INSERT OR UPDATE OF "created_by_membership_id", "household_id" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_creator_household"();

CREATE OR REPLACE TRIGGER "events_validate_recurrence_timezone" BEFORE INSERT OR UPDATE OF "recurrence_timezone" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_recurrence_timezone"();

CREATE OR REPLACE TRIGGER "todos_sync_completed_at" BEFORE UPDATE OF "done" ON "public"."todos" FOR EACH ROW EXECUTE FUNCTION "public"."sync_todo_completed_at"();

CREATE OR REPLACE TRIGGER "todos_validate_assignee_household" BEFORE INSERT OR UPDATE OF "assignee_id", "household_id" ON "public"."todos" FOR EACH ROW EXECUTE FUNCTION "public"."validate_assignee_household"();

CREATE OR REPLACE TRIGGER "user_profiles_set_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_profile_updated_at"();

ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."memberships"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_occurrence_exceptions"
    ADD CONSTRAINT "event_occurrence_exceptions_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_occurrence_exceptions"
    ADD CONSTRAINT "event_occurrence_exceptions_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_reminder_deliveries"
    ADD CONSTRAINT "event_reminder_deliveries_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_reminder_deliveries"
    ADD CONSTRAINT "event_reminder_deliveries_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."event_reminders"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_reminder_deliveries"
    ADD CONSTRAINT "event_reminder_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_reminder_deliveries"
    ADD CONSTRAINT "event_reminder_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_reminders"
    ADD CONSTRAINT "event_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_reminders"
    ADD CONSTRAINT "event_reminders_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_membership_id_fkey" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."grocery_items"
    ADD CONSTRAINT "grocery_items_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id");

ALTER TABLE ONLY "public"."invite_join_attempts"
    ADD CONSTRAINT "invite_join_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."todos"
    ADD CONSTRAINT "todos_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."memberships"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."todos"
    ADD CONSTRAINT "todos_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id");

ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."chores" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chores in my household" ON "public"."chores" TO "authenticated" USING ("public"."is_member"("household_id")) WITH CHECK ("public"."is_member"("household_id"));

CREATE POLICY "event exceptions in my household" ON "public"."event_occurrence_exceptions" TO "authenticated" USING ("public"."is_member"("household_id")) WITH CHECK ("public"."is_member"("household_id"));

CREATE POLICY "event reminders in my household" ON "public"."event_reminders" TO "authenticated" USING ("public"."is_member"("household_id")) WITH CHECK ("public"."is_member"("household_id"));

ALTER TABLE "public"."event_occurrence_exceptions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."event_reminder_deliveries" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."event_reminders" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events in my household" ON "public"."events" TO "authenticated" USING ("public"."is_member"("household_id")) WITH CHECK ("public"."is_member"("household_id"));

CREATE POLICY "groceries in my household" ON "public"."grocery_items" TO "authenticated" USING ("public"."is_member"("household_id")) WITH CHECK ("public"."is_member"("household_id"));

ALTER TABLE "public"."grocery_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household memberships" ON "public"."memberships" FOR SELECT TO "authenticated" USING ("public"."is_member"("household_id"));

CREATE POLICY "household profiles read" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."shares_household_with"("user_id")));

ALTER TABLE "public"."households" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."invite_join_attempts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member households read" ON "public"."households" FOR SELECT TO "authenticated" USING ("public"."is_member"("id"));

CREATE POLICY "members read reminder deliveries" ON "public"."event_reminder_deliveries" FOR SELECT TO "authenticated" USING (("public"."is_member"("household_id") AND ("user_id" = "auth"."uid"())));

ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self profile insert" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "self profile update" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));

ALTER TABLE "public"."todos" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos in my household" ON "public"."todos" TO "authenticated" USING ("public"."is_member"("household_id")) WITH CHECK ("public"."is_member"("household_id"));

ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage their push subscriptions" ON "public"."push_subscriptions" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_household_with_owner"("household_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_household_with_owner"("household_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_household_with_owner"("household_name" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_household_with_owner"("household_name" "text", "household_timezone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_household_with_owner"("household_name" "text", "household_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_household_with_owner"("household_name" "text", "household_timezone" "text") TO "service_role";

-- Default privileges also grant authenticated EXECUTE on new functions, and the
-- dump does not revoke it; 0014 made the invite-code generators internal.
REVOKE ALL ON FUNCTION "public"."generate_invite_code"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."generate_invite_code"() FROM "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."generate_unique_invite_code"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."generate_unique_invite_code"() FROM "authenticated";
GRANT ALL ON FUNCTION "public"."generate_unique_invite_code"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_calendar_window"("target_household_id" "uuid", "window_start" "date", "window_end" "date", "window_start_instant" timestamp with time zone, "window_end_exclusive" timestamp with time zone, "local_today" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_calendar_window"("target_household_id" "uuid", "window_start" "date", "window_end" "date", "window_start_instant" timestamp with time zone, "window_end_exclusive" timestamp with time zone, "local_today" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_calendar_window"("target_household_id" "uuid", "window_start" "date", "window_end" "date", "window_start_instant" timestamp with time zone, "window_end_exclusive" timestamp with time zone, "local_today" "date") TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_my_household_context"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_household_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_household_context"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."is_household_owner"("hid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_household_owner"("hid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_household_owner"("hid" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."is_member"("hid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_member"("hid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member"("hid" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."join_household_with_invite"("input_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."join_household_with_invite"("input_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_household_with_invite"("input_code" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."leave_household"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."leave_household"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_household"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."remove_household_member"("target_membership_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_household_member"("target_membership_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_household_member"("target_membership_id" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."rotate_household_invite"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rotate_household_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rotate_household_invite"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."set_event_updated_at_and_version"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_event_updated_at_and_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_event_updated_at_and_version"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."set_household_timezone"("input_timezone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_household_timezone"("input_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_household_timezone"("input_timezone" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."set_user_profile_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_user_profile_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_profile_updated_at"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."shares_household_with"("other_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."shares_household_with"("other_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shares_household_with"("other_user_id" "uuid") TO "service_role";

GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";

REVOKE ALL ON FUNCTION "public"."split_event_series"("p_series_id" "uuid", "p_expected_series_version" integer, "p_split_date" "date", "p_title" "text", "p_details" "text", "p_all_day" boolean, "p_start_date" "date", "p_end_date" "date", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_recurrence_end_date" "date", "p_recurrence_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."split_event_series"("p_series_id" "uuid", "p_expected_series_version" integer, "p_split_date" "date", "p_title" "text", "p_details" "text", "p_all_day" boolean, "p_start_date" "date", "p_end_date" "date", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_recurrence_end_date" "date", "p_recurrence_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."split_event_series"("p_series_id" "uuid", "p_expected_series_version" integer, "p_split_date" "date", "p_title" "text", "p_details" "text", "p_all_day" boolean, "p_start_date" "date", "p_end_date" "date", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_recurrence_end_date" "date", "p_recurrence_count" integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."sync_todo_completed_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_todo_completed_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_todo_completed_at"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."transfer_household_ownership"("target_membership_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transfer_household_ownership"("target_membership_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_household_ownership"("target_membership_id" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."truncate_event_series"("p_series_id" "uuid", "p_expected_series_version" integer, "p_split_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."truncate_event_series"("p_series_id" "uuid", "p_expected_series_version" integer, "p_split_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."truncate_event_series"("p_series_id" "uuid", "p_expected_series_version" integer, "p_split_date" "date") TO "service_role";

GRANT ALL ON TABLE "public"."event_occurrence_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."event_occurrence_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."event_occurrence_exceptions" TO "service_role";

REVOKE ALL ON FUNCTION "public"."upsert_event_occurrence_exception"("p_series_id" "uuid", "p_occurrence_key" "text", "p_expected_series_version" integer, "p_expected_exception_version" integer, "p_cancelled" boolean, "p_title" "text", "p_details" "text", "p_all_day" boolean, "p_start_date" "date", "p_end_date" "date", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_event_occurrence_exception"("p_series_id" "uuid", "p_occurrence_key" "text", "p_expected_series_version" integer, "p_expected_exception_version" integer, "p_cancelled" boolean, "p_title" "text", "p_details" "text", "p_all_day" boolean, "p_start_date" "date", "p_end_date" "date", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_event_occurrence_exception"("p_series_id" "uuid", "p_occurrence_key" "text", "p_expected_series_version" integer, "p_expected_exception_version" integer, "p_cancelled" boolean, "p_title" "text", "p_details" "text", "p_all_day" boolean, "p_start_date" "date", "p_end_date" "date", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_assignee_household"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_assignee_household"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_assignee_household"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_event_creator_household"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_event_creator_household"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_creator_household"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_event_exception_household"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_event_exception_household"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_exception_household"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_event_recurrence_timezone"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_event_recurrence_timezone"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_recurrence_timezone"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_event_reminder_household"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_event_reminder_household"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_reminder_household"() TO "service_role";

GRANT ALL ON TABLE "public"."chores" TO "anon";
GRANT ALL ON TABLE "public"."chores" TO "authenticated";
GRANT ALL ON TABLE "public"."chores" TO "service_role";

GRANT ALL ON TABLE "public"."event_reminder_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."event_reminder_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."event_reminder_deliveries" TO "service_role";

GRANT ALL ON TABLE "public"."event_reminders" TO "anon";
GRANT ALL ON TABLE "public"."event_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."event_reminders" TO "service_role";

GRANT ALL ON TABLE "public"."grocery_items" TO "anon";
GRANT ALL ON TABLE "public"."grocery_items" TO "authenticated";
GRANT ALL ON TABLE "public"."grocery_items" TO "service_role";

GRANT ALL ON TABLE "public"."households" TO "anon";
GRANT ALL ON TABLE "public"."households" TO "authenticated";
GRANT ALL ON TABLE "public"."households" TO "service_role";

GRANT ALL ON TABLE "public"."invite_join_attempts" TO "anon";
GRANT ALL ON TABLE "public"."invite_join_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."invite_join_attempts" TO "service_role";

GRANT ALL ON SEQUENCE "public"."invite_join_attempts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invite_join_attempts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invite_join_attempts_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";

GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";

GRANT ALL ON TABLE "public"."todos" TO "anon";
GRANT ALL ON TABLE "public"."todos" TO "authenticated";
GRANT ALL ON TABLE "public"."todos" TO "service_role";

GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

-- Platform objects the schema dump skips (from 0002, 0006, 0008).

SELECT cron.schedule(
  'purge-done-todos-by-household-timezone',
  '15 * * * *',
  $job$
    delete from todos t
    using households h
    where t.household_id = h.id
      and t.done = true
      and t.completed_at is not null
      and extract(hour from now() at time zone h.timezone) = 3
      and (t.completed_at at time zone h.timezone)::date
        < (now() at time zone h.timezone)::date
  $job$
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', false, 2097152, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

CREATE POLICY "users upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "household avatars read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.avatar_path = name
        AND (p.user_id = auth.uid() OR public.shares_household_with(p.user_id))
    )
  );
