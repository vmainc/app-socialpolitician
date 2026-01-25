#!/usr/bin/env node

/**
 * Remove Beto O'Rourke from representatives
 * He is a previous representative and should not be in the current list
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'VMAmadmia42O200!';

const pb = new PocketBase(PB_URL);

async function removeBeto() {
  console.log('🔍 Finding Beto O\'Rourke');
  console.log('==========================\n');
  
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
    
    // Search for Beto O'Rourke - try multiple name variations
    const nameVariations = [
      'Beto O\'Rourke',
      'Beto O\'Rourke',
      'Robert O\'Rourke',
      'Beto O Rourke',
      'Robert O Rourke',
    ];
    
    let found = null;
    
    for (const name of nameVariations) {
      try {
        const results = await pb.collection('politicians').getFullList({
          filter: `name~"${name}" || name="${name}"`,
        });
        
        if (results.length > 0) {
          found = results[0];
          console.log(`📍 Found: ${found.name} (ID: ${found.id})`);
          console.log(`   Office Type: ${found.office_type || '(empty)'}`);
          console.log(`   Current Position: ${found.current_position || '(empty)'}`);
          console.log(`   State: ${found.state || '(empty)'}`);
          break;
        }
      } catch (error) {
        // Continue to next variation
      }
    }
    
    if (!found) {
      // Try broader search
      const allReps = await pb.collection('politicians').getFullList({
        filter: 'office_type="representative"',
      });
      
      found = allReps.find(rep => {
        const name = (rep.name || '').toLowerCase();
        return name.includes('beto') || 
               (name.includes('rourke') && name.includes('o'));
      });
      
      if (found) {
        console.log(`📍 Found: ${found.name} (ID: ${found.id})`);
        console.log(`   Office Type: ${found.office_type || '(empty)'}`);
        console.log(`   Current Position: ${found.current_position || '(empty)'}`);
        console.log(`   State: ${found.state || '(empty)'}`);
      }
    }
    
    if (!found) {
      console.log('❌ Beto O\'Rourke not found in PocketBase\n');
      return;
    }
    
    console.log('\n🗑️  Deleting Beto O\'Rourke...\n');
    
    try {
      await pb.collection('politicians').delete(found.id);
      console.log(`✅ Successfully deleted: ${found.name}\n`);
    } catch (error) {
      console.error(`❌ Failed to delete: ${error.message}\n`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

removeBeto().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
