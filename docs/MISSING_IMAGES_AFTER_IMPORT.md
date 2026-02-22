# Missing images after import

The import script (`npm run pb:import`) only imports **data** (name, slug, office_type, etc.). It does **not** upload photo files. The `photo` field in PocketBase is a file field and must be filled by uploading images.

## Option 1: Attach images already in `portraits/uploaded/`

If you have portrait images in `portraits/uploaded/` named like `slug_anything.jpg` (e.g. `gavin-newsom_abc123.jpg`), attach them to the matching politician by slug:

```bash
export POCKETBASE_URL=http://127.0.0.1:8091
export POCKETBASE_ADMIN_EMAIL=admin@vma.agency
export POCKETBASE_ADMIN_PASSWORD='...'
node scripts/upload_portraits_by_slug.js
```

Use `--force` to overwrite existing photos. Use `--slug=spencer-cox` to run for one politician only.

## Option 2: Fetch from Wikipedia and upload (senators, governors, etc.)

For politicians with a `wikipedia_url`, you can download portraits from Wikipedia and then upload them to PocketBase.

**Step 1 – Download portraits** (saves to `portraits/to-label/`):

```bash
export POCKETBASE_URL=http://127.0.0.1:8091
export POCKETBASE_ADMIN_EMAIL=admin@vma.agency
export POCKETBASE_ADMIN_PASSWORD='...'
node scripts/scrape_portraits.js
```

**Step 2 – Upload to PocketBase** (reads from `portraits/to-label/`, moves to `portraits/uploaded/` on success):

```bash
export POCKETBASE_URL=http://127.0.0.1:8091
export POCKETBASE_ADMIN_EMAIL=admin@vma.agency
export POCKETBASE_ADMIN_PASSWORD='...'
node scripts/upload_portraits.js
```

## Option 3: Copy storage from production

If production PocketBase already has all photos and you want the **exact same** files locally:

- Restore the **full** production backup (including `pb_data/storage/`) so record IDs match, **or**
- Use the same DB as production (no re-import) so record IDs are identical, then copy `pb_data/storage/pbc_3830222512/` from the server to local `pocketbase/pb_data/storage/pbc_3830222512/`.

After a **re-import**, local record IDs are new, so copying only the storage folder from production will not match records. Use Option 1 or 2 instead.

## Option 4: Sync from live (data + photos)

To **push the live site back to local** — copy all politicians (including executives) and attach their photos from live:

```bash
LIVE_PB_URL=https://app.socialpolitician.com/pb \
POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD='...' \
npm run pb:sync-from-live
```

- Fetches every politician from live (senators, representatives, governors, executives, others).
- Creates or updates local records by **slug** (same data as live).
- For each record that has a photo on live, downloads the image and uploads it to the local record so **images are attached** on the local site.

Use `--skip-photos` to sync only data (no image download/upload). **Where the images are:** on the live site they are stored in PocketBase’s file storage (served at `https://app.socialpolitician.com/pb/api/files/politicians/{id}/{filename}`). This script copies them into your local PocketBase storage and attaches them to the matching local politician by slug.

## Summary

| Situation | Use |
|-----------|-----|
| You have images in `portraits/uploaded/` | Option 1: `upload_portraits_by_slug.js` |
| Politicians have `wikipedia_url`, no photos yet | Option 2: `scrape_portraits.js` then `upload_portraits.js` |
| You want an exact copy of production files | Option 3: restore full backup or copy storage with matching DB |
| You want live data + photos on local | Option 4: `npm run pb:sync-from-live` |
