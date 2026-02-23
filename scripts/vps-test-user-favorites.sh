#!/usr/bin/env bash
# Test user_favorites API on VPS to debug 400.
# Usage: ./scripts/vps-test-user-favorites.sh [AUTH_TOKEN]
# Get AUTH_TOKEN from browser: Application > Local Storage > pb_auth (copy the "token" value).
# Or run without token to see unauthenticated response.

set -e
PB_BASE="${PB_BASE:-https://app.socialpolitician.com/pb}"
TOKEN="${1:-}"

echo "Testing: GET ${PB_BASE}/api/collections/user_favorites/records?page=1&perPage=100&sort=-created"
if [ -n "$TOKEN" ]; then
  echo "With Authorization token (length ${#TOKEN})"
  curl -sS -w "\n\nHTTP_STATUS:%{http_code}" \
    -H "Authorization: $TOKEN" \
    "${PB_BASE}/api/collections/user_favorites/records?page=1&perPage=100&sort=-created"
else
  echo "Without token (expect 401 or 400)"
  curl -sS -w "\n\nHTTP_STATUS:%{http_code}" \
    "${PB_BASE}/api/collections/user_favorites/records?page=1&perPage=100&sort=-created"
fi
echo ""
