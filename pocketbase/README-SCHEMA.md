# PocketBase schema (production ↔ dev)

## Reference: production schema

- **`schema-export-production.json`** – Summary of collection names, IDs, and rules from the **live** PocketBase at https://app.socialpolitician.com/pb/_/
- **Full export** – In PocketBase Admin (live): Settings → Export collections schema. Save that JSON as reference so dev can be aligned with live.

Use it to:

- See what collections and rules exist in production
- Compare with local dev after running `npm run dev` (migrations apply to local `pocketbase/pb_data`)
- Add or adjust migrations in `pb_migrations/` so a fresh dev DB matches production

## Keeping dev in sync with production

1. **Local dev** – Running `npm run dev` (or `npm run dev:pb`) starts PocketBase and runs all migrations in `pocketbase/pb_migrations/`. That defines the dev schema. Migration **1770400000_sync_politicians_rules_from_live.js** sets politicians list/view/create/update/delete rules to match live so dev behaves like production (e.g. admin can create records).

2. **If production was changed in the Admin UI** – Export the full schema from production (Admin → Settings → Export collections schema), then:
   - Save or compare with `schema-export-production.json` (or a full export file) for reference
   - Add a **new migration** in `pb_migrations/` that creates or updates collections to match (so future dev runs and deploys stay in sync)

3. **Collection IDs** – Production uses fixed IDs (e.g. `pbc_3830222512` for politicians). Migrations that reference collections by name (e.g. `findCollectionByNameOrId("politicians")`) work in both dev and production.

## Full schema export

For a full field-level export from production:

1. Log in at https://app.socialpolitician.com/pb/_/
2. Go to **Settings** (gear) → **Export collections schema**
3. Save the JSON and store it in this folder (e.g. `schema-export-production-full.json`) if you need to diff or replicate exact field definitions in a migration.
