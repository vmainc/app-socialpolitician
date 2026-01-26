/**
 * Find and fix politicians with incorrect state assignments
 * Checks for common data issues like media entries, wrong states, etc.
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const POCKETBASE_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const POCKETBASE_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!POCKETBASE_ADMIN_PASSWORD) {
  console.error('❌ POCKETBASE_ADMIN_PASSWORD environment variable is required');
  process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);

// Valid US state codes
const VALID_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC' // District of Columbia
]);

/**
 * Check if a politician has an incorrect state assignment
 */
function hasIncorrectState(politician) {
  const state = politician.state;
  
  // No state is OK for some office types
  if (!state || state.trim() === '') {
    return false;
  }
  
  // Check if state code is valid
  if (!VALID_STATES.has(state.toUpperCase())) {
    return true;
  }
  
  // Governors should have a state
  if (politician.office_type === 'governor' && !state) {
    return true;
  }
  
  // Senators and Representatives should have a state
  if ((politician.office_type === 'senator' || politician.office_type === 'representative') && !state) {
    return true;
  }
  
  return false;
}

async function main() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');

    console.log('🔍 Searching for politicians with incorrect state assignments...\n');
    
    // Get all politicians
    let allPoliticians = [];
    let page = 1;
    const perPage = 500;
    let hasMore = true;
    
    while (hasMore) {
      const result = await pb.collection('politicians').getList(page, perPage, {
        sort: 'name',
      });
      
      allPoliticians = allPoliticians.concat(result.items);
      
      if (result.items.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    console.log(`📊 Total politicians: ${allPoliticians.length}\n`);
    
    // Find politicians with incorrect states
    const incorrectStates = allPoliticians.filter(hasIncorrectState);
    
    // Group by state to see the problem
    const byState = {};
    allPoliticians.forEach(p => {
      const state = p.state || '(empty)';
      if (!byState[state]) {
        byState[state] = [];
      }
      byState[state].push(p);
    });
    
    console.log('📊 Politicians by state:');
    Object.keys(byState).sort().forEach(state => {
      const count = byState[state].length;
      const invalid = byState[state].filter(hasIncorrectState).length;
      const marker = invalid > 0 ? ' ⚠️' : '';
      console.log(`   ${state}: ${count} politicians${marker}`);
      if (invalid > 0) {
        byState[state].filter(hasIncorrectState).forEach(p => {
          console.log(`      - ${p.name} (${p.office_type || 'unknown'}) - ${p.current_position || 'no position'}`);
        });
      }
    });
    console.log('');
    
    if (incorrectStates.length === 0) {
      console.log('✅ No politicians with incorrect state assignments found.');
      return;
    }
    
    console.log(`⚠️  Found ${incorrectStates.length} politicians with incorrect state assignments:\n`);
    incorrectStates.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.name} (${entry.slug})`);
      console.log(`   Office Type: ${entry.office_type || '(empty)'}`);
      console.log(`   Current State: "${entry.state || '(empty)'}"`);
      console.log(`   Current Position: ${entry.current_position || '(empty)'}`);
      console.log('');
    });
    
    // Check specific states mentioned by user
    console.log('\n🔍 Checking Delaware (DE):');
    const delawarePoliticians = allPoliticians.filter(p => p.state === 'DE');
    console.log(`   Found ${delawarePoliticians.length} politicians with state="DE":`);
    delawarePoliticians.forEach(p => {
      console.log(`   - ${p.name} (${p.office_type || 'unknown'}) - ${p.current_position || 'no position'}`);
    });
    console.log('');
    
    console.log('\n💡 Note: This script only identifies issues. To fix them, you may need to:');
    console.log('   1. Check the politician\'s actual state based on their office');
    console.log('   2. Update the state field manually or via another script');
    console.log('   3. Remove media entries or other invalid records');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    process.exit(1);
  }
}

main();
