#!/bin/bash
# Convenience script: deploy from local machine to VPS in one command.
# Usage (from repo root on your laptop):
#   bash deploy-from-local.sh
# Or override defaults:
#   VPS_HOST=user@your-vps-ip VPS_APP_DIR=/var/www/socialpolitician-app bash deploy-from-local.sh

set -e

# Defaults – override with environment variables if needed
VPS_HOST="${VPS_HOST:-doug@69.169.103.23}"
VPS_APP_DIR="${VPS_APP_DIR:-/var/www/socialpolitician-app}"

echo "🚀 Deploying from local to VPS"
echo "   Host: $VPS_HOST"
echo "   App dir: $VPS_APP_DIR"
echo ""

# Quick safety check: ensure we're in the project root (has package.json)
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found in current directory."
  echo "   Run this from the project root (app.socialpolitician.com)."
  exit 1
fi

echo "📤 Connecting to VPS and running deploy-to-vps.sh..."
ssh "$VPS_HOST" "cd \"$VPS_APP_DIR\" && bash deploy-to-vps.sh"

echo ""
echo "✅ Remote deploy script finished."
echo "🌐 Check: https://app.socialpolitician.com"

