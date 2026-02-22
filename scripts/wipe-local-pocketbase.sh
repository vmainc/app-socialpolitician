#!/usr/bin/env bash
# Wipe local PocketBase data so the next start runs all migrations from scratch.
# Result: schema matches migrations (including 1770500000 = politicians like live).
# Run from repo root. Stop PocketBase first (Ctrl+C on npm run dev).

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PB_DATA="${REPO_ROOT}/pocketbase/pb_data"

if [ ! -d "$PB_DATA" ]; then
  echo "No pocketbase/pb_data folder. Nothing to wipe."
  exit 0
fi

echo "This will delete all local PocketBase data (DB, uploads, migrations state)."
echo "Directory: $PB_DATA"
read -r -p "Continue? [y/N] " ans
case "$ans" in
  [yY]|[yY][eE][sS]) ;;
  *) echo "Aborted."; exit 0 ;;
esac

rm -rf "${PB_DATA:?}"/*
echo "Done. Next steps:"
echo "  1. Create admin (required after wipe): npm run pb:admin:create"
echo "  2. Start PocketBase: npm run dev"
echo "  3. Log in at http://127.0.0.1:8091/_/ or run: npm run pb:import"
