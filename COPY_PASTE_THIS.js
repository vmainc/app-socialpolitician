// ============================================
// COPY AND PASTE THIS ENTIRE SCRIPT INTO
// POCKETBASE ADMIN UI BROWSER CONSOLE (F12)
// ============================================

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
      console.error('❌ Not logged in. Please log in to PocketBase Admin UI first.');
      return;
    }
  }

  const adminToken = authData.token;
  const collectionId = 'pbc_3830222512';
  const baseUrl = 'http://127.0.0.1:8091';
  
  console.log('🔄 Starting import...');
  console.log(`Collection: ${collectionId}`);
  console.log('');
  
  // Load and import function
  async function loadAndImport(url, name) {
    console.log(`📦 Loading ${name}...`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log(`   Found ${data.length} records`);
      
      let created = 0, updated = 0, errors = 0;
      
      for (let i = 0; i < data.length; i++) {
        const politician = data[i];
        // Add office_type if missing
        if (!politician.office_type) {
          if (politician.current_position?.includes('Senator')) politician.office_type = 'senator';
          else if (politician.current_position?.includes('Governor')) politician.office_type = 'governor';
          else if (politician.current_position?.includes('Representative')) politician.office_type = 'representative';
        }
        
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
            console.log(`   Progress: ${i + 1}/${data.length} (${created} created, ${updated} updated)`);
          }
          await new Promise(r => setTimeout(r, 50));
        } catch (e) {
          errors++;
          if (errors <= 5) console.error(`   Error for ${politician.slug}:`, e.message);
        }
      }
      
      console.log(`   ✅ ${name}: Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
      return { created, updated, errors };
    } catch (e) {
      console.error(`   ❌ Failed to load ${name}:`, e.message);
      return { created: 0, updated: 0, errors: 0 };
    }
  }
  
  // First, create SSH tunnel: ssh -L 8888:127.0.0.1:8888 doug@69.169.103.23
  // Then import all
  console.log('📋 Importing from HTTP server (requires SSH tunnel on port 8888)...');
  console.log('   If you see connection errors, run: ssh -L 8888:127.0.0.1:8888 doug@69.169.103.23');
  console.log('');
  
  const results = await Promise.all([
    loadAndImport('http://127.0.0.1:8888/senators_import_ready.json', 'Senators'),
    loadAndImport('http://127.0.0.1:8888/governors_import_ready.json', 'Governors')
  ]);
  
  const total = results.reduce((acc, r) => ({
    created: acc.created + r.created,
    updated: acc.updated + r.updated,
    errors: acc.errors + r.errors
  }), { created: 0, updated: 0, errors: 0 });
  
  console.log('');
  console.log('📊 Final Summary:');
  console.log(`   ✅ Total Created: ${total.created}`);
  console.log(`   ✅ Total Updated: ${total.updated}`);
  console.log(`   ❌ Total Errors: ${total.errors}`);
  
  // Verify
  try {
    const verifyRes = await fetch(`${baseUrl}/api/collections/${collectionId}/records?page=1&perPage=1`, {
      headers: { 'Authorization': adminToken }
    });
    if (verifyRes.ok) {
      const verifyData = await verifyRes.json();
      console.log(`📈 Total records in collection: ${verifyData.totalItems}`);
    }
  } catch (e) {
    console.log('Could not verify total count');
  }
  
  console.log('');
  console.log('✅ Import complete!');
})();
