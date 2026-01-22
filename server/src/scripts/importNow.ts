/**
 * Import politicians - tries to work without admin token by using collection rules
 * If collection allows public create, this will work
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Go up from server/src/scripts to project root
const projectRoot = path.resolve(__dirname, '../../..');

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
        // Try without auth first (if collection allows public create)
        const createResponse = await fetch(`${pbUrl}/api/collections/${collectionId}/records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(politician),
        });

        if (createResponse.ok) {
          totalCreated++;
        } else if (createResponse.status === 401 || createResponse.status === 403) {
          console.log('   ⚠️  Collection requires authentication. Need admin token.');
          console.log('   Please use the browser console script instead.');
          return;
        } else if (createResponse.status === 400) {
          // Might be duplicate, try to check
          const errorData = await createResponse.json().catch(() => ({}));
          if (errorData.message?.includes('unique') || errorData.message?.includes('slug')) {
            // Skip duplicates
            totalUpdated++;
          } else {
            totalErrors++;
            if (totalErrors <= 5) {
              console.error(`   Error for ${politician.slug}: ${errorData.message || 'Unknown'}`);
            }
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
    const verifyResponse = await fetch(`${pbUrl}/api/collections/${collectionId}/records?page=1&perPage=1`);
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log(`📈 Total in collection: ${verifyData.totalItems}`);
    }
  } catch (e) {
    // Ignore
  }
}

importPoliticians().catch(console.error);
