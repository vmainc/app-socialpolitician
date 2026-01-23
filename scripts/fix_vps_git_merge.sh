#!/bin/bash
# Fix git merge conflict on VPS by handling untracked files

set -e

echo "🔧 Fixing Git Merge Conflict"
echo "============================"
echo ""

APP_DIR="/var/www/socialpolitician-app"
cd "$APP_DIR" || exit 1

# Files that would be overwritten
CONFLICT_FILES=(
    "scripts/scrape_portraits.js"
    "scripts/scrape_portraits_batch.sh"
    "scripts/upload_portraits.js"
)

echo "📋 Checking for untracked files that conflict..."
echo ""

# Check each file
for file in "${CONFLICT_FILES[@]}"; do
    if [ -f "$file" ] && ! git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
        echo "⚠️  Found untracked file: $file"
        
        # Check if it's different from what's in git
        if git show "origin/main:$file" >/dev/null 2>&1; then
            echo "   File exists in git - backing up and using git version"
            mv "$file" "${file}.backup.$(date +%Y%m%d_%H%M%S)"
        else
            echo "   File doesn't exist in git - keeping local version"
            git add "$file"
        fi
    fi
done

echo ""
echo "🔄 Retrying git pull..."
git pull origin main

echo ""
echo "✅ Git pull complete!"
echo ""
