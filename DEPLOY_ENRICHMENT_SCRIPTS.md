# Deploy Enrichment Scripts to VPS

The enrichment scripts were created locally and need to be deployed to the VPS.

## Option 1: Deploy via Git (Recommended)

If your repo is connected to git:

```bash
# On local machine
git add scripts/ server/src/scripts/enrichPoliticiansFromWikipedia.ts
git commit -m "Add data enrichment pipeline scripts"
git push

# On VPS
cd /var/www/socialpolitician-app
git pull
```

## Option 2: Create Files Directly on VPS

If git isn't set up, you can create the files directly on the VPS. The main file you need is:

### Create `scripts/run_data_enrichment.sh` on VPS

```bash
cd /var/www/socialpolitician-app
cat > scripts/run_data_enrichment.sh << 'ENDOFFILE'
#!/bin/bash
# Master script to run the complete data enrichment pipeline

set -e

echo "🚀 Data Enrichment Pipeline"
echo "==========================="
echo ""

if [ -z "$POCKETBASE_ADMIN_EMAIL" ] || [ -z "$POCKETBASE_ADMIN_PASSWORD" ]; then
    echo "❌ ERROR: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set"
    exit 1
fi

POCKETBASE_URL=${POCKETBASE_URL:-http://127.0.0.1:8091}
export POCKETBASE_URL POCKETBASE_ADMIN_EMAIL POCKETBASE_ADMIN_PASSWORD

# Step 1: Verify nginx
echo "1️⃣ Verifying Nginx Configuration"
if [ -f "scripts/verify_nginx_pb_files.sh" ]; then
    bash scripts/verify_nginx_pb_files.sh || echo "⚠️  Nginx check had issues"
else
    echo "⚠️  Nginx verification script not found, skipping"
fi
echo ""

# Step 2: Wikipedia enrichment
echo "2️⃣ Running Wikipedia Enrichment"
if [ -f "server/src/scripts/enrichPoliticiansFromWikipedia.ts" ]; then
    npx tsx server/src/scripts/enrichPoliticiansFromWikipedia.ts || echo "⚠️  Enrichment had errors"
else
    echo "⚠️  Enrichment script not found"
fi
echo ""

# Step 3: Portrait download
echo "3️⃣ Downloading Portraits"
if [ -f "scripts/scrape_portraits.js" ]; then
    node scripts/scrape_portraits.js --limit=25 || echo "⚠️  Portrait download had errors"
else
    echo "⚠️  Portrait script not found"
fi
echo ""

# Step 4: Portrait upload
echo "4️⃣ Uploading Portraits"
if [ -f "scripts/upload_portraits.js" ]; then
    node scripts/upload_portraits.js || echo "⚠️  Portrait upload had errors"
else
    echo "⚠️  Upload script not found"
fi
echo ""

echo "✅ Pipeline complete!"
ENDOFFILE

chmod +x scripts/run_data_enrichment.sh
```

## Option 3: Quick Test - Run Individual Scripts

If the master script isn't available, you can run the individual components:

```bash
# 1. Wikipedia enrichment
npx tsx server/src/scripts/enrichPoliticiansFromWikipedia.ts

# 2. Download portraits
node scripts/scrape_portraits.js --limit=25

# 3. Upload portraits
node scripts/upload_portraits.js
```

## Check What Files Exist

On the VPS, check what's available:

```bash
cd /var/www/socialpolitician-app
ls -la scripts/
ls -la server/src/scripts/ | grep enrich
```

## Required Files Checklist

- ✅ `scripts/run_data_enrichment.sh` - Master runner
- ✅ `scripts/fix_nginx_pb_files.sh` - Nginx fix
- ✅ `scripts/verify_nginx_pb_files.sh` - Nginx verification
- ✅ `scripts/scrape_portraits.js` - Portrait downloader
- ✅ `scripts/upload_portraits.js` - Portrait uploader
- ✅ `scripts/scrape_portraits_batch.sh` - Batch wrapper
- ✅ `server/src/scripts/enrichPoliticiansFromWikipedia.ts` - Wikipedia enrichment
