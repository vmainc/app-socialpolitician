#!/usr/bin/env node

/**
 * Comprehensive diagnostic and fix script for bios
 * Checks field existence, tests updates, and provides fixes
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'VMAmadmia42O200!';

const pb = new PocketBase(PB_URL);

async function diagnoseAndFix() {
  console.log('🔍 Diagnosing Bio Field Issues');
  console.log('==============================\n');
  
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
    
    // Step 1: Get collection
    let collection;
    let collectionId;
    
    try {
      collection = await pb.collections.getOne('politicians');
      collectionId = (collection as any).id;
    } catch (error: any) {
      collectionId = 'pbc_3830222512';
      collection = await pb.collections.getOne(collectionId);
    }
    
    console.log(`📋 Collection: ${(collection as any).name} (${collectionId})\n`);
    
    // Step 2: Check current schema
    const currentSchema = (collection as any).schema || (collection as any).fields || [];
    console.log(`📊 Current schema has ${currentSchema.length} fields\n`);
    
    // Step 3: Check if bio field exists
    const bioField = currentSchema.find((f: any) => f.name === 'bio');
    
    if (!bioField) {
      console.log('❌ Bio field DOES NOT EXIST in schema\n');
      console.log('🔧 Attempting to add bio field...\n');
      
      const newField = {
        name: 'bio',
        type: 'text',
        required: false,
        unique: false,
        system: false,
        options: {
          min: null,
          max: 5000,
          pattern: ''
        }
      };
      
      try {
        const updatedSchema = [...currentSchema, newField];
        await pb.collections.update(collectionId, {
          schema: updatedSchema
        });
        
        console.log('✅ Bio field added to schema!\n');
        
        // Verify
        const verifyCollection = await pb.collections.getOne(collectionId);
        const verifySchema = (verifyCollection as any).schema || (verifyCollection as any).fields || [];
        const verifyBio = verifySchema.find((f: any) => f.name === 'bio');
        
        if (verifyBio) {
          console.log('✅ Verification: Bio field confirmed in schema\n');
        } else {
          console.log('⚠️  Warning: Bio field not found after adding. May need manual addition.\n');
          console.log('   Go to PocketBase Admin UI and add field manually:\n');
          console.log('   1. http://127.0.0.1:8091/_/');
          console.log('   2. Collections > politicians');
          console.log('   3. Add field: name="bio", type="Text", max=5000\n');
        }
      } catch (addError: any) {
        console.error('❌ Failed to add bio field:', addError.message);
        console.error('\n⚠️  You need to add the field manually in PocketBase Admin UI:\n');
        console.error('   1. Go to: http://127.0.0.1:8091/_/');
        console.error('   2. Navigate to Collections > politicians');
        console.error('   3. Click "Add new field"');
        console.error('   4. Name: "bio", Type: "Text", Max length: 5000');
        console.error('   5. Save\n');
        process.exit(1);
      }
    } else {
      console.log('✅ Bio field EXISTS in schema');
      console.log(`   Type: ${bioField.type}`);
      console.log(`   Options: ${JSON.stringify(bioField.options || {})}\n`);
    }
    
    // Step 4: Test updating a bio
    console.log('🧪 Testing bio update...\n');
    
    const testPolitician = await pb.collection('politicians').getFirstListItem('', {});
    console.log(`   Test politician: ${testPolitician.name} (${testPolitician.id})\n`);
    
    try {
      const testBio = 'This is a test bio to verify the field works.';
      await pb.collection('politicians').update(testPolitician.id, { bio: testBio });
      
      // Verify it was saved
      const updated = await pb.collection('politicians').getOne(testPolitician.id);
      if (updated.bio === testBio) {
        console.log('✅ Bio field update test SUCCEEDED!\n');
        
        // Clean up test
        await pb.collection('politicians').update(testPolitician.id, { bio: testPolitician.bio || '' });
        console.log('🧹 Cleaned up test bio\n');
      } else {
        console.log('⚠️  Bio field update test: Field exists but value not saved correctly\n');
      }
    } catch (testError: any) {
      console.error('❌ Bio field update test FAILED:', testError.message);
      console.error('\n   This means the field exists but cannot be written to.');
      console.error('   Check PocketBase permissions and field settings.\n');
    }
    
    // Step 5: Count current bios
    console.log('📊 Checking current bio status...\n');
    
    const allPoliticians = await pb.collection('politicians').getFullList({
      requestKey: null,
    });
    
    const withBios = allPoliticians.filter(p => p.bio && p.bio.trim().length > 0);
    const withoutBios = allPoliticians.filter(p => !p.bio || p.bio.trim().length === 0);
    
    console.log(`   Total politicians: ${allPoliticians.length}`);
    console.log(`   With bios: ${withBios.length}`);
    console.log(`   Without bios: ${withoutBios.length}\n`);
    
    // Step 6: Recommendations
    console.log('📋 Next Steps:');
    console.log('==============\n');
    
    if (withBios.length === 0) {
      console.log('1. Bio field is ready. Now fetch bios:');
      console.log('   node scripts/fetch_senator_bios.js');
      console.log('   node scripts/fetch_representative_bios.js\n');
    } else {
      console.log(`✅ ${withBios.length} politicians already have bios`);
      console.log(`   ${withoutBios.length} still need bios\n`);
    }
    
    console.log('2. After fetching bios, rebuild frontend:');
    console.log('   npm run build');
    console.log('   sudo systemctl reload nginx\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

diagnoseAndFix().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
