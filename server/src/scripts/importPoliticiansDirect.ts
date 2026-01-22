/**
 * Direct import using PocketBase admin API via HTTP requests
 * Bypasses SDK authentication issues
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
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Auth failed: ${error.message || response.statusText}`);
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
      // Might be duplicate, try update
      const error = await response.json().catch(() => ({}));
      if (error.message?.includes('unique') || error.message?.includes('already exists')) {
        // Try to update by slug
        try {
          const listResponse = await fetch(
            `${pbUrl}/api/collections/politicians/records?filter=slug="${politician.slug}"`,
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
        } catch (e) {
          // Ignore update errors
        }
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function main() {
  console.log('🔄 Direct Import of Politicians');
  console.log('===============================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');

  if (!adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD required');
    process.exit(1);
  }

  try {
    console.log('🔐 Authenticating...');
    const token = await getAdminToken();
    console.log('✅ Authenticated');
    console.log('');

    const dataDir = path.join(projectRoot, 'data');
    const jsonFiles = [
      { path: path.join(dataDir, 'senators_import_ready.json'), name: 'Senators' },
      { path: path.join(dataDir, 'representatives_import_ready.json'), name: 'Representatives' },
      { path: path.join(dataDir, 'governors_import_ready.json'), name: 'Governors' },
      { path: path.join(dataDir, 'politicians_import_ready.json'), name: 'All Politicians' },
    ];

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const { path: jsonPath, name } of jsonFiles) {
      if (!fs.existsSync(jsonPath)) continue;

      console.log(`📦 Importing ${name}...`);
      const content = fs.readFileSync(jsonPath, 'utf-8');
      const politicians: PoliticianData[] = JSON.parse(content);

      for (const politician of politicians) {
        const success = await createPolitician(token, politician);
        if (success) {
          totalCreated++;
        } else {
          totalErrors++;
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      console.log(`   ✅ Processed ${politicians.length} ${name}`);
    }

    console.log('');
    console.log('📊 Summary:');
    console.log(`   ✅ Created/Updated: ${totalCreated}`);
    console.log(`   ❌ Errors: ${totalErrors}`);

    // Verify
    const verifyResponse = await fetch(`${pbUrl}/api/collections/politicians/records?page=1&perPage=1`, {
      headers: { 'Authorization': token },
    });
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log(`📈 Total in collection: ${verifyData.totalItems}`);
    }

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}

main();
