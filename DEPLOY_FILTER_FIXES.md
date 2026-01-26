# Deploy Filter Fixes

## Issue
Production build is using old filter syntax with `current_position!~` operators that don't exist in the PocketBase schema, causing 400 errors.

## Solution
Updated all code to use correct schema field names:
- `party` instead of `political_party`
- `office_title` instead of `current_position`
- `official_website_domain` instead of `website_url`
- `chamber` field for office type filtering
- `status` field for filtering Former/Retired

## Deployment Steps

On the VPS, run:

```bash
cd /var/www/socialpolitician-app

# Pull latest changes
git pull origin main

# Install dependencies (if needed)
npm install

# Build the frontend
npm run build

# Verify build (check for localhost references)
npm run verify-build

# Reload nginx to serve new build
sudo systemctl reload nginx
```

## What Was Fixed

1. **Field Name Mismatches**: Updated all references to match actual PocketBase schema
2. **Removed `!~` Operators**: These were causing 400 errors - now filtering in frontend
3. **Simplified Filters**: Using `chamber` and `status` fields from schema
4. **Backward Compatibility**: Added fallbacks for legacy field names

## Expected Results After Deployment

- ✅ Senators page should load (using `chamber="Senator"`)
- ✅ Representatives page should load (using `chamber="Representative"`)
- ✅ Governors page should load (already working)
- ✅ State filtering should work
- ✅ Party filtering should work (using `party` field)
- ✅ Search should work (using `office_title`)

## Verification

After deployment, check browser console - should see:
- No 400 errors
- Filters using correct field names
- Pages loading successfully
