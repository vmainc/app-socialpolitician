#!/usr/bin/env bash
# Rebuild the web app (clean + TypeScript + Vite). Run from repo root.
# Usage: bash scripts/rebuild.sh   OR   cd /var/www/socialpolitician-app && bash scripts/rebuild.sh

set -e
cd "$(dirname "$0")/.."
echo "🧹 Cleaning web/dist..."
rm -rf web/dist
echo "🔨 Building (tsc + vite)..."
npm run build
echo "🔍 Verifying build..."
npm run verify-build 2>/dev/null || true
echo "✅ Rebuild done. Output in web/dist/"
