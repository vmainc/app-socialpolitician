// ============================================
// IMPORT SCRIPT WITH EMBEDDED DATA (No CORS issues!)
// Copy and paste this ENTIRE script into PocketBase Admin UI browser console
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
  
  // Import function
  async function importPoliticians(data, name) {
    console.log(`📦 Importing ${name}...`);
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
        } else {
          errors++;
          if (errors <= 5) {
            const errorText = await createRes.text();
            console.error(`   Error for ${politician.slug}: ${errorText.substring(0, 100)}`);
          }
        }
        
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
  }
  
  // Load data from server (you'll need to paste the JSON data here)
  console.log('📋 To use this script:');
  console.log('   1. Get the JSON data from the server');
  console.log('   2. Paste it as: const senatorsData = [ /* JSON here */ ];');
  console.log('   3. Then run: await importPoliticians(senatorsData, "Senators");');
  console.log('');
  console.log('   Or use the fetch method with CORS-enabled server');
  console.log('');
  
  // Make function available
  window.importPoliticians = importPoliticians;
  
  console.log('✅ Script loaded! Use: await importPoliticians(yourData, "Name")');
})();
