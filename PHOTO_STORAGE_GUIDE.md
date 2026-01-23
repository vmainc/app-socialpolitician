# Photo Storage Guide

## Where Photos Are Stored

PocketBase **automatically stores file fields** in its internal storage directory:

```
/var/www/socialpolitician-app/pocketbase/pb_data/storage/
```

When you upload a photo via the PocketBase API, it:
1. Stores the file in `pb_data/storage/{collectionId}/{recordId}/{filename}`
2. Updates the record's `photo` field with the filename
3. Serves files via `/pb/api/files/{collectionId}/{recordId}/{filename}`

## No Configuration Needed

✅ **PocketBase handles file storage automatically** - no setup required!

The `photo` field is already configured in the `politicians` collection:
- Type: `file`
- Max size: 5MB
- Allowed types: `image/jpeg`, `image/png`, `image/webp`
- Thumbnails: `100x100` (auto-generated)

## How Photos Are Accessed

### Frontend Code
```typescript
// Get photo URL
const photoUrl = pb.files.getURL(politician, politician.photo);
// Returns: /pb/api/files/pbc_3830222512/{recordId}/{filename}
```

### Direct URL Format
```
https://app.socialpolitician.com/pb/api/files/pbc_3830222512/{recordId}/{filename}
```

## Current Issue: 404 Errors

The photos ARE stored correctly in PocketBase, but **Nginx is returning 404** because:

1. **Nginx static files regex** is catching `/pb/api/files/...` requests
2. It tries to serve them as static files from `/var/www/socialpolitician-app/web/dist/`
3. Files don't exist there → 404 error

### The Fix

The Nginx static files regex needs to **exclude `/pb/` paths**:

**Before (broken):**
```nginx
location ~* \.(jpg|jpeg|png|...)$ {
    # This catches /pb/api/files/... and returns 404
}
```

**After (fixed):**
```nginx
location ~* ^(?!/pb/).*\.(jpg|jpeg|png|...)$ {
    # This excludes /pb/ paths, so they reach the proxy
}
```

## Verify Storage

### Check if photos are stored in PocketBase:

```bash
# On VPS
cd /var/www/socialpolitician-app

# Check storage directory
ls -la pocketbase/pb_data/storage/

# Check a specific collection
ls -la pocketbase/pb_data/storage/pbc_3830222512/
```

### Check via PocketBase API:

```bash
# Get a politician record
curl http://127.0.0.1:8091/api/collections/politicians/records/{recordId} \
  -H "Authorization: Bearer {token}"

# Response will include:
# {
#   "photo": "filename.jpg",
#   ...
# }
```

### Check via Admin UI:

1. SSH tunnel: `ssh -L 8091:127.0.0.1:8091 user@vps`
2. Open: `http://localhost:8091/_/`
3. Login with admin credentials
4. Go to Collections → politicians
5. View a record - if `photo` field has a filename, it's stored!

## Uploading Photos

Photos are uploaded using `scripts/upload_portraits.js`:

```bash
POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD=password \
node scripts/upload_portraits.js
```

This script:
1. Reads images from `portraits/to-label/` or `portraits/labeled/`
2. Uploads to PocketBase via FormData
3. PocketBase stores in `pb_data/storage/` automatically
4. Updates record's `photo` field

## Troubleshooting

### Photos show 404 in browser

**Cause**: Nginx routing issue (not storage issue)

**Fix**: Run the Nginx fix script:
```bash
sudo bash scripts/apply_nginx_file_fix.sh
```

### Photos not uploading

**Check**:
1. PocketBase is running: `sudo systemctl status socialpolitician-app-pocketbase.service`
2. Authentication works: Check admin email/password
3. File size: Must be < 5MB
4. File type: Must be jpeg, png, or webp

### Photos uploaded but not showing

**Check**:
1. Nginx routing (run fix script)
2. PocketBase file serving: `curl http://127.0.0.1:8091/api/files/...`
3. Browser console for errors
4. Check if `photo` field has value in PocketBase admin UI

## Summary

✅ **Storage is automatic** - PocketBase handles it  
✅ **No configuration needed** - it just works  
❌ **Nginx routing needs fix** - that's why you see 404s  
🔧 **Run the fix script** - `scripts/apply_nginx_file_fix.sh`
