#!/usr/bin/env node

/**
 * Verify bios are in PocketBase
 * Quick check to see how many representatives have bios
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'VMAmadmia42O200!';

const pb = new PocketBase(PB_URL);

async function verifyBios() {
  console.log('🔍 Verifying Bios in PocketBase');
  console.log('================================\n');
  
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
    
    // Get all representatives
    const representatives = await pb.collection('politicians').getFullList({
      filter: 'office_type="representative"',
    });
    
    console.log(`📊 Total Representatives: ${representatives.length}\n`);
    
    // Count with bios
    const withBios = representatives.filter(rep => 
      rep.bio && rep.bio.trim().length > 0
    );
    
    const withoutBios = representatives.filter(rep => 
      !rep.bio || rep.bio.trim().length === 0
    );
    
    console.log(`✅ With Bios: ${withBios.length}`);
    console.log(`❌ Without Bios: ${withoutBios.length}\n`);
    
    if (withBios.length > 0) {
      console.log('📝 Sample bios (first 3):\n');
      withBios.slice(0, 3).forEach((rep, i) => {
        const bioPreview = rep.bio.substring(0, 100) + '...';
        console.log(`${i + 1}. ${rep.name}`);
        console.log(`   ${bioPreview}\n`);
      });
    }
    
    if (withoutBios.length > 0 && withoutBios.length <= 20) {
      console.log('⚠️  Representatives without bios:');
      withoutBios.forEach(rep => {
        console.log(`   - ${rep.name}`);
      });
    }
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyBios().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
