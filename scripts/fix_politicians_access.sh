#!/bin/bash
# Complete PocketBase Politicians Collection Fix Script
# Run this on your VPS: app.socialpolitician.com

set -e

echo "=========================================="
echo "PocketBase Politicians Collection Fix"
echo "=========================================="
echo ""

# Step A: Verify production API behavior
echo "STEP A: Verifying production API behavior..."
echo "--------------------------------------------"
echo ""

echo "A1. Testing health endpoint (from VPS):"
HEALTH_RESPONSE=$(curl -sS https://app.socialpolitician.com/pb/api/health)
echo "$HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | grep -q "<!DOCTYPE\|<html"; then
    echo "❌ ERROR: Health endpoint returned HTML - nginx proxy is broken!"
    exit 1
fi
echo "✅ Health endpoint returns JSON"
echo ""

echo "A2. Testing politicians endpoint (from VPS):"
POLITICIANS_RESPONSE=$(curl -sS "https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=1")
echo "$POLITICIANS_RESPONSE"
if echo "$POLITICIANS_RESPONSE" | grep -q "<!DOCTYPE\|<html"; then
    echo "❌ ERROR: Politicians endpoint returned HTML - nginx proxy is broken!"
    exit 1
fi
TOTAL_ITEMS=$(echo "$POLITICIANS_RESPONSE" | grep -o '"totalItems":[0-9]*' | cut -d: -f2 || echo "0")
echo "Current totalItems: $TOTAL_ITEMS"
if [ "$TOTAL_ITEMS" != "0" ]; then
    echo "✅ Politicians endpoint already returns records - no fix needed!"
    exit 0
fi
echo "⚠️  totalItems is 0 - proceeding with fix..."
echo ""

# Step B: Identify the live PocketBase process + data directory
echo "STEP B: Identifying live PocketBase process..."
echo "--------------------------------------------"
echo ""

echo "B1. Finding PocketBase processes:"
ps aux | grep -i pocketbase | grep -v grep || echo "No processes found"
echo ""

echo "B2. Checking port 8091 binding:"
ss -lntp | grep 8091 || echo "Port 8091 not bound"
echo ""

echo "B3. Checking systemd service status:"
systemctl status socialpolitician-app-pocketbase.service --no-pager -l || echo "Service not found"
echo ""

echo "B4. Getting systemd service configuration:"
systemctl cat socialpolitician-app-pocketbase.service || echo "Service file not found"
echo ""

# Extract data directory from service file
SERVICE_FILE="/etc/systemd/system/socialpolitician-app-pocketbase.service"
if [ -f "$SERVICE_FILE" ]; then
    DATA_DIR=$(grep -oP '--dir=\K[^\s]+' "$SERVICE_FILE" || echo "")
    if [ -z "$DATA_DIR" ]; then
        # Try to extract from ExecStart line
        DATA_DIR=$(grep ExecStart "$SERVICE_FILE" | grep -oP '--dir=\K[^\s]+' || echo "")
    fi
    if [ -z "$DATA_DIR" ]; then
        # Default based on documentation
        DATA_DIR="/var/www/socialpolitician-app/pocketbase/pb_data"
        echo "⚠️  Could not extract --dir from service file, using default: $DATA_DIR"
    else
        echo "✅ Found data directory from service file: $DATA_DIR"
    fi
else
    DATA_DIR="/var/www/socialpolitician-app/pocketbase/pb_data"
    echo "⚠️  Service file not found, using default: $DATA_DIR"
fi

DB_PATH="$DATA_DIR/data.db"
echo "Expected database path: $DB_PATH"
echo ""

# Step C: Confirm politicians collection exists and contains rows
echo "STEP C: Verifying database state..."
echo "--------------------------------------------"
echo ""

if [ ! -f "$DB_PATH" ]; then
    echo "❌ ERROR: Database file not found at $DB_PATH"
    echo "Please verify the correct path from step B"
    exit 1
fi

echo "C1. Backing up database..."
BACKUP_PATH="${DB_PATH}.bak.$(date +%F-%H%M%S)"
cp -a "$DB_PATH" "$BACKUP_PATH"
echo "✅ Backup created: $BACKUP_PATH"
echo ""

echo "C2. Checking record count in politicians collection:"
RECORD_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM politicians;" 2>/dev/null || echo "0")
echo "Record count: $RECORD_COUNT"
if [ "$RECORD_COUNT" = "0" ]; then
    echo "⚠️  WARNING: Database shows 0 records but admin UI shows 581"
    echo "This might be the wrong database file. Verify the path from step B."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

echo "C3. Checking current collection rules:"
sqlite3 "$DB_PATH" "SELECT name, listRule, viewRule FROM _collections WHERE name='politicians';" || echo "Collection not found"
echo ""

# Step D: Fix rules in the LIVE database
echo "STEP D: Fixing collection rules..."
echo "--------------------------------------------"
echo ""

echo "D1. Updating listRule and viewRule to allow public access:"
sqlite3 "$DB_PATH" \
  "UPDATE _collections SET listRule='id != \"\"', viewRule='id != \"\"' WHERE name='politicians';"
echo "✅ Rules updated"
echo ""

echo "D2. Verifying rules were updated:"
sqlite3 "$DB_PATH" \
  "SELECT name, listRule, viewRule FROM _collections WHERE name='politicians';"
echo ""

# Step E: Restart PocketBase
echo "STEP E: Restarting PocketBase..."
echo "--------------------------------------------"
echo ""

echo "E1. Restarting service:"
sudo systemctl restart socialpolitician-app-pocketbase.service
echo "✅ Service restarted"
echo ""

echo "E2. Waiting for service to be ready (5 seconds)..."
sleep 5
echo ""

echo "E3. Checking service status:"
systemctl status socialpolitician-app-pocketbase.service --no-pager -l | head -20
echo ""

echo "E4. Testing local PocketBase health:"
LOCAL_HEALTH=$(curl -sS http://127.0.0.1:8091/api/health || echo "FAILED")
echo "$LOCAL_HEALTH"
if echo "$LOCAL_HEALTH" | grep -q "healthy\|message"; then
    echo "✅ Local PocketBase is healthy"
else
    echo "❌ Local PocketBase health check failed"
    echo "Check logs: sudo journalctl -u socialpolitician-app-pocketbase.service -n 50"
    exit 1
fi
echo ""

echo "E5. Testing local politicians endpoint:"
LOCAL_POLITICIANS=$(curl -sS "http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1" || echo "FAILED")
LOCAL_TOTAL=$(echo "$LOCAL_POLITICIANS" | grep -o '"totalItems":[0-9]*' | cut -d: -f2 || echo "0")
echo "Local totalItems: $LOCAL_TOTAL"
if [ "$LOCAL_TOTAL" != "0" ]; then
    echo "✅ Local endpoint returns records"
else
    echo "⚠️  Local endpoint still returns 0 - check logs"
    echo "Response: $LOCAL_POLITICIANS"
fi
echo ""

# Step F: Confirm nginx proxy + public access
echo "STEP F: Verifying public HTTPS access..."
echo "--------------------------------------------"
echo ""

echo "F1. Testing public HTTPS endpoint:"
PUBLIC_RESPONSE=$(curl -sS "https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=1")
PUBLIC_TOTAL=$(echo "$PUBLIC_RESPONSE" | grep -o '"totalItems":[0-9]*' | cut -d: -f2 || echo "0")
echo "Public totalItems: $PUBLIC_TOTAL"
echo ""

if [ "$PUBLIC_TOTAL" = "0" ]; then
    echo "❌ Public endpoint still returns 0 records"
    echo "Response: $PUBLIC_RESPONSE"
    echo ""
    echo "Troubleshooting:"
    echo "1. Verify you edited the correct DB: $DB_PATH"
    echo "2. Verify PB restarted: systemctl status socialpolitician-app-pocketbase.service"
    echo "3. Check PB logs: sudo journalctl -u socialpolitician-app-pocketbase.service -n 200 --no-pager"
    exit 1
else
    echo "✅ SUCCESS: Public endpoint returns $PUBLIC_TOTAL records!"
    echo ""
    echo "Full response (first 500 chars):"
    echo "$PUBLIC_RESPONSE" | head -c 500
    echo "..."
fi

echo ""
echo "=========================================="
echo "✅ Fix completed successfully!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Database: $DB_PATH"
echo "  - Backup: $BACKUP_PATH"
echo "  - Rules updated: listRule='id != \"\"', viewRule='id != \"\"'"
echo "  - Public totalItems: $PUBLIC_TOTAL"
echo ""
