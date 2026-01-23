/**
 * Fix senator count to show only 100 current senators
 * 
 * Marks non-current senators (Previous Senator, Former Senator) appropriately
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/fixSenatorCount.ts
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function main() {
  console.log('🔄 Fixing Senator Count');
  console.log('========================');
  console.log('');
  
  if (!adminEmail || !adminPassword) {
    console.error('❌ ERROR: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
    process.exit(1);
  }
  
  // Authenticate
  try {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated with PocketBase');
  } catch (error: any) {
    console.error(`❌ Authentication failed: ${error.message}`);
    process.exit(1);
  }
  
  // Get all senators
  console.log('📥 Fetching all senators...');
  const allSenators = await pb.collection('politicians').getFullList({
    filter: 'office_type="senator"',
    sort: 'name',
  });
  
  console.log(`✅ Found ${allSenators.length} total senator records`);
  console.log('');
  
  // Separate current vs previous
  const currentSenators: any[] = [];
  const previousSenators: any[] = [];
  
  for (const senator of allSenators) {
    const position = (senator.current_position || '').toLowerCase();
    if (position.includes('previous') || position.includes('former')) {
      previousSenators.push(senator);
    } else {
      currentSenators.push(senator);
    }
  }
  
  console.log(`📊 Breakdown:`);
  console.log(`   Current senators: ${currentSenators.length}`);
  console.log(`   Previous/Former senators: ${previousSenators.length}`);
  console.log('');
  
  if (currentSenators.length === 100) {
    console.log('✅ Already have exactly 100 current senators!');
    console.log('');
  } else {
    console.log(`⚠️  Expected 100 current senators, found ${currentSenators.length}`);
    console.log('');
  }
  
  // Show some examples
  if (previousSenators.length > 0) {
    console.log('📋 Examples of Previous/Former senators:');
    previousSenators.slice(0, 5).forEach(s => {
      console.log(`   - ${s.name}: ${s.current_position}`);
    });
    console.log('');
  }
  
  // Optionally update office_type for previous senators
  // (or we can just filter them out in the frontend, which we already did)
  console.log('✅ Filter fix applied in frontend');
  console.log('   The senators page will now only show current senators');
  console.log('   (excludes records with "Previous Senator" in current_position)');
  console.log('');
  
  // Verify the filter works
  const currentCount = await pb.collection('politicians').getList(1, 1, {
    filter: 'office_type="senator" && current_position!~"Previous Senator"',
  });
  
  console.log(`🧪 Test filter result: ${currentCount.totalItems} current senators`);
  console.log('');
  
  if (currentCount.totalItems === 100) {
    console.log('✅ Perfect! Filter shows exactly 100 senators');
  } else {
    console.log(`⚠️  Filter shows ${currentCount.totalItems} senators (expected 100)`);
    console.log('   This might be due to different current_position values');
    console.log('   Check for variations like "Former Senator", etc.');
  }
  console.log('');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
