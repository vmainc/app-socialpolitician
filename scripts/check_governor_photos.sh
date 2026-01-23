#!/bin/bash
# Quick check: How many governors have photos in production PocketBase?

set -e

POCKETBASE_URL="${POCKETBASE_URL:-http://127.0.0.1:8091}"
POCKETBASE_ADMIN_EMAIL="${POCKETBASE_ADMIN_EMAIL:-admin@vma.agency}"
POCKETBASE_ADMIN_PASSWORD="${POCKETBASE_ADMIN_PASSWORD}"

if [ -z "$POCKETBASE_ADMIN_PASSWORD" ]; then
  echo "❌ POCKETBASE_ADMIN_PASSWORD required"
  exit 1
fi

echo "🔍 Checking governor photos in PocketBase..."
echo "   URL: $POCKETBASE_URL"
echo ""

# Use Node.js to check (simpler than curl for auth)
node -e "
import PocketBase from 'pocketbase';
const pb = new PocketBase('$POCKETBASE_URL');
await pb.admins.authWithPassword('$POCKETBASE_ADMIN_EMAIL', '$POCKETBASE_ADMIN_PASSWORD');

const governors = await pb.collection('politicians').getFullList({
  filter: 'office_type=\"governor\"',
  sort: 'name'
});

const withPhotos = governors.filter(g => g.photo);
const withoutPhotos = governors.filter(g => !g.photo);

console.log(\`📊 Governors: \${governors.length} total\`);
console.log(\`✅ With photos: \${withPhotos.length}\`);
console.log(\`❌ Without photos: \${withoutPhotos.length}\`);
console.log('');
if (withoutPhotos.length > 0) {
  console.log('Missing photos:');
  withoutPhotos.slice(0, 10).forEach(g => console.log(\`   - \${g.name}\`));
  if (withoutPhotos.length > 10) {
    console.log(\`   ... and \${withoutPhotos.length - 10} more\`);
  }
}
" 2>&1
