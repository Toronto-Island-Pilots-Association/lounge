#!/usr/bin/env bash
# Dev-only: read from prod and seed dev with realistic data (user_profiles, threads, comments, reactions, events, etc.).
# Prod is read-only; only dev is written. Real users and auth are untouched.
# Requires: SUPABASE_PROD_DATABASE_URL (read-only prod), SUPABASE_DEV_DATABASE_URL (read-write dev), pg_dump and psql on PATH.
# If the password contains ) & = + # ? etc., URL-encode it in the URI (e.g. ) → %29, @ → %40).
set -e

# Load .env from project root (when run via npm run db:sync, cwd is project root)
if [ -f .env ]; then
  set -a
  # shellcheck source=.env
  source .env
  set +a
fi

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

echo "Reading from prod (user_profiles, threads, comments, reactions, events, ...)..."
pg_dump "$SUPABASE_PROD_DATABASE_URL" --data-only --no-owner --no-privileges -n public -f "$DUMP_FILE"

echo "Truncating public schema on lounge-dev..."
psql "$SUPABASE_DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -c "
DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
  LOOP
    EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END \$\$;
"

echo "Seeding lounge-dev with data..."
psql "$SUPABASE_DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"

echo "Redacting emails so dev never sends to real users..."
psql "$SUPABASE_DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -c "
-- user_profiles: unique dev addresses per profile
UPDATE public.user_profiles SET email = 'dev-' || REPLACE(SUBSTRING(id::text FROM 1 FOR 8), '-', '') || '@dev.local';
-- threads/comments: denormalized author emails (for deleted users)
UPDATE public.threads SET author_email = 'dev-author@dev.local' WHERE author_email IS NOT NULL;
UPDATE public.comments SET author_email = 'dev-author@dev.local' WHERE author_email IS NOT NULL;
"

echo "Done. Dev is seeded with prod data; all emails redacted to @dev.local."
