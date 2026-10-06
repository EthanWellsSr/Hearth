#!/usr/bin/env bash
# Database-layer scale test against staging (design: v0.4.3 "Scale test").
# pgbench clients stand in for PostgREST's connection pool; --rate is the page
# rate of the simulated Users (50 Users at one page per 5 s = 10 pages/s).
#
# Usage (from web/): scripts/scale/run.sh <label> [users=50] [seconds=120]
# Needs `supabase login`, the CLI linked to staging, and seeds/scale.sql applied.
set -euo pipefail

label=${1:?usage: scripts/scale/run.sh <label> [users] [seconds]}
users=${2:-50}
seconds=${3:-120}
rate=$(( users / 5 ))
# Each client waits on one round trip at a time from this machine (~80 ms), so
# scale clients with the rate or the harness, not the database, becomes the limit.
# Supabase's session pooler caps a session at 15 clients.
clients=$(( rate < 10 ? 10 : rate > 15 ? 15 : rate ))
here=$(cd "$(dirname "$0")" && pwd)
out="$here/results/$label"
staging=lrksljvljdgkbgtklila
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

[ "$(cat supabase/.temp/project-ref)" = "$staging" ] || { echo "CLI is not linked to staging; refusing." >&2; exit 1; }
rm -rf "$out" && mkdir -p "$out"

# Temporary login-role credentials from the CLI; never printed.
eval "$(npx supabase db dump --linked --dry-run 2>/dev/null | grep '^export PG')"

echo "Measuring round trip..."
(cd "$out" && pgbench -n -c 1 -T 10 --rate 5 -f "$here/rtt.sql" -l --log-prefix=rtt > rtt.txt 2>&1)

psql -X -q -c "set role postgres" -c "select extensions.pg_stat_statements_reset()" > /dev/null

echo "Running $users Users ($rate pages/s) for ${seconds}s..."
(cd "$out" && pgbench -n -c "$clients" -j 4 --rate "$rate" -T "$seconds" -P 10 \
  -f "$here/home.sql@25" -f "$here/todos.sql@20" -f "$here/groceries.sql@15" \
  -f "$here/chores.sql@10" -f "$here/calendar.sql@20" \
  -f "$here/toggle_todo.sql@5" -f "$here/add_grocery.sql@5" \
  -l --log-prefix=load > pgbench.txt 2>&1) || echo "pgbench exited non-zero; see $out/pgbench.txt"

psql -X -A -F $'\t' -P footer=off > "$out/statements.tsv" <<'SQL'
set role postgres;
select calls, round(total_exec_time::numeric, 1) as total_ms,
  round(mean_exec_time::numeric, 2) as mean_ms, round(max_exec_time::numeric, 1) as max_ms,
  regexp_replace(left(query, 120), '\s+', ' ', 'g') as query
from extensions.pg_stat_statements
where query not ilike '%pg_stat_statements%'
order by total_exec_time desc limit 15;
SQL

python3 "$here/analyze.py" "$out" "$seconds" | tee "$out/summary.txt"
