/**
 * Import presidents data from V1 to V2 PocketBase
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   V1_POCKETBASE_URL=http://127.0.0.1:8090 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/importPresidentsToV2.ts
 */

import PocketBase from 'pocketbase';

const v2PbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const v1PbUrl = process.env.V1_POCKETBASE_URL || 'http://127.0.0.1:8090';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const v2Pb = new PocketBase(v2PbUrl);
const v1Pb = new PocketBase(v1PbUrl);

interface President {
  id: string;
  [key: string]: any;
}

async function main() {
  console.log('🔄 Importing Presidents from V1 to V2');
  console.log('=====================================');
  console.log(`V1 URL: ${v1PbUrl}`);
  console.log(`V2 URL: ${v2PbUrl}`);
  console.log('');

  if (!adminEmail || !adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
    process.exit(1);
  }

  try {
    // Authenticate with V2
    await v2Pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated with V2 PocketBase');

    // Fetch all presidents from V1 (public read)
    console.log('');
    console.log('📤 Fetching presidents from V1...');
    const v1Presidents = await v1Pb.collection('presidents').getFullList<President>({
      sort: 'name',
    });
    console.log(`✅ Found ${v1Presidents.length} presidents in V1`);

    // Check V2 collection
    console.log('');
    console.log('🔍 Checking V2 collection...');
    const v2Existing = await v2Pb.collection('presidents').getFullList<President>({
      sort: 'name',
    });
    console.log(`ℹ️  V2 currently has ${v2Existing.length} presidents`);

    if (v2Existing.length > 0) {
      console.log('');
      console.log('⚠️  WARNING: V2 already has presidents!');
      console.log('   This will update existing records by slug');
    }

    // Import each president
    console.log('');
    console.log('📥 Importing presidents into V2...');
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const president of v1Presidents) {
      try {
        // Remove id and system fields that shouldn't be copied
        const { id, created, updated, ...presidentData } = president;

        // Check if exists by slug
        try {
          const existing = await v2Pb.collection('presidents').getFirstListItem(
            `slug="${presidentData.slug}"`,
            {}
          );
          
          // Update existing
          await v2Pb.collection('presidents').update(existing.id, presidentData);
          updated++;
          process.stdout.write(`✓ Updated: ${presidentData.name}\r`);
        } catch (err: any) {
          if (err?.status === 404) {
            // Create new
            await v2Pb.collection('presidents').create(presidentData);
            created++;
            process.stdout.write(`+ Created: ${presidentData.name}\r`);
          } else {
            throw err;
          }
        }
      } catch (error: any) {
        errors++;
        console.error(`\n❌ Failed to import ${president.name}: ${error?.message}`);
      }
    }

    console.log('');
    console.log('');
    console.log('✅ Import complete!');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);

    // Verify
    console.log('');
    console.log('🔍 Verifying import...');
    const v2Final = await v2Pb.collection('presidents').getFullList<President>({
      sort: 'name',
    });
    console.log(`✅ V2 now has ${v2Final.length} presidents`);

    if (v2Final.length !== v1Presidents.length) {
      console.log('');
      console.log('⚠️  WARNING: Record count mismatch!');
      console.log(`   V1: ${v1Presidents.length}`);
      console.log(`   V2: ${v2Final.length}`);
    }
  } catch (error: any) {
    console.error('');
    console.error('❌ Error:', error?.message || error);
    if (error?.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

main().catch(console.error);
