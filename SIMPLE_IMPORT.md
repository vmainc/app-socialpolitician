# Simple Import - Copy This Script

## Step 1: Start HTTP Server (on server)

```bash
ssh doug@69.169.103.23
cd /var/www/socialpolitician-app/data
python3 -m http.server 8888
# Keep this running
```

## Step 2: Create SSH Tunnel (on your local machine)

```bash
ssh -L 8888:127.0.0.1:8888 doug@69.169.103.23
# Keep this running
```

## Step 3: In PocketBase Admin UI Browser Console

1. Open: `http://127.0.0.1:8091/_/#/collections?collection=pbc_3830222512`
2. Press F12 → Console tab
3. Paste and run this:

```javascript
(async function() {
  // Get auth token
  const authKeys = Object.keys(localStorage);
  let authData = null;
  for (const key of authKeys) {
    if (key.includes('pocketbase') || key.includes('auth')) {
      try {
        const value = localStorage.getItem(key);
        if (value && value.includes('token')) {
          authData = JSON.parse(value);
          break;
        }
      } catch (e) {}
    }
  }
  
  if (!authData || !authData.token) {
    if (window.pb && window.pb.authStore && window.pb.authStore.token) {
      authData = { token: window.pb.authStore.token };
    } else {
      console.error('❌ Not logged in');
      return;
    }
  }

  const adminToken = authData.token;
  const collectionId = 'pbc_3830222512';
  const baseUrl = 'http://127.0.0.1:8091';
  
  console.log('🔄 Starting import...');
  
  // Load JSON from HTTP server
  async function loadAndImport(url, name) {
    console.log(`📦 Loading ${name}...`);
    const response = await fetch(url);
    const data = await response.json();
    console.log(`   Found ${data.length} records`);
    
    let created = 0, updated = 0, errors = 0;
    
    for (let i = 0; i < data.length; i++) {
      const politician = data[i];
      try {
        const createRes = await fetch(`${baseUrl}/api/collections/${collectionId}/records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': adminToken
          },
          body: JSON.stringify(politician)
        });
        
        if (createRes.ok) {
          created++;
        } else if (createRes.status === 400) {
          // Try update
          const listRes = await fetch(`${baseUrl}/api/collections/${collectionId}/records?filter=slug="${encodeURIComponent(politician.slug)}"`, {
            headers: { 'Authorization': adminToken }
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            if (listData.items && listData.items.length > 0) {
              const updateRes = await fetch(`${baseUrl}/api/collections/${collectionId}/records/${listData.items[0].id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': adminToken
                },
                body: JSON.stringify(politician)
              });
              if (updateRes.ok) updated++;
              else errors++;
            } else errors++;
          } else errors++;
        } else errors++;
        
        if ((i + 1) % 10 === 0) {
          console.log(`   Progress: ${i + 1}/${data.length}`);
        }
        await new Promise(r => setTimeout(r, 50));
      } catch (e) {
        errors++;
      }
    }
    
    console.log(`   ✅ ${name}: Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
    return { created, updated, errors };
  }
  
  // Import all
  const results = await Promise.all([
    loadAndImport('http://127.0.0.1:8888/senators_import_ready.json', 'Senators'),
    loadAndImport('http://127.0.0.1:8888/governors_import_ready.json', 'Governors')
  ]);
  
  const total = results.reduce((acc, r) => ({
    created: acc.created + r.created,
    updated: acc.updated + r.updated,
    errors: acc.errors + r.errors
  }), { created: 0, updated: 0, errors: 0 });
  
  console.log('📊 Summary:', total);
  
  // Verify
  const verifyRes = await fetch(`${baseUrl}/api/collections/${collectionId}/records?page=1&perPage=1`, {
    headers: { 'Authorization': adminToken }
  });
  if (verifyRes.ok) {
    const verifyData = await verifyRes.json();
    console.log(`📈 Total in collection: ${verifyData.totalItems}`);
  }
  
  console.log('✅ Done!');
})();
```

This will automatically import senators and governors!
