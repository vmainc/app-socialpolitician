#!/bin/bash
# Master SSL Setup Script for app.socialpolitician.com
# This script runs all SSL setup steps in sequence
# Run on VPS: sudo bash scripts/run_ssl_setup.sh

set -e

echo "🔒 Complete SSL Setup for app.socialpolitician.com"
echo "=================================================="
echo ""
echo "This script will:"
echo "  1. Discover current SSL configuration"
echo "  2. Set up SSL to match presidents.socialpolitician.com"
echo "  3. Validate the SSL setup"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="/var/www/socialpolitician-app"

# Ensure we're in the app directory
if [ ! -d "$APP_DIR" ]; then
    echo "❌ App directory not found: $APP_DIR"
    echo "Please run this script from the VPS after navigating to the app directory"
    exit 1
fi

cd "$APP_DIR"

# Step 1: Discovery
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "STEP 1: Discovery"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ -f "scripts/discover_ssl_setup.sh" ]; then
    sudo bash scripts/discover_ssl_setup.sh
    echo ""
    read -p "Review the discovery output above. Continue with setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
else
    echo "⚠️  Discovery script not found, skipping..."
fi

# Step 2: Setup
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "STEP 2: SSL Setup"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ -f "scripts/setup_ssl_app.sh" ]; then
    sudo bash scripts/setup_ssl_app.sh
else
    echo "❌ Setup script not found: scripts/setup_ssl_app.sh"
    exit 1
fi

# Step 3: Validation
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "STEP 3: Validation"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ -f "scripts/validate_ssl.sh" ]; then
    bash scripts/validate_ssl.sh
    VALIDATION_EXIT=$?
    
    echo ""
    if [ $VALIDATION_EXIT -eq 0 ]; then
        echo "═══════════════════════════════════════════════════════════"
        echo "✅ SSL Setup Complete and Validated!"
        echo "═══════════════════════════════════════════════════════════"
        echo ""
        echo "🌐 Test in browser: https://app.socialpolitician.com"
        echo ""
        exit 0
    else
        echo "═══════════════════════════════════════════════════════════"
        echo "⚠️  Setup completed but validation found issues"
        echo "═══════════════════════════════════════════════════════════"
        echo ""
        echo "Please review the validation output above."
        exit 1
    fi
else
    echo "⚠️  Validation script not found, skipping..."
    echo ""
    echo "✅ SSL Setup Complete!"
    echo "🌐 Test in browser: https://app.socialpolitician.com"
    echo ""
    echo "⚠️  Please run validation manually: bash scripts/validate_ssl.sh"
    exit 0
fi
