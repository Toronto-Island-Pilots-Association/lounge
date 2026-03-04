#!/usr/bin/env bash
# Dev-only: sync data from lounge (prod) to lounge-dev.
# Requires: SUPABASE_PROD_DATABASE_URL (read-only prod), SUPABASE_DEV_DATABASE_URL (read-write dev), pg_dump and psql on PATH.
# If the password contains ) & = + # ? etc., URL-encode it in the URI (e.g. ) → %29, @ → %40).
set -e

# Prefer PostgreSQL 17 client tools (Supabase uses Postgres 17); pg_dump must be >= server version
for prefix in /opt/homebrew/opt/postgresql@17 /usr/local/opt/postgresql@17; do
  if [ -x "${prefix}/bin/pg_dump" ]; then
    export PATH="${prefix}/bin:$PATH"
    break
  fi
done
PG_DUMP_VERSION=$(pg_dump --version | sed -n 's/.* \([0-9]*\)\.[0-9]*.*/\1/p')
if [ -n "$PG_DUMP_VERSION" ] && [ "$PG_DUMP_VERSION" -lt 17 ]; then
  echo "Supabase uses Postgres 17; your pg_dump is too old. Install: brew install postgresql@17" >&2
  echo "Then ensure \$(brew --prefix postgresql@17)/bin is in your PATH, or re-run this script." >&2
  exit 1
fi

if [ -z "${SUPABASE_PROD_DATABASE_URL}" ] || [ -z "${SUPABASE_DEV_DATABASE_URL}" ]; then
  echo "Missing env: set SUPABASE_PROD_DATABASE_URL and SUPABASE_DEV_DATABASE_URL (same .env format as other Supabase vars)." >&2
  exit 1
fi

if [ "${SUPABASE_PROD_DATABASE_URL}" = "${SUPABASE_DEV_DATABASE_URL}" ]; then
  echo "SUPABASE_PROD_DATABASE_URL and SUPABASE_DEV_DATABASE_URL must be different (source=prod, target=dev)." >&2
  exit 1
fi

DUMP_FILE=$(mktemp)
trap 'rm -f "$DUMP_FILE"' EXIT

echo "Dumping data from lounge (prod)..."
pg_dump "$SUPABASE_PROD_DATABASE_URL" --data-only --no-owner --no-privileges -n public -n auth -f "$DUMP_FILE"

echo "Truncating lounge-dev..."
psql "$SUPABASE_DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -c "TRUNCATE auth.users CASCADE;"

echo "Restoring into lounge-dev..."
psql "$SUPABASE_DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"

echo "Done. lounge-dev now has a copy of lounge data."
