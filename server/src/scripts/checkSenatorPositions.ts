/**
 * Check current_position values for senators to understand why filter isn't working
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function main() {
  if (!adminEmail || !adminPassword) {
    console.error('❌ ERROR: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
    process.exit(1);
  }
  
  await pb.admins.authWithPassword(adminEmail, adminPassword);
  console.log('✅ Authenticated');
  console.log('');
  
  // Get all senators
  const allSenators = await pb.collection('politicians').getFullList({
    filter: 'office_type="senator"',
    sort: 'name',
  });
  
  console.log(`📊 Found ${allSenators.length} total senators`);
  console.log('');
  
  // Group by current_position
  const byPosition: Record<string, number> = {};
  const previousSenators: any[] = [];
  
  for (const senator of allSenators) {
    const pos = senator.current_position || '(empty)';
    byPosition[pos] = (byPosition[pos] || 0) + 1;
    
    const posLower = pos.toLowerCase();
    if (posLower.includes('previous') || posLower.includes('former')) {
      previousSenators.push(senator);
    }
  }
  
  console.log('📋 Current Position Values:');
  Object.entries(byPosition)
    .sort((a, b) => b[1] - a[1])
    .forEach(([pos, count]) => {
      console.log(`   "${pos}": ${count}`);
    });
  console.log('');
  
  if (previousSenators.length > 0) {
    console.log(`⚠️  Found ${previousSenators.length} Previous/Former senators:`);
    previousSenators.forEach(s => {
      console.log(`   - ${s.name}: "${s.current_position}"`);
    });
    console.log('');
  }
  
  // Test the filter
  console.log('🧪 Testing filters:');
  
  const test1 = await pb.collection('politicians').getList(1, 1, {
    filter: 'office_type="senator" && current_position!~"Previous"',
  });
  console.log(`   Filter: office_type="senator" && current_position!~"Previous"`);
  console.log(`   Result: ${test1.totalItems} senators`);
  
  const test2 = await pb.collection('politicians').getList(1, 1, {
    filter: 'office_type="senator" && current_position!~"Previous" && current_position!~"Former"',
  });
  console.log(`   Filter: office_type="senator" && current_position!~"Previous" && current_position!~"Former"`);
  console.log(`   Result: ${test2.totalItems} senators`);
  
  // Try alternative: check if current_position contains "U.S. Senator" (current ones)
  const test3 = await pb.collection('politicians').getList(1, 1, {
    filter: 'office_type="senator" && current_position~"U.S. Senator"',
  });
  console.log(`   Filter: office_type="senator" && current_position~"U.S. Senator"`);
  console.log(`   Result: ${test3.totalItems} senators`);
  
  console.log('');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
