#!/usr/bin/env node

/**
 * Check if a specific politician has a bio in PocketBase
 * Useful for debugging why bios aren't showing on profile pages
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'VMAmadmia42O200!';

const pb = new PocketBase(PB_URL);

async function checkBios() {
  console.log('🔍 Checking Bios in PocketBase');
  console.log('==============================\n');
  
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
    
    // Check a few specific politicians
    const testNames = [
      'Amy Klobuchar',
      'Barry Moore',
      'Shomari Figures',
      'Mike Rogers',
    ];
    
    for (const name of testNames) {
      try {
        const politician = await pb.collection('politicians').getFirstListItem(
          `name="${name}"`
        );
        
        console.log(`\n📋 ${politician.name}`);
        console.log(`   ID: ${politician.id}`);
        console.log(`   Slug: ${politician.slug}`);
        console.log(`   Office: ${politician.office_type}`);
        console.log(`   Bio exists: ${politician.bio ? 'YES' : 'NO'}`);
        if (politician.bio) {
          const bioLength = politician.bio.trim().length;
          console.log(`   Bio length: ${bioLength} characters`);
          console.log(`   Bio preview: ${politician.bio.substring(0, 100)}...`);
        } else {
          console.log(`   ⚠️  No bio field or bio is empty`);
        }
      } catch (error) {
        console.log(`\n❌ ${name}: Not found`);
      }
    }
    
    // Count total with bios
    console.log('\n' + '='.repeat(50));
    const allReps = await pb.collection('politicians').getFullList({
      filter: 'office_type="representative"',
    });
    
    const withBios = allReps.filter(rep => rep.bio && rep.bio.trim().length > 0);
    const withoutBios = allReps.filter(rep => !rep.bio || rep.bio.trim().length === 0);
    
    console.log(`\n📊 Representatives:`);
    console.log(`   Total: ${allReps.length}`);
    console.log(`   With bios: ${withBios.length}`);
    console.log(`   Without bios: ${withoutBios.length}`);
    
    // Check senators too
    const allSenators = await pb.collection('politicians').getFullList({
      filter: 'office_type="senator"',
    });
    
    const senatorsWithBios = allSenators.filter(s => s.bio && s.bio.trim().length > 0);
    
    console.log(`\n📊 Senators:`);
    console.log(`   Total: ${allSenators.length}`);
    console.log(`   With bios: ${senatorsWithBios.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBios().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
