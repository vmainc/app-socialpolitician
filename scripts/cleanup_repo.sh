#!/bin/bash
# Cleanup old scripts and documentation files
# Keeps only actively used files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🧹 Cleaning up repository..."
echo ""

# Remove old nginx fix scripts (keep only the working ones)
echo "📝 Removing obsolete nginx fix scripts..."
rm -f scripts/fix_nginx_direct.sh
rm -f scripts/fix_nginx_final.sh
rm -f scripts/fix_nginx_simple.sh
rm -f scripts/fix_nginx_perl.sh
rm -f scripts/fix_nginx_manual_edit.sh
rm -f scripts/fix_nginx_manually.sh
rm -f scripts/fix_nginx_pb_files.sh
rm -f scripts/fix_nginx_file_proxy.sh
rm -f scripts/fix_nginx_file_serving.sh
# Keep: fix_nginx_working.sh, apply_nginx_file_fix.sh

# Remove old import scripts
echo "📝 Removing old import scripts..."
rm -f import-politicians-browser.js
rm -f import-via-browser-console.js
rm -f IMPORT_WITH_EMBEDDED_DATA.js
rm -f COPY_PASTE_THIS.js
rm -f add-fields-via-curl.sh
rm -f start-json-server.sh
rm -f server-json-with-cors.py

# Remove old troubleshooting docs
echo "📝 Removing old documentation files..."
rm -f CLEAR_CACHE.md
rm -f DEPLOY_CHANGES.md
rm -f DEPLOY_ENRICHMENT_SCRIPTS.md
rm -f DEPLOY_NOW.md
rm -f EASIEST_IMPORT.md
rm -f FIX_CORS_AND_RUN.md
rm -f FIX_POLITICIANS_ACCESS.md
rm -f FIX_SSL.md
rm -f IMPORT_INSTRUCTIONS.md
rm -f IMPORT_POLITICIANS.md
rm -f IMPORT_VIA_ADMIN_UI.md
rm -f POCKETBASE_CONNECTIVITY_BREAKDOWN.md
rm -f POCKETBASE_FIX_EXECUTION_REPORT.md
rm -f POCKETBASE_FIX_REPORT.md
rm -f POCKETBASE_FIX_SUCCESS.md
rm -f QUICK_DEPLOY.md
rm -f QUICK_SSL_SETUP.md
rm -f RUN_IMPORT_NOW.md
rm -f RUN_SCRIPT_NOW.md
rm -f SETUP_SSL_NOW.md
rm -f SIMPLE_IMPORT.md
rm -f SSL_IMPLEMENTATION_REPORT.md
rm -f SSL_SETUP_SUMMARY.md
rm -f SSL_TROUBLESHOOTING.md
rm -f VERIFY_IMPORT.md
rm -f VERIFY_RULES.md
rm -f VPS_DEPLOY_INSTRUCTIONS.md
rm -f HOW_NGINX_ROUTING_WORKS.md
rm -f DNS_SETUP.md
rm -f CREATE_POLITICIANS_COLLECTION.md
rm -f CLEANUP_PLAN.md

# Remove old verification scripts (keep essential ones)
echo "📝 Cleaning up verification scripts..."
rm -f scripts/check_nginx_config.sh
rm -f scripts/discover_ssl_setup.sh
rm -f scripts/run_ssl_setup.sh
rm -f scripts/setup_ssl_app.sh
rm -f scripts/validate_ssl.sh
rm -f scripts/verify_nginx_routes.sh
rm -f scripts/verify_pb_politicians.sh
rm -f scripts/verify_pb.sh
rm -f scripts/fix_politicians_access.sh
rm -f scripts/fix_vps_git_merge.sh
rm -f scripts/update_office_type.js
rm -f scripts/import_politicians_simple.js
rm -f scripts/scrape_portraits_batch.sh
# Keep: verify_nginx_pb_files.sh, check_photo_storage.sh

# Remove old deployment scripts (keep main one)
rm -f deploy.sh
rm -f diagnose-ssl.sh
rm -f fix-ssl.sh
# Keep: deploy-to-vps.sh, complete_deployment.sh

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Remaining active scripts:"
echo "   - scripts/complete_deployment.sh"
echo "   - scripts/enrich_governors.sh"
echo "   - scripts/scrape_governor_portraits.sh"
echo "   - scripts/scrape_portraits.js"
echo "   - scripts/upload_portraits.js"
echo "   - scripts/run_data_enrichment.sh"
echo "   - scripts/fix_nginx_working.sh"
echo "   - scripts/apply_nginx_file_fix.sh"
echo "   - scripts/verify_nginx_pb_files.sh"
echo "   - scripts/check_photo_storage.sh"
echo "   - deploy-to-vps.sh"
echo ""
echo "📋 Remaining documentation:"
echo "   - DATA_ENRICHMENT_IMPLEMENTATION.md"
echo "   - PHOTO_STORAGE_GUIDE.md"
echo "   - PORTRAIT_STATUS.md"
echo "   - SYSTEM_STATE_FOR_CHATGPT.md"
echo ""
