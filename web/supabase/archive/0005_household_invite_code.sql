-- 0005_household_invite_code.sql
-- Self-serve onboarding: each household gets a short unique invite code that a
-- new user enters to join. Owners share the code (shown on the home hub).

alter table households add column invite_code text unique;

-- Backfill existing households with a code.
update households
set invite_code = upper(substr(md5(random()::text), 1, 6))
where invite_code is null;

-- Now that every row has one, require it, and generate one for future households.
alter table households alter column invite_code set not null;
alter table households
  alter column invite_code set default upper(substr(md5(random()::text), 1, 6));
