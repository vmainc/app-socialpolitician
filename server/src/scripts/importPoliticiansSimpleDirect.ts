/**
 * Simple direct import of politicians from JSON files
 * Reads files directly from filesystem and imports via PocketBase API
 * 
 * Usage:
 *   cd /var/www/socialpolitician-app
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=VMAmadmia42O200! \
 *   npx tsx server/src/scripts/importPoliticiansSimpleDirect.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';

interface PoliticianData {
  name: string;
  slug: string;
  state?: string;
  district?: string;
  political_party?: string;
  current_position?: string;
  position_start_date?: string;
  office_type?: 'senator' | 'representative' | 'governor' | 'other';
  photo?: string;
  website_url?: string;
  wikipedia_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  instagram_url?: string;
  x_url?: string;
  linkedin_url?: string;
  tiktok_url?: string;
  truth_social_url?: string;
  [key: string]: any;
}

async function getAdminToken(): Promise<string> {
  const response = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: adminEmail,
      password: adminPassword,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Admin auth failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.token;
}

async function createPolitician(token: string, politician: PoliticianData): Promise<boolean> {
  try {
    const response = await fetch(`${pbUrl}/api/collections/politicians/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify(politician),
    });

    if (response.ok) {
      return true;
    } else if (response.status === 400) {
      // Record might already exist, try to update
      const listResponse = await fetch(
        `${pbUrl}/api/collections/politicians/records?filter=slug="${encodeURIComponent(politician.slug)}"`,
        {
          headers: { 'Authorization': token },
        }
      );

      if (listResponse.ok) {
        const listData = await listResponse.json();
        if (listData.items && listData.items.length > 0) {
          const updateResponse = await fetch(
            `${pbUrl}/api/collections/politicians/records/${listData.items[0].id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
              },
              body: JSON.stringify(politician),
            }
          );
          return updateResponse.ok;
        }
      }
    }
    return false;
  } catch (error) {
    console.error(`Error creating ${politician.slug}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔄 Simple Direct Import of Politicians');
  console.log('=====================================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');

  if (!adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD required');
    console.error('   Set it as an environment variable');
    process.exit(1);
  }

  try {
    console.log('🔐 Authenticating...');
    const token = await getAdminToken();
    console.log('✅ Authenticated');
    console.log('');

    const dataDir = path.join(projectRoot, 'data');
    const jsonFiles = [
      { 
        path: path.join(dataDir, 'politicians_import_ready.json'), 
        name: 'All Politicians' 
      },
    ];

    // If politicians_import_ready.json doesn't exist, try individual files
    if (!fs.existsSync(jsonFiles[0].path)) {
      jsonFiles[0] = { path: path.join(dataDir, 'senators_import_ready.json'), name: 'Senators' };
      jsonFiles.push(
        { path: path.join(dataDir, 'representatives_import_ready.json'), name: 'Representatives' },
        { path: path.join(dataDir, 'governors_import_ready.json'), name: 'Governors' }
      );
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
      console.log('');

      let created = 0;
      let updated = 0;
      let errors = 0;

      for (let i = 0; i < politicians.length; i++) {
        const politician = politicians[i];
        
        // Ensure office_type is set
        if (!politician.office_type) {
          if (politician.current_position?.toLowerCase().includes('senator')) {
            politician.office_type = 'senator';
          } else if (politician.current_position?.toLowerCase().includes('governor')) {
            politician.office_type = 'governor';
          } else if (politician.current_position?.toLowerCase().includes('representative')) {
            politician.office_type = 'representative';
          }
        }

        // Try to create, if fails try update
        const createResult = await createPolitician(token, politician);
        
        if (createResult) {
          created++;
        } else {
          // Try to find and update
          try {
            const listResponse = await fetch(
              `${pbUrl}/api/collections/politicians/records?filter=slug="${encodeURIComponent(politician.slug)}"`,
              { headers: { 'Authorization': token } }
            );
            
            if (listResponse.ok) {
              const listData = await listResponse.json();
              if (listData.items && listData.items.length > 0) {
                const updateResponse = await fetch(
                  `${pbUrl}/api/collections/politicians/records/${listData.items[0].id}`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': token,
                    },
                    body: JSON.stringify(politician),
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
        }

        if ((i + 1) % 50 === 0) {
          console.log(`   Progress: ${i + 1}/${politicians.length} (${created} created, ${updated} updated, ${errors} errors)`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      console.log(`   ✅ ${name}: Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
      console.log('');
      
      totalCreated += created;
      totalUpdated += updated;
      totalErrors += errors;
    }

    console.log('📊 Final Summary:');
    console.log(`   ✅ Total Created: ${totalCreated}`);
    console.log(`   ✅ Total Updated: ${totalUpdated}`);
    console.log(`   ❌ Total Errors: ${totalErrors}`);
    console.log('');

    // Verify
    console.log('🔍 Verifying import...');
    const verifyResponse = await fetch(`${pbUrl}/api/collections/politicians/records?page=1&perPage=1`);
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log(`   Total records in collection: ${verifyData.totalItems}`);
      if (verifyData.totalItems > 0) {
        console.log(`   ✅ SUCCESS! Collection now has ${verifyData.totalItems} records`);
      }
    }

    console.log('');
    console.log('✅ Import complete!');
  } catch (error: any) {
    console.error('❌ Import failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
