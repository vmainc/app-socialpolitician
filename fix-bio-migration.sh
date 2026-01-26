#!/bin/bash
# Quick fix: Remove the broken add_bio_field migration
# Run on VPS: cd /var/www/socialpolitician-app && bash fix-bio-migration.sh

set -e

PB_MIGRATIONS_DIR="/var/www/socialpolitician-app/pocketbase/pb_migrations"
PROBLEMATIC_MIGRATION="1769200000_add_bio_field.js"

echo "🔧 Removing broken bio field migration..."

if [ -f "$PB_MIGRATIONS_DIR/$PROBLEMATIC_MIGRATION" ]; then
    echo "   Creating backup..."
    cp "$PB_MIGRATIONS_DIR/$PROBLEMATIC_MIGRATION" "$PB_MIGRATIONS_DIR/${PROBLEMATIC_MIGRATION}.backup"
    
    echo "   Removing: $PROBLEMATIC_MIGRATION"
    rm "$PB_MIGRATIONS_DIR/$PROBLEMATIC_MIGRATION"
    echo "   ✅ Migration removed"
    
    echo ""
    echo "   Restarting PocketBase..."
    sudo systemctl stop socialpolitician-app-pocketbase.service 2>/dev/null || true
    sleep 2
    sudo systemctl start socialpolitician-app-pocketbase.service
    
    echo ""
    echo "   Waiting for service to start..."
    sleep 8
    
    if sudo systemctl is-active --quiet socialpolitician-app-pocketbase.service; then
        echo "   ✅ PocketBase service is running!"
        sleep 3
        if curl -f -s http://127.0.0.1:8091/api/health >/dev/null 2>&1; then
            echo "   ✅ PocketBase is responding!"
        else
            echo "   ⚠️  Service running but not responding yet"
        fi
    else
        echo "   ❌ Service failed to start"
        echo "   Check logs: sudo journalctl -u socialpolitician-app-pocketbase.service -n 30"
    fi
else
    echo "   ℹ️  Migration not found (may have been removed already)"
fi

echo ""
echo "✅ Fix complete!"
