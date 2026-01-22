/**
 * Import Politicians via Browser Console
 * 
 * Run this in the PocketBase Admin UI browser console
 * (You must be logged in to the admin UI first)
 * 
 * Steps:
 * 1. Open PocketBase Admin: http://127.0.0.1:8091/_/#/collections?collection=pbc_3830222512
 * 2. Open browser console (F12)
 * 3. Paste and run this script
 */

(async function() {
  // Get auth token from localStorage (you're already logged in)
  const authKey = Object.keys(localStorage).find(k => k.includes('pocketbase') || k.includes('auth'));
  const authData = authKey ? JSON.parse(localStorage.getItem(authKey)) : null;
  
  if (!authData || !authData.token) {
    console.error('❌ Not logged in. Please log in to PocketBase Admin UI first.');
    return;
  }

  const adminToken = authData.token;
  const collectionId = 'pbc_3830222512'; // politicians collection
  const baseUrl = 'http://127.0.0.1:8091';
  
  console.log('🔄 Starting import...');
  console.log(`Collection: ${collectionId}`);
  console.log('');

  // Import function
  async function importFromJSON(jsonUrl, name) {
    console.log(`📦 Importing ${name}...`);
    
    try {
      // Fetch JSON file
      const response = await fetch(jsonUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${jsonUrl}: ${response.statusText}`);
      }
      
      const politicians = await response.json();
      console.log(`   Found ${politicians.length} records`);
      
      let created = 0;
      let updated = 0;
      let errors = 0;
      
      for (let i = 0; i < politicians.length; i++) {
        const politician = politicians[i];
        
        try {
          // Try to create
          const createResponse = await fetch(`${baseUrl}/api/collections/${collectionId}/records`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': adminToken
            },
            body: JSON.stringify(politician)
          });
          
          if (createResponse.ok) {
            created++;
            if ((i + 1) % 10 === 0) {
              console.log(`   Progress: ${i + 1}/${politicians.length}...`);
            }
          } else if (createResponse.status === 400) {
            // Might be duplicate, try to update by slug
            const errorData = await createResponse.json().catch(() => ({}));
            if (errorData.message?.includes('unique') || errorData.message?.includes('already exists')) {
              try {
                // Find existing by slug
                const listResponse = await fetch(
                  `${baseUrl}/api/collections/${collectionId}/records?filter=slug="${politician.slug}"`,
                  {
                    headers: { 'Authorization': adminToken }
                  }
                );
                
                if (listResponse.ok) {
                  const listData = await listResponse.json();
                  if (listData.items && listData.items.length > 0) {
                    const updateResponse = await fetch(
                      `${baseUrl}/api/collections/${collectionId}/records/${listData.items[0].id}`,
                      {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': adminToken
                        },
                        body: JSON.stringify(politician)
                      }
                    );
                    
                    if (updateResponse.ok) {
                      updated++;
                    } else {
                      errors++;
                    }
                  } else {
                    errors++;
                  }
                } else {
                  errors++;
                }
              } catch (e) {
                errors++;
              }
            } else {
              errors++;
              console.error(`   Error for ${politician.slug}:`, errorData.message);
            }
          } else {
            errors++;
            const errorText = await createResponse.text();
            console.error(`   Error for ${politician.slug}:`, errorText.substring(0, 100));
          }
          
          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 50));
          
        } catch (e) {
          errors++;
          console.error(`   Exception for ${politician.slug}:`, e.message);
        }
      }
      
      console.log(`   ✅ ${name}: Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
      return { created, updated, errors };
      
    } catch (error) {
      console.error(`   ❌ Failed to import ${name}:`, error.message);
      return { created: 0, updated: 0, errors: 0 };
    }
  }

  // Import all files
  const files = [
    { url: '/data/senators_import_ready.json', name: 'Senators' },
    { url: '/data/governors_import_ready.json', name: 'Governors' },
    { url: '/data/politicians_import_ready.json', name: 'All Politicians' }
  ];
  
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  
  for (const file of files) {
    const result = await importFromJSON(file.url, file.name);
    totalCreated += result.created;
    totalUpdated += result.updated;
    totalErrors += result.errors;
    console.log('');
  }
  
  console.log('📊 Summary:');
  console.log(`   ✅ Total Created: ${totalCreated}`);
  console.log(`   ✅ Total Updated: ${totalUpdated}`);
  console.log(`   ❌ Total Errors: ${totalErrors}`);
  console.log('');
  
  // Verify
  try {
    const verifyResponse = await fetch(`${baseUrl}/api/collections/${collectionId}/records?page=1&perPage=1`, {
      headers: { 'Authorization': adminToken }
    });
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log(`📈 Total records in collection: ${verifyData.totalItems}`);
    }
  } catch (e) {
    console.log('Could not verify total count');
  }
  
  console.log('');
  console.log('✅ Import complete!');
})();
