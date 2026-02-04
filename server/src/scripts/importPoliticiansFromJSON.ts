/**
 * Import politicians from JSON files to PocketBase
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/importPoliticiansFromJSON.ts
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// From server/src/scripts go up 3 levels to repo root (where data/ lives)
const projectRoot = path.resolve(__dirname, '../../..');

interface PoliticianData {
  name: string;
  slug: string;
  office_type?: 'senator' | 'representative' | 'governor' | 'other';
  state?: string;
  district?: string;
  political_party?: string;
  current_position?: string;
  position_start_date?: string;
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

async function importFromJSON(jsonPath: string, pb: PocketBase): Promise<{ created: number; updated: number; errors: number }> {
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON file not found: ${jsonPath}`);
    return { created: 0, updated: 0, errors: 0 };
  }

  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const politicians: PoliticianData[] = JSON.parse(jsonContent);

  console.log(`📄 Loaded ${politicians.length} politicians from ${path.basename(jsonPath)}`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const politician of politicians) {
    const { sources, ...rest } = politician as Record<string, unknown>;
    const payload = rest as PoliticianData;
    try {
      const existing = await pb.collection('politicians').getFirstListItem(`slug="${payload.slug}"`, {});
      await pb.collection('politicians').update(existing.id, payload);
      updated++;
    } catch (err: any) {
      if (err?.status === 404) {
        try {
          await pb.collection('politicians').create(payload);
          created++;
        } catch (createErr: any) {
          errors++;
          console.error(`❌ Failed to create ${payload.slug}: ${createErr?.message}`);
        }
      } else {
        errors++;
        console.error(`❌ Error with ${payload.slug}: ${err?.message}`);
      }
    }
  }

  return { created, updated, errors };
}

async function main() {
  console.log('🔄 Importing Politicians from JSON');
  console.log('==================================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');

  if (!adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD environment variable required');
    process.exit(1);
  }

  const pb = new PocketBase(pbUrl);

  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin');
    console.log('');

    const dataDir = path.join(projectRoot, 'data');
    const jsonFiles = [
      path.join(dataDir, 'senators_import_ready.json'),
      path.join(dataDir, 'representatives_import_ready.json'),
      path.join(dataDir, 'governors_import_ready.json'),
      path.join(dataDir, 'politicians_import_ready.json'),
    ];

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const jsonFile of jsonFiles) {
      if (fs.existsSync(jsonFile)) {
        console.log(`📦 Importing from ${path.basename(jsonFile)}...`);
        const result = await importFromJSON(jsonFile, pb);
        totalCreated += result.created;
        totalUpdated += result.updated;
        totalErrors += result.errors;
        console.log(`   ✅ Created: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors}`);
        console.log('');
      }
    }

    console.log('📊 Summary:');
    console.log(`   ✅ Total Created: ${totalCreated}`);
    console.log(`   ✅ Total Updated: ${totalUpdated}`);
    console.log(`   ❌ Total Errors: ${totalErrors}`);
    console.log('');

    // Verify
    const count = await pb.collection('politicians').getList(1, 1);
    console.log(`📈 Total politicians in collection: ${count.totalItems}`);

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

main();
