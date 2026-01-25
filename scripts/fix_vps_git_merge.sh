#!/bin/bash

# Fix Git Merge Conflict on VPS
# Removes untracked portrait files that are blocking git pull

set -e

echo "🔧 Fixing Git Merge Conflict"
echo "============================"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "📋 Removing untracked portrait files..."
echo "   (These are already uploaded to PocketBase)"
echo ""

# Remove the untracked portrait files that are blocking git pull
if [ -d "portraits/representatives" ]; then
  echo "🗑️  Removing portraits/representatives/ directory..."
  rm -rf portraits/representatives
  echo "✅ Removed"
else
  echo "ℹ️  portraits/representatives/ directory not found"
fi

echo ""
echo "📋 Pulling latest code..."
echo ""

# Now try to pull
if git pull origin main; then
  echo ""
  echo "✅ Git pull successful!"
else
  echo ""
  echo "⚠️  Git pull still failed. Try manually:"
  echo "   git fetch origin"
  echo "   git reset --hard origin/main"
fi

echo ""
