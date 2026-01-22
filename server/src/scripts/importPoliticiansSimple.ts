/**
 * Simple import script - tries multiple authentication methods
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const collectionId = 'pbc_3830222512';

interface PoliticianData {
  [key: string]: any;
}

async function importPoliticians() {
  console.log('🔄 Importing Politicians');
  console.log(`PocketBase: ${pbUrl}`);
  console.log(`Collection: ${collectionId}`);
  console.log('');

  const dataDir = path.join(projectRoot, 'data');
  const jsonFiles = [
    { path: path.join(dataDir, 'senators_import_ready.json'), name: 'Senators' },
    { path: path.join(dataDir, 'governors_import_ready.json'), name: 'Governors' },
  ];

  // Try to get auth token from environment or use direct API
  const adminToken = process.env.POCKETBASE_ADMIN_TOKEN || '';
  
  if (!adminToken) {
    console.log('ℹ️  No admin token provided. This script needs to be run with authentication.');
    console.log('   Option 1: Use the browser console script (see SIMPLE_IMPORT.md)');
    console.log('   Option 2: Get token from PocketBase admin UI and set POCKETBASE_ADMIN_TOKEN');
    console.log('');
    console.log('   To get token:');
    console.log('   1. Open PocketBase Admin UI');
    console.log('   2. Open browser console (F12)');
    console.log('   3. Run: Object.keys(localStorage).find(k => k.includes("pocketbase"))');
    console.log('   4. Then: JSON.parse(localStorage.getItem("...")).token');
    return;
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const { path: jsonPath, name } of jsonFiles) {
    if (!fs.existsSync(jsonPath)) {
      console.log(`⚠️  File not found: ${jsonPath}`);
      continue;
    }

    console.log(`📦 Importing ${name}...`);
    const content = fs.readFileSync(jsonPath, 'utf-8');
    const politicians: PoliticianData[] = JSON.parse(content);
    console.log(`   Found ${politicians.length} records`);

    for (let i = 0; i < politicians.length; i++) {
      const politician = politicians[i];
      
      // Add office_type if missing
      if (!politician.office_type) {
        if (politician.current_position?.includes('Senator')) {
          politician.office_type = 'senator';
        } else if (politician.current_position?.includes('Governor')) {
          politician.office_type = 'governor';
        } else if (politician.current_position?.includes('Representative')) {
          politician.office_type = 'representative';
        }
      }

      try {
        const createResponse = await fetch(`${pbUrl}/api/collections/${collectionId}/records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': adminToken,
          },
          body: JSON.stringify(politician),
        });

        if (createResponse.ok) {
          totalCreated++;
        } else if (createResponse.status === 400) {
          // Try to update existing
          const listResponse = await fetch(
            `${pbUrl}/api/collections/${collectionId}/records?filter=slug="${encodeURIComponent(politician.slug)}"`,
            {
              headers: { 'Authorization': adminToken },
            }
          );

          if (listResponse.ok) {
            const listData = await listResponse.json();
            if (listData.items && listData.items.length > 0) {
              const updateResponse = await fetch(
                `${pbUrl}/api/collections/${collectionId}/records/${listData.items[0].id}`,
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken,
                  },
                  body: JSON.stringify(politician),
                }
              );

              if (updateResponse.ok) {
                totalUpdated++;
              } else {
                totalErrors++;
              }
            } else {
              totalErrors++;
            }
          } else {
            totalErrors++;
          }
        } else {
          totalErrors++;
          if (totalErrors <= 5) {
            const errorText = await createResponse.text();
            console.error(`   Error for ${politician.slug}: ${errorText.substring(0, 100)}`);
          }
        }

        if ((i + 1) % 10 === 0) {
          console.log(`   Progress: ${i + 1}/${politicians.length}`);
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e: any) {
        totalErrors++;
        if (totalErrors <= 5) {
          console.error(`   Exception for ${politician.slug}:`, e.message);
        }
      }
    }

    console.log(`   ✅ ${name} complete`);
  }

  console.log('');
  console.log('📊 Summary:');
  console.log(`   ✅ Created: ${totalCreated}`);
  console.log(`   ✅ Updated: ${totalUpdated}`);
  console.log(`   ❌ Errors: ${totalErrors}`);

  // Verify
  try {
    const verifyResponse = await fetch(`${pbUrl}/api/collections/${collectionId}/records?page=1&perPage=1`, {
      headers: { 'Authorization': adminToken },
    });
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log(`📈 Total in collection: ${verifyData.totalItems}`);
    }
  } catch (e) {
    // Ignore
  }
}

importPoliticians().catch(console.error);
