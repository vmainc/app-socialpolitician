#!/bin/bash
# Fix PocketBase migration error that's preventing startup
# Run on VPS: cd /var/www/socialpolitician-app && bash fix-pocketbase-migration.sh

set -e

echo "🔧 Fixing PocketBase migration error..."
echo ""

PB_MIGRATIONS_DIR="/var/www/socialpolitician-app/pocketbase/pb_migrations"
PROBLEMATIC_MIGRATION="1768833615_created_presidents.js"

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
    echo "4️⃣ Checking for other duplicate presidents migrations..."
    DUPLICATES=$(ls "$PB_MIGRATIONS_DIR"/*created_presidents.js 2>/dev/null | wc -l)
    if [ "$DUPLICATES" -gt 1 ]; then
        echo "   ⚠️  Found $DUPLICATES 'created_presidents' migrations"
        echo "   Listing all presidents migrations:"
        ls -1 "$PB_MIGRATIONS_DIR"/*presidents*.js | head -10
        echo ""
        echo "   💡 If PocketBase still fails, you may need to remove other duplicates"
    else
        echo "   ✅ No other duplicates found"
    fi
    
    echo ""
    echo "5️⃣ Restarting PocketBase service..."
    sudo systemctl stop socialpolitician-app-pocketbase.service 2>/dev/null || true
    sleep 2
    sudo systemctl start socialpolitician-app-pocketbase.service
    
    echo ""
    echo "6️⃣ Waiting for service to start..."
    sleep 5
    
    echo ""
    echo "7️⃣ Checking service status..."
    if sudo systemctl is-active --quiet socialpolitician-app-pocketbase.service; then
        echo "   ✅ PocketBase service is running!"
        
        echo ""
        echo "8️⃣ Testing PocketBase health..."
        sleep 2
        if curl -f -s http://127.0.0.1:8091/api/health >/dev/null 2>&1; then
            echo "   ✅ PocketBase is responding!"
            curl -s http://127.0.0.1:8091/api/health | head -c 200
            echo ""
        else
            echo "   ⚠️  PocketBase started but not responding yet"
            echo "   Check logs: sudo journalctl -u socialpolitician-app-pocketbase.service -n 50"
        fi
    else
        echo "   ❌ PocketBase service failed to start"
        echo ""
        echo "   Recent logs:"
        sudo journalctl -u socialpolitician-app-pocketbase.service -n 20 --no-pager || true
        echo ""
        echo "   💡 If it's still failing, check for other duplicate migrations"
    fi
    
else
    echo "   ℹ️  Migration file not found (may have been removed already)"
    echo ""
    echo "   Checking service status..."
    if sudo systemctl is-active --quiet socialpolitician-app-pocketbase.service; then
        echo "   ✅ PocketBase service is running"
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
