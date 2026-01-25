#!/usr/bin/env node

/**
 * Remove previous/former representatives from PocketBase
 * Deletes representatives with "Previous" or "Former" in their current_position
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=your-password \
 *   node scripts/remove_previous_representatives.js
 */

import PocketBase from 'pocketbase';
import * as readline from 'readline';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'admin';

const pb = new PocketBase(PB_URL);

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function authenticate() {
  console.log('🔐 Authenticating with PocketBase...');
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }
}

function isPreviousRepresentative(politician) {
  const currentPosition = (politician.current_position || '').toLowerCase();
  const name = (politician.name || '').toLowerCase();
  
  // Check if current_position contains "previous" or "former"
  if (currentPosition.includes('previous') || currentPosition.includes('former')) {
    // Make sure it's actually about being a previous representative
    if (currentPosition.includes('representative') || 
        currentPosition.includes('congress') ||
        politician.office_type === 'representative') {
      return true;
    }
  }
  
  return false;
}

async function removePreviousRepresentatives() {
  console.log('🔍 Finding previous/former representatives...\n');
  
  try {
    // Get all representatives
    const allRepresentatives = await pb.collection('politicians').getFullList({
      filter: 'office_type="representative"',
      sort: 'name',
    });
    
    console.log(`📊 Found ${allRepresentatives.length} total representatives\n`);
    
    // Filter previous representatives
    const previousReps = allRepresentatives.filter(isPreviousRepresentative);
    
    console.log(`⚠️  Found ${previousReps.length} previous/former representatives:\n`);
    
    if (previousReps.length === 0) {
      console.log('✅ No previous representatives found. Nothing to remove.\n');
      return;
    }
    
    // Show list
    previousReps.forEach((rep, index) => {
      console.log(`   ${index + 1}. ${rep.name}`);
      console.log(`      Position: "${rep.current_position || '(empty)'}"`);
      console.log(`      State: ${rep.state || '(empty)'}`);
      console.log(`      ID: ${rep.id}`);
      console.log('');
    });
    
    // Ask for confirmation
    const answer = await askQuestion(`❓ Delete these ${previousReps.length} previous representatives? (yes/no): `);
    
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('\n❌ Cancelled. No representatives were deleted.\n');
      return;
    }
    
    console.log('\n🗑️  Deleting previous representatives...\n');
    
    let deleted = 0;
    let failed = 0;
    
    for (const rep of previousReps) {
      try {
        await pb.collection('politicians').delete(rep.id);
        console.log(`   ✅ Deleted: ${rep.name}`);
        deleted++;
      } catch (error) {
        console.error(`   ❌ Failed to delete ${rep.name}: ${error.message}`);
        failed++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Deleted: ${deleted}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${previousReps.length}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function main() {
  await authenticate();
  await removePreviousRepresentatives();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
