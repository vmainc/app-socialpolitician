/**
 * Update PocketBase politicians collection rules to allow public read access
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 POCKETBASE_ADMIN_EMAIL=admin@vma.agency POCKETBASE_ADMIN_PASSWORD=VMAmadmia42O200! npx tsx server/src/scripts/updatePoliticiansCollectionRules.ts
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error('❌ ERROR: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
  process.exit(1);
}

async function updateRules() {
  const pb = new PocketBase(pbUrl);

  try {
    console.log('🔐 Authenticating as admin...');
    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      console.log('✅ Authenticated');
    } catch (error: any) {
      console.error('❌ Authentication failed:', error.message);
      console.error('   This may mean:');
      console.error('   - Admin credentials are incorrect');
      console.error('   - Admin account does not exist');
      console.error('   - PocketBase admin API is disabled');
      throw error;
    }

    console.log('\n📋 Fetching current collection rules...');
    const collection = await pb.collections.getOne('politicians');
    
    console.log('\nCurrent rules:');
    console.log('  List Rule:  ', collection.listRule || '(empty - no public access)');
    console.log('  View Rule:  ', collection.viewRule || '(empty - no public access)');
    console.log('  Create Rule:', collection.createRule || '(empty)');
    console.log('  Update Rule:', collection.updateRule || '(empty)');
    console.log('  Delete Rule:', collection.deleteRule || '(empty)');

    console.log('\n🔧 Updating rules to allow public read access...');
    const updated = await pb.collections.update('politicians', {
      listRule: '@request.auth.id = "" || @request.auth.id != ""',  // Always true - allow anyone
      viewRule: '@request.auth.id = "" || @request.auth.id != ""',  // Always true - allow anyone
      // Keep write rules restricted to authenticated users
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
    });

    console.log('✅ Rules updated successfully!');
    console.log('\n📋 New rules:');
    console.log('  List Rule:  ', updated.listRule);
    console.log('  View Rule:  ', updated.viewRule);
    console.log('  Create Rule:', updated.createRule);
    console.log('  Update Rule:', updated.updateRule);
    console.log('  Delete Rule:', updated.deleteRule);

    console.log('\n✅ Verification: Testing API response...');
    // Test as unauthenticated user (public access)
    const testPb = new PocketBase(pbUrl);
    const records = await testPb.collection('politicians').getList(1, 5, {
      filter: 'office_type = "representative"',
    });

    if (records.items.length > 0) {
      console.log(`✅ SUCCESS! Public API access works - found ${records.totalItems} total records`);
      console.log(`   Sample record: ${records.items[0].name} (${records.items[0].slug})`);
    } else {
      console.log('⚠️  API returned 0 records - this might be expected if filter matches nothing');
      // Try without filter
      const allRecords = await testPb.collection('politicians').getList(1, 1);
      if (allRecords.items.length > 0) {
        console.log(`✅ SUCCESS! Public API access works - found ${allRecords.totalItems} total records`);
      } else {
        console.log('❌ WARNING: API still returns 0 records - check if collection has data');
      }
    }

    console.log('\n✅ Politicians collection is now publicly readable!');
    console.log('   The app should now be able to fetch politician records.');
  } catch (error: any) {
    console.error('\n❌ Error updating rules:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    process.exit(1);
  }
}

updateRules();
