# Import Politicians Data to PocketBase

The `politicians` collection exists but is empty (0 records). Import the data from the JSON files.

## Option 1: Via PocketBase Admin UI (Recommended)

### Step 1: Create SSH Tunnel

**Use port 8092** (since 8091 might be in use locally):

```bash
ssh -L 8092:127.0.0.1:8091 doug@69.169.103.23
```

Keep this terminal open.

### Step 2: Access PocketBase Admin

1. Open in browser: **http://localhost:8092/_/**
2. Login:
   - Email: `admin@vma.agency`
   - Password: `VMAmadmia42O200!`

### Step 3: Import Data

1. Go to **Collections** → **politicians**
2. Click **"Import"** or **"Bulk Import"**
3. Upload JSON files from `/var/www/socialpolitician-app/data/`:
   - `senators_import_ready.json` (100 senators)
   - `representatives_import_ready.json` (435 representatives)
   - `governors_import_ready.json` (50 governors)
   - Or `politicians_import_ready.json` (all combined)

## Option 2: Via API (if admin API works)

If the admin API authentication works, you can run:

```bash
cd /var/www/socialpolitician-app
POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD=VMAmadmia42O200! \
npx tsx server/src/scripts/importPoliticiansDirect.ts
```

## Option 3: Manual Import via PocketBase Admin

1. SSH tunnel: `ssh -L 8092:127.0.0.1:8091 doug@69.169.103.23`
2. Open: http://localhost:8092/_/
3. Login with admin credentials
4. Go to Collections → politicians
5. Click "New Record" and manually add records, or use the Import feature

## Verify Import

After importing, verify:

```bash
curl https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=5
```

You should see politician records in the response.
