#!/bin/bash
# Add presidents collection fields via curl

TOKEN=$(curl -s -X POST http://127.0.0.1:8091/api/admins/auth-with-password \
  -H 'Content-Type: application/json' \
  -d '{"identity":"admin@vma.agency","password":"VMAmadmia42O200!"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed"
  exit 1
fi

COLLECTION_ID=$(curl -s "http://127.0.0.1:8091/api/collections?filter=name=\"presidents\"" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; d=json.load(sys.stdin); items=d.get('items', []); print(items[0]['id'] if items else '')" 2>/dev/null)

if [ -z "$COLLECTION_ID" ]; then
  echo "❌ Collection not found"
  exit 1
fi

echo "✅ Authenticated"
echo "Collection ID: $COLLECTION_ID"
echo ""

# Build schema array with all fields
SCHEMA='[
  {"name":"name","type":"text","required":true,"unique":false,"options":{"min":null,"max":null,"pattern":""}},
  {"name":"slug","type":"text","required":true,"unique":false,"options":{"min":null,"max":null,"pattern":""}},
  {"name":"wikipedia_title","type":"text","required":true,"unique":false,"options":{"min":null,"max":null,"pattern":""}},
  {"name":"wikipedia_url","type":"url","required":true,"unique":false,"options":{"exceptDomains":null,"onlyDomains":null}},
  {"name":"summary","type":"text","required":true,"unique":false,"options":{"min":null,"max":null,"pattern":""}},
  {"name":"knowledge_base","type":"text","required":true,"unique":false,"options":{"min":null,"max":null,"pattern":""}},
  {"name":"system_prompt","type":"text","required":true,"unique":false,"options":{"min":null,"max":null,"pattern":""}},
  {"name":"portrait","type":"file","required":false,"unique":false,"options":{"maxSelect":1,"maxSize":0,"mimeTypes":[],"thumbs":[],"protected":false}},
  {"name":"portrait_source_url","type":"url","required":false,"unique":false,"options":{"exceptDomains":null,"onlyDomains":null}}
]'

echo "📝 Adding all fields at once..."
RESPONSE=$(curl -s -X PATCH "http://127.0.0.1:8091/api/collections/$COLLECTION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"schema\":$SCHEMA}")

echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('Schema fields:', len(d.get('schema', []))); fields=d.get('schema', []); [print(f'  {i+1}. {f.get(\"name\")} ({f.get(\"type\")})') for i, f in enumerate(fields)]" 2>/dev/null

echo ""
echo "✅ Done!"
