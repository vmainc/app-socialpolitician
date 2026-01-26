#!/bin/bash
# Fix politicians migration error - remove migration that tries to add duplicate field
# Run on VPS: cd /var/www/socialpolitician-app && bash fix-politicians-migration.sh

set -e

echo "🔧 Fixing politicians migration error..."
echo ""

PB_MIGRATIONS_DIR="/var/www/socialpolitician-app/pocketbase/pb_migrations"
PROBLEMATIC_MIGRATION="1768865019_updated_politicians.js"

if [ ! -d "$PB_MIGRATIONS_DIR" ]; then
    echo "❌ Error: Migrations directory not found: $PB_MIGRATIONS_DIR"
    exit 1
fi

echo "1️⃣ Checking for problematic migration..."
if [ -f "$PB_MIGRATIONS_DIR/$PROBLEMATIC_MIGRATION" ]; then
    echo "   ✅ Found: $PROBLEMATIC_MIGRATION"
    
    # Backup the file first
    echo "2️⃣ Creating backup..."
    cp "$PB_MIGRATIONS_DIR/$PROBLEMATIC_MIGRATION" "$PB_MIGRATIONS_DIR/${PROBLEMATIC_MIGRATION}.backup"
    echo "   ✅ Backup created"
    
    # Delete the problematic migration
    echo "3️⃣ Removing problematic migration..."
    rm "$PB_MIGRATIONS_DIR/$PROBLEMATIC_MIGRATION"
    echo "   ✅ Migration removed"
    
    echo ""
    echo "4️⃣ Checking for other problematic migrations..."
    # Check for any other migrations that might try to add office_type
    OTHER_PROBLEMS=$(grep -l "office_type" "$PB_MIGRATIONS_DIR"/*updated_politicians.js 2>/dev/null | wc -l)
    if [ "$OTHER_PROBLEMS" -gt 0 ]; then
        echo "   ⚠️  Found $OTHER_PROBLEMS other migrations that reference office_type"
        echo "   Listing:"
        grep -l "office_type" "$PB_MIGRATIONS_DIR"/*updated_politicians.js 2>/dev/null | xargs -n1 basename
        echo ""
        echo "   💡 If PocketBase still fails, you may need to remove these too"
    else
        echo "   ✅ No other obvious conflicts found"
    fi
    
    echo ""
    echo "5️⃣ Stopping PocketBase service..."
    sudo systemctl stop socialpolitician-app-pocketbase.service 2>/dev/null || true
    sleep 2
    
    echo ""
    echo "6️⃣ Starting PocketBase service..."
    sudo systemctl start socialpolitician-app-pocketbase.service
    
    echo ""
    echo "7️⃣ Waiting for service to start..."
    sleep 5
    
    echo ""
    echo "8️⃣ Checking service status..."
    if sudo systemctl is-active --quiet socialpolitician-app-pocketbase.service; then
        echo "   ✅ PocketBase service is running!"
        
        echo ""
        echo "9️⃣ Testing PocketBase health..."
        sleep 3
        if curl -f -s http://127.0.0.1:8091/api/health >/dev/null 2>&1; then
            echo "   ✅ PocketBase is responding!"
            HEALTH=$(curl -s http://127.0.0.1:8091/api/health)
            echo "   Response: $HEALTH"
            
            echo ""
            echo "🔟 Testing politicians collection..."
            sleep 1
            if curl -f -s "http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1" >/dev/null 2>&1; then
                echo "   ✅ Politicians collection is accessible!"
                COUNT=$(curl -s "http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1" | grep -o '"totalItems":[0-9]*' | cut -d: -f2)
                echo "   Total politicians: $COUNT"
            else
                echo "   ⚠️  Politicians collection test failed"
            fi
        else
            echo "   ⚠️  PocketBase started but not responding yet"
            echo "   Check logs: sudo journalctl -u socialpolitician-app-pocketbase.service -n 50"
        fi
    else
        echo "   ❌ PocketBase service failed to start"
        echo ""
        echo "   Recent logs:"
        sudo journalctl -u socialpolitician-app-pocketbase.service -n 30 --no-pager || true
        echo ""
        echo "   💡 If still failing, there may be other migration issues"
    fi
    
else
    echo "   ℹ️  Migration file not found (may have been removed already)"
    echo ""
    echo "   Checking service status..."
    if sudo systemctl is-active --quiet socialpolitician-app-pocketbase.service; then
        echo "   ✅ PocketBase service is running"
        if curl -f -s http://127.0.0.1:8091/api/health >/dev/null 2>&1; then
            echo "   ✅ PocketBase is responding!"
        else
            echo "   ⚠️  PocketBase is running but not responding"
        fi
    else
        echo "   ❌ PocketBase service is not running"
        echo "   Check logs: sudo journalctl -u socialpolitician-app-pocketbase.service -n 50"
    fi
fi

echo ""
echo "✅ Migration fix complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Check if site is working: https://app.socialpolitician.com"
echo "   2. If still failing, check logs: sudo journalctl -u socialpolitician-app-pocketbase.service -f"
echo "   3. If needed, restore backup: mv $PB_MIGRATIONS_DIR/${PROBLEMATIC_MIGRATION}.backup $PB_MIGRATIONS_DIR/$PROBLEMATIC_MIGRATION"
