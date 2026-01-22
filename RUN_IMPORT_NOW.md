# Run Import Now - Quick Guide

## Option 1: Browser Console (Easiest - Recommended)

1. **Ensure HTTP server is running** (already done on server):
   ```bash
   # Server is already serving JSON files on port 8888
   ```

2. **Create SSH tunnel** (on your local machine):
   ```bash
   ssh -L 8888:127.0.0.1:8888 doug@69.169.103.23
   ```

3. **Open PocketBase Admin UI**:
   - URL: `http://127.0.0.1:8091/_/#/collections?collection=pbc_3830222512`
   - Or via tunnel: `http://localhost:8092/_/` (if you created tunnel on 8092)

4. **Open Browser Console** (F12 → Console) and paste the script from `SIMPLE_IMPORT.md`

5. **Run it** - it will import all senators and governors automatically!

## Option 2: Server-Side Script (If you have admin token)

If you can get an admin token from the PocketBase admin UI:

```bash
ssh doug@69.169.103.23
cd /var/www/socialpolitician-app

# Get token from browser console (see instructions in script)
export POCKETBASE_ADMIN_TOKEN="your-token-here"
npx tsx server/src/scripts/importPoliticiansSimple.ts
```

## Option 3: PocketBase Admin UI Import Button

1. In PocketBase Admin UI, look for "Import" or "Bulk Import" button
2. Upload the JSON files from `/var/www/socialpolitician-app/data/`

## Current Status

- ✅ HTTP server running on port 8888 (serving JSON files)
- ✅ Collection exists: `pbc_3830222512` (politicians)
- ✅ JSON files ready: senators (100), governors (50)
- ⏳ Waiting for import via browser console or admin UI

## Verify After Import

```bash
curl https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=5
```
