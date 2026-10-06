#!/usr/bin/env bash
# Dumps a Supabase database's app schema without Docker: the Supabase CLI prints
# its pg_dump script (same schema filters as `supabase db dump`) and a local
# pg_dump runs it. Needs `brew install libpq`.
#
# The CLI's filters skip platform schemas, so the pg_cron job and the avatars
# Storage bucket and policies are not in this output; the baseline migration
# carries them by hand.
#
# Usage (from web/): scripts/db-dump-schema.sh <output.sql>
# Prompts for the session-pooler connection string (Dashboard → Connect) so the
# password stays out of shell history. Percent-encode special characters in it.
set -euo pipefail

out=${1:?usage: scripts/db-dump-schema.sh <output.sql>}
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

read -rsp "Session-pooler connection string: " db_url
echo

version=$(psql "$db_url" -X -Atc 'show server_version')
echo "Server version: $version"
dump_script=$(npx supabase db dump --dry-run --db-url "$db_url")
tmp="$out.partial"
trap 'rm -f "$tmp"' EXIT
bash -c "$dump_script" > "$tmp"
mv "$tmp" "$out"
echo "Wrote $out ($(wc -l < "$out" | tr -d ' ') lines)"

# Snapshot of the hand-carried platform objects, for comparing two databases.
platform="${out%.sql}.platform.txt"
psql "$db_url" -X -At -v ON_ERROR_STOP=1 > "$platform" <<'SQL'
select 'cron', jobname, schedule, regexp_replace(command, '\s+', ' ', 'g')
from cron.job order by jobname;
select 'bucket', id, public, file_size_limit, allowed_mime_types
from storage.buckets order by id;
select 'policy', policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'storage' order by policyname;
SQL
echo "Wrote $platform"
