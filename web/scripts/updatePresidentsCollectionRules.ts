/**
 * Update PocketBase presidents collection rules to allow public read access to profile fields
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8090 POCKETBASE_ADMIN_EMAIL=admin@example.com POCKETBASE_ADMIN_PASSWORD=password npx tsx server/src/scripts/updatePresidentsCollectionRules.ts
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
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
    const collection = await pb.collections.getOne('presidents');
    
    console.log('\nCurrent rules:');
    console.log('  List Rule:  ', collection.listRule || '(empty)');
    console.log('  View Rule:  ', collection.viewRule || '(empty)');
    console.log('  Create Rule:', collection.createRule || '(empty)');
    console.log('  Update Rule:', collection.updateRule || '(empty)');
    console.log('  Delete Rule:', collection.deleteRule || '(empty)');

    console.log('\n🔧 Updating rules to allow public read access...');
    
    const updated = await pb.collections.update('presidents', {
      listRule: 'true',
      viewRule: 'true',
      // Keep write rules restricted to authenticated users
      // In PocketBase, empty string means admin-only, but we'll use auth check
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
    const records = await testPb.collection('presidents').getList(1, 1, {
      filter: 'slug = "george-washington"',
    });

    if (records.items.length > 0) {
      const president = records.items[0];
      const profileFields = [
        'term_start', 'term_end', 'party', 'birth_date', 'birthplace',
        'home_state', 'spouse', 'education', 'professions',
        'vice_presidents', 'major_events', 'sources'
      ];
      
      console.log('\n📊 Profile fields in API response:');
      let allPresent = true;
      for (const field of profileFields) {
        const present = field in president && president[field] !== null && president[field] !== '';
        const status = present ? '✅ PRESENT' : '❌ MISSING';
        console.log(`  ${field}: ${status}`);
        if (!present) allPresent = false;
      }

      if (allPresent) {
        console.log('\n🎉 SUCCESS: All profile fields are now accessible!');
        console.log('\n📝 Next steps:');
        console.log('  1. Test profile page: https://presidents.socialpolitician.com/presidents/george-washington');
        console.log('  2. Verify all sections render correctly');
      } else {
        console.log('\n⚠️  WARNING: Some fields still missing.');
        console.log('   This may be due to:');
        console.log('   - Field-level permissions in PocketBase');
        console.log('   - Fields not populated in database');
        console.log('   - Check PocketBase admin UI for field visibility settings');
      }
    } else {
      console.log('❌ ERROR: Could not fetch president record');
    }

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

updateRules();
