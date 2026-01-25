# Complete Representative Deployment

## Current Status

✅ **Scraper Running**: The representative image scraper is currently running on the VPS and downloading images.

## Steps to Complete Deployment

### 1. Wait for Scraper to Complete

The scraper will:
- Download ~431 representative images
- Create `portraits/representatives/index.json`
- Take approximately 10-15 minutes

**Check if scraper is done:**
```bash
cd /var/www/socialpolitician-app
ls -la portraits/representatives/index.json
```

### 2. Upload Images to PocketBase

Once the scraper completes, upload the images:

```bash
cd /var/www/socialpolitician-app

POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD=VMAmadmia42O200! \
node scripts/upload_representative_photos.js
```

This will:
- Match each representative by name
- Upload their photo to PocketBase
- Process all 431 representatives

### 3. Fetch Bios for Representatives

After images are uploaded, fetch bios:

```bash
cd /var/www/socialpolitician-app

POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD=VMAmadmia42O200! \
node scripts/fetch_representative_bios.js
```

This will:
- Fetch ~500-word bios from Wikipedia
- Update the `bio` field for all representatives
- Take approximately 10-15 minutes (rate limited)

### 4. Deploy Frontend Changes

Deploy the latest frontend changes:

```bash
cd /var/www/socialpolitician-app
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
```

## Verification

After deployment, check:

1. **Representative photos**: Visit https://app.socialpolitician.com/representatives
2. **Profile pages**: Click on any representative to see their photo and bio
3. **Count**: Should show ~431 current representatives (excluding previous/former)

## Expected Results

- ✅ 425+ representatives with photos (99%+ coverage)
- ✅ Representative bios on profile pages
- ✅ Consistent styling matching directory pages
- ✅ Previous representatives filtered out
