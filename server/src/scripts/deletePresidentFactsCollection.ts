/**
 * Delete president_facts collection from PocketBase
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8090 POCKETBASE_ADMIN_EMAIL=admin@example.com POCKETBASE_ADMIN_PASSWORD=password npx tsx server/src/scripts/deletePresidentFactsCollection.ts
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error('❌ ERROR: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
  process.exit(1);
}

async function deleteCollection() {
  const pb = new PocketBase(pbUrl);

  try {
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated');

    console.log('\n📋 Finding president_facts collection...');
    
    // Get all collections to find the one we want
    const collections = await pb.collections.getFullList();
    const presidentFacts = collections.find(c => c.name === 'president_facts');

    if (!presidentFacts) {
      console.log('✅ Collection "president_facts" not found - may already be deleted');
      return;
    }

    console.log(`Found collection: ${presidentFacts.name} (ID: ${presidentFacts.id})`);
    console.log(`   Records: ${presidentFacts.listRule || 'unknown'}`);
    
    // Get record count before deletion
    try {
      const records = await pb.collection('president_facts').getList(1, 1);
      console.log(`   Total records: ${records.totalItems}`);
    } catch (e) {
      console.log('   Could not get record count');
    }

    console.log('\n🗑️  Deleting collection...');
    await pb.collections.delete(presidentFacts.id);
    
    console.log('✅ Collection "president_facts" deleted successfully!');

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    if (error.status) {
      console.error('   Status:', error.status);
    }
    process.exit(1);
  }
}

deleteCollection();
