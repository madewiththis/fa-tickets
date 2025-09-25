#!/usr/bin/env bash
set -euo pipefail

SQL_FILE="$(cd "$(dirname "$0")" && pwd)/reset_db.sql"

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q '^fa_tickets_db$'; then
  echo "[reset-db] Running TRUNCATE in Docker container fa_tickets_db..."
  docker exec -i fa_tickets_db psql -U app -d fa_tickets -v ON_ERROR_STOP=1 -f - < "$SQL_FILE"
  echo "[reset-db] Done."
  exit 0
fi

# Fallback: local Postgres via psql
PGUSER=${PGUSER:-app}
PGPASSWORD_ENV=${PGPASSWORD:-app}
PGDATABASE=${PGDATABASE:-fa_tickets}
PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5432}

echo "[reset-db] Running against local Postgres at $PGHOST:$PGPORT db=$PGDATABASE user=$PGUSER..."
PGPASSWORD="$PGPASSWORD_ENV" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "[reset-db] Done."

