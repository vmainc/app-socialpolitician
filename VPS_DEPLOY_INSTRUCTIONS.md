# VPS Deployment Instructions

## Step 1: Fix Git Merge Conflict

The git pull failed because there are untracked files. Run this:

```bash
cd /var/www/socialpolitician-app

# Backup the conflicting files
mv scripts/scrape_portraits.js scripts/scrape_portraits.js.backup 2>/dev/null || true
mv scripts/scrape_portraits_batch.sh scripts/scrape_portraits_batch.sh.backup 2>/dev/null || true
mv scripts/upload_portraits.js scripts/upload_portraits.js.backup 2>/dev/null || true

# Now pull again
git pull origin main
```

## Step 2: Apply Nginx Fix for Photos

```bash
cd /var/www/socialpolitician-app
sudo bash scripts/apply_nginx_file_fix.sh
```

## Step 3: Verify Photos Are Stored

```bash
# Check storage (you already did this - 19 photos found!)
ls -la pocketbase/pb_data/storage/pbc_3830222512/

# Check one photo file
ls -la pocketbase/pb_data/storage/pbc_3830222512/hds7dmw5jo4m045/
```

## Step 4: Test Photo Access

```bash
# Test direct PocketBase access (should work)
curl -I http://127.0.0.1:8091/api/files/pbc_3830222512/hds7dmw5jo4m045/bob_casey_jr_hhq9ccfzz8.jpg

# Test via Nginx (should return 401/403, NOT 404)
curl -I https://app.socialpolitician.com/pb/api/files/pbc_3830222512/hds7dmw5jo4m045/bob_casey_jr_hhq9ccfzz8.jpg
```

## Step 5: Rebuild Frontend (Already Done!)

You already ran `npm run build` - that's good! Just reload nginx:

```bash
sudo systemctl reload nginx
```

## All-in-One Command

```bash
cd /var/www/socialpolitician-app && \
mv scripts/scrape_portraits.js scripts/scrape_portraits.js.backup 2>/dev/null || true && \
mv scripts/scrape_portraits_batch.sh scripts/scrape_portraits_batch.sh.backup 2>/dev/null || true && \
mv scripts/upload_portraits.js scripts/upload_portraits.js.backup 2>/dev/null || true && \
git pull origin main && \
sudo bash scripts/apply_nginx_file_fix.sh && \
sudo systemctl reload nginx && \
echo "✅ Done!"
```
