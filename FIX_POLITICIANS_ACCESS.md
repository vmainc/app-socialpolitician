# Fix Politicians Collection Public Access

The politicians collection has 581 records but the API returns 0 because the access rules are set to empty strings (admin-only).

## Quick Fix via Admin UI

1. **Access PocketBase Admin:**
   - SSH tunnel: `ssh -L 8092:127.0.0.1:8091 doug@69.169.103.23`
   - Open: `http://localhost:8092/_/`
   - Login: `admin@vma.agency` / `VMAmadmia42O200!`

2. **Update Collection Rules:**
   - Go to **Collections** → **politicians**
   - Click **Settings** (gear icon)
   - Scroll to **API Rules**
   - Set:
     - **List Rule:** `true`
     - **View Rule:** `true`
   - Click **Save**

## Fix via Script (On VPS)

```bash
cd /var/www/socialpolitician-app

POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD=VMAmadmia42O200! \
npx tsx server/src/scripts/updatePoliticiansCollectionRules.ts
```

## Verify Fix

After updating rules, test:

```bash
curl "https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=5"
```

Should return records instead of empty array.

## What Was Wrong

- **Before:** `listRule: ""` and `viewRule: ""` = No public access (admin-only)
- **After:** `listRule: "true"` and `viewRule: "true"` = Public read access

In PocketBase:
- Empty string (`""`) = No access (admin-only)
- `"true"` = Public access (anyone can read)
- `"@request.auth.id != ''"` = Authenticated users only
