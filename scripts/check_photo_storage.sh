#!/bin/bash
# Check if photos are stored in PocketBase and accessible

set -e

echo "🔍 Checking Photo Storage"
echo "=========================="
echo ""

APP_DIR="/var/www/socialpolitician-app"
STORAGE_DIR="${APP_DIR}/pocketbase/pb_data/storage"
COLLECTION_ID="pbc_3830222512"

# Check if storage directory exists
if [ -d "$STORAGE_DIR" ]; then
    echo "✅ Storage directory exists: $STORAGE_DIR"
    
    # Check collection storage
    COLLECTION_STORAGE="${STORAGE_DIR}/${COLLECTION_ID}"
    if [ -d "$COLLECTION_STORAGE" ]; then
        echo "✅ Collection storage exists: $COLLECTION_STORAGE"
        
        # Count stored files
        FILE_COUNT=$(find "$COLLECTION_STORAGE" -type f | wc -l)
        echo "   📁 Found $FILE_COUNT stored files"
        
        # Show some examples
        echo ""
        echo "📋 Sample stored files:"
        find "$COLLECTION_STORAGE" -type f | head -5 | while read file; do
            filename=$(basename "$file")
            size=$(du -h "$file" | cut -f1)
            echo "   - $filename ($size)"
        done
    else
        echo "⚠️  Collection storage not found: $COLLECTION_STORAGE"
        echo "   This might be normal if no photos have been uploaded yet"
    fi
else
    echo "⚠️  Storage directory not found: $STORAGE_DIR"
    echo "   This might be normal if PocketBase hasn't stored any files yet"
fi

echo ""
echo "🧪 Testing PocketBase file serving..."

# Test direct PocketBase access (bypassing Nginx)
if curl -sf http://127.0.0.1:8091/api/health >/dev/null; then
    echo "✅ PocketBase is running"
    
    # Try to get a sample file URL (will fail if no files, but tests routing)
    echo "   Testing file endpoint..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        "http://127.0.0.1:8091/api/files/${COLLECTION_ID}/test/test.jpg" || echo "000")
    
    if [ "$RESPONSE" = "404" ]; then
        echo "   ⚠️  File endpoint returns 404 (file doesn't exist, but routing works)"
    elif [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ]; then
        echo "   ✅ File endpoint returns $RESPONSE (routing works, auth required)"
    else
        echo "   ⚠️  File endpoint returns HTTP $RESPONSE"
    fi
else
    echo "❌ PocketBase is not running on port 8091"
fi

echo ""
echo "🌐 Testing via Nginx (public URL)..."

# Test via Nginx
NGINX_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://app.socialpolitician.com/pb/api/files/${COLLECTION_ID}/test/test.jpg" || echo "000")

if [ "$NGINX_RESPONSE" = "404" ]; then
    echo "❌ Nginx returns 404 for file requests"
    echo "   This is the problem! Run: sudo bash scripts/apply_nginx_file_fix.sh"
elif [ "$NGINX_RESPONSE" = "401" ] || [ "$NGINX_RESPONSE" = "403" ]; then
    echo "✅ Nginx returns $NGINX_RESPONSE (routing works correctly)"
else
    echo "⚠️  Nginx returns HTTP $NGINX_RESPONSE"
fi

echo ""
echo "📊 Summary:"
echo "   - Photos are stored in: $STORAGE_DIR"
echo "   - Access via: /pb/api/files/{collectionId}/{recordId}/{filename}"
echo "   - If Nginx returns 404, run the fix script"
echo ""
