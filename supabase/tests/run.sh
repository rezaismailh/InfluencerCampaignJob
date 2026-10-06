#!/usr/bin/env bash
# Runs the migrations and SQL tests against a throwaway local PostgreSQL.
# Needs PostgreSQL binaries (initdb, pg_ctl, psql). Set PG_BIN if they are not on PATH.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb 2>/dev/null || echo /usr/lib/postgresql/16/bin/initdb)")}"
DATA="${TMPDIR:-/tmp}/tali-pgtest"
PORT="${PGTEST_PORT:-54329}"

if [ "$(id -u)" = "0" ]; then RUN_AS=(su postgres -s /bin/bash -c); else RUN_AS=(bash -c); fi

if [ ! -d "$DATA" ]; then
  mkdir -p "$DATA"
  [ "$(id -u)" = "0" ] && chown postgres "$DATA"
  "${RUN_AS[@]}" "$PG_BIN/initdb -D $DATA -U postgres -A trust >/dev/null"
fi
if ! "$PG_BIN/pg_isready" -h "$DATA" -p "$PORT" -q; then
  "${RUN_AS[@]}" "$PG_BIN/pg_ctl -D $DATA -o '-p $PORT -k $DATA -c listen_addresses=' -l $DATA/log -w start >/dev/null"
fi

PSQL=("$PG_BIN/psql" -h "$DATA" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -d postgres -c "drop database if exists tali_test" -c "create database tali_test"
"${PSQL[@]}" -d tali_test -f "$ROOT/supabase/tests/shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -d tali_test -f "$f"
done
"${PSQL[@]}" -d tali_test -o /dev/null -f "$ROOT/supabase/tests/rls_and_rules.sql"
echo "SQL tests passed"
