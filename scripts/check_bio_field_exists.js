#!/usr/bin/env node

/**
 * Check if bio field exists in PocketBase schema
 * This helps diagnose why bios aren't being saved
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'VMAmadmia42O200!';

const pb = new PocketBase(PB_URL);

async function checkBioField() {
  console.log('🔍 Checking if Bio Field Exists in PocketBase Schema');
  console.log('===================================================\n');
  
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
    
    // Try to get a politician record and check if bio field is accessible
    const testRecord = await pb.collection('politicians').getFirstListItem('', {});
    
    console.log(`📋 Test Record: ${testRecord.name}`);
    console.log(`   ID: ${testRecord.id}\n`);
    
    // Check if bio field exists by trying to access it
    if ('bio' in testRecord) {
      console.log('✅ Bio field EXISTS in schema');
      console.log(`   Current value: ${testRecord.bio ? `"${testRecord.bio.substring(0, 50)}..."` : '(empty/null)'}`);
      console.log(`   Type: ${typeof testRecord.bio}\n`);
    } else {
      console.log('❌ Bio field DOES NOT EXIST in schema');
      console.log('   The field needs to be added to the PocketBase collection.\n');
    }
    
    // Try to update with bio field to see if it works
    console.log('🧪 Testing bio field update...');
    try {
      await pb.collection('politicians').update(testRecord.id, { 
        bio: 'Test bio - if you see this, the field works!' 
      });
      console.log('✅ Bio field update SUCCEEDED - field exists and is writable\n');
      
      // Clean up test
      await pb.collection('politicians').update(testRecord.id, { bio: testRecord.bio || '' });
      console.log('🧹 Cleaned up test bio\n');
    } catch (updateError: any) {
      console.log('❌ Bio field update FAILED');
      console.log(`   Error: ${updateError.message}\n`);
      
      if (updateError.message.includes('field') || updateError.message.includes('schema')) {
        console.log('⚠️  SOLUTION: The bio field needs to be added to the PocketBase schema.');
        console.log('   You can:');
        console.log('   1. Go to PocketBase Admin UI: http://127.0.0.1:8091/_/');
        console.log('   2. Navigate to Collections > politicians');
        console.log('   3. Click "Add new field"');
        console.log('   4. Name: "bio", Type: "Text", Max length: 5000');
        console.log('   5. Save\n');
      }
    }
    
    // Count how many have bios
    const allPoliticians = await pb.collection('politicians').getFullList({
      requestKey: null,
    });
    
    const withBios = allPoliticians.filter(p => p.bio && p.bio.trim().length > 0);
    
    console.log('📊 Summary:');
    console.log(`   Total politicians: ${allPoliticians.length}`);
    console.log(`   With bios: ${withBios.length}`);
    console.log(`   Without bios: ${allPoliticians.length - withBios.length}\n`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('field') || error.message.includes('schema')) {
      console.error('\n⚠️  The bio field likely does not exist in the PocketBase schema.');
      console.error('   You need to add it manually in the PocketBase Admin UI.\n');
    }
    process.exit(1);
  }
}

checkBioField().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
