/**
 * Import Politicians - Browser Console Script
 * 
 * Run this in the PocketBase Admin UI browser console
 * URL: http://127.0.0.1:8091/_/#/collections?collection=pbc_3830222512
 * 
 * Steps:
 * 1. Open the PocketBase Admin UI (you're already there)
 * 2. Open browser console (F12 → Console tab)
 * 3. Copy and paste this ENTIRE script
 * 4. Press Enter to run
 */

(async function() {
  console.log('🔄 Starting politician import...');
  
  // Get auth token from localStorage
  const authKeys = Object.keys(localStorage);
  let authData = null;
  
  for (const key of authKeys) {
    if (key.includes('pocketbase') || key.includes('auth') || key.includes('token')) {
      try {
        const value = localStorage.getItem(key);
        if (value && value.includes('token')) {
          authData = JSON.parse(value);
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }
  }
  
  // Alternative: try to get from sessionStorage
  if (!authData) {
    for (const key of Object.keys(sessionStorage)) {
      if (key.includes('pocketbase') || key.includes('auth')) {
        try {
          const value = sessionStorage.getItem(key);
          if (value && value.includes('token')) {
            authData = JSON.parse(value);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }
  }
  
  // If still no token, try to extract from current page
  if (!authData || !authData.token) {
    // Try to get from window or document
    if (window.pb && window.pb.authStore && window.pb.authStore.token) {
      authData = { token: window.pb.authStore.token };
    } else {
      console.error('❌ Could not find auth token. Please ensure you are logged into PocketBase Admin UI.');
      console.log('💡 Try refreshing the page and logging in again.');
      return;
    }
  }

  const adminToken = authData.token;
  const collectionId = 'pbc_3830222512'; // politicians collection
  const baseUrl = window.location.origin.replace(/\/_\/.*$/, '') || 'http://127.0.0.1:8091';
  
  console.log(`✅ Found auth token`);
  console.log(`Collection ID: ${collectionId}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log('');

  // JSON data - you'll need to paste this separately or load from server
  // For now, we'll create a function that accepts JSON data
  async function importPoliticians(jsonData, name) {
    console.log(`📦 Importing ${name}...`);
    console.log(`   Found ${jsonData.length} records`);
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails = [];
    
    for (let i = 0; i < jsonData.length; i++) {
      const politician = jsonData[i];
      
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
            console.log(`   Progress: ${i + 1}/${jsonData.length} (${created} created, ${updated} updated, ${errors} errors)`);
          }
        } else {
          const errorData = await createResponse.json().catch(() => ({}));
          
          // Check if it's a duplicate (unique constraint violation)
          if (createResponse.status === 400 && 
              (errorData.message?.includes('unique') || 
               errorData.message?.includes('already exists') ||
               errorData.message?.includes('slug'))) {
            
            // Try to find and update existing record
            try {
              const listResponse = await fetch(
                `${baseUrl}/api/collections/${collectionId}/records?filter=slug="${encodeURIComponent(politician.slug)}"`,
                {
                  headers: { 'Authorization': adminToken }
                }
              );
              
              if (listResponse.ok) {
                const listData = await listResponse.json();
                if (listData.items && listData.items.length > 0) {
                  const existingId = listData.items[0].id;
                  const updateResponse = await fetch(
                    `${baseUrl}/api/collections/${collectionId}/records/${existingId}`,
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
                    errorDetails.push({ slug: politician.slug, error: 'Update failed' });
                  }
                } else {
                  errors++;
                  errorDetails.push({ slug: politician.slug, error: 'Duplicate but not found' });
                }
              } else {
                errors++;
                errorDetails.push({ slug: politician.slug, error: 'Could not check for existing' });
              }
            } catch (e) {
              errors++;
              errorDetails.push({ slug: politician.slug, error: e.message });
            }
          } else {
            errors++;
            const errorMsg = errorData.message || createResponse.statusText;
            errorDetails.push({ slug: politician.slug, error: errorMsg });
            if (errors <= 5) {
              console.error(`   Error for ${politician.slug}: ${errorMsg}`);
            }
          }
        }
        
        // Small delay to avoid rate limiting
        if (i < jsonData.length - 1) {
          await new Promise(r => setTimeout(r, 50));
        }
        
      } catch (e) {
        errors++;
        errorDetails.push({ slug: politician.slug, error: e.message });
        if (errors <= 5) {
          console.error(`   Exception for ${politician.slug}:`, e.message);
        }
      }
    }
    
    console.log(`   ✅ ${name} complete: Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
    if (errors > 0 && errorDetails.length <= 10) {
      console.log('   Error details:', errorDetails);
    }
    
    return { created, updated, errors };
  }

  // Function to load JSON from a URL
  async function loadJSON(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      return await response.json();
    } catch (e) {
      console.error(`Failed to load ${url}:`, e.message);
      return null;
    }
  }

  // Instructions for user
  console.log('📋 Import Options:');
  console.log('');
  console.log('Option 1: Load from server (if JSON files are served via HTTP)');
  console.log('   Run: importFromURLs()');
  console.log('');
  console.log('Option 2: Paste JSON data directly');
  console.log('   const senatorsData = [ /* paste JSON here */ ];');
  console.log('   await importPoliticians(senatorsData, "Senators");');
  console.log('');
  console.log('Option 3: Copy-paste JSON from file');
  console.log('   Copy the contents of senators_import_ready.json, then:');
  console.log('   const data = [ /* paste here */ ];');
  console.log('   await importPoliticians(data, "Senators");');
  console.log('');

  // Make functions available globally
  window.importPoliticians = importPoliticians;
  window.loadJSON = loadJSON;

  // Helper function to import from URLs (if files are accessible)
  window.importFromURLs = async function() {
    const files = [
      { url: 'http://127.0.0.1:8888/senators_import_ready.json', name: 'Senators' },
      { url: 'http://127.0.0.1:8888/governors_import_ready.json', name: 'Governors' },
      { url: 'http://127.0.0.1:8888/politicians_import_ready.json', name: 'All Politicians' }
    ];
    
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    
    for (const file of files) {
      console.log(`Loading ${file.name}...`);
      const data = await loadJSON(file.url);
      if (data) {
        const result = await importPoliticians(data, file.name);
        totalCreated += result.created;
        totalUpdated += result.updated;
        totalErrors += result.errors;
        console.log('');
      }
    }
    
    console.log('📊 Final Summary:');
    console.log(`   ✅ Total Created: ${totalCreated}`);
    console.log(`   ✅ Total Updated: ${totalUpdated}`);
    console.log(`   ❌ Total Errors: ${totalErrors}`);
    
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
  };

  console.log('✅ Script loaded! Functions available:');
  console.log('   - importPoliticians(jsonData, name)');
  console.log('   - importFromURLs() (if JSON files are served on port 8888)');
  console.log('');
  console.log('💡 Quick start: Paste your JSON data, then run:');
  console.log('   await importPoliticians(yourJsonData, "Senators");');
})();
