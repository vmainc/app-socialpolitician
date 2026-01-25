#!/usr/bin/env node

/**
 * Check representative count in PocketBase
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'VMAmadmia42O200!';

const pb = new PocketBase(PB_URL);

async function checkRepresentatives() {
  console.log('🔍 Checking Representative Count');
  console.log('================================\n');
  
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
    
    // Get all representatives
    const allReps = await pb.collection('politicians').getFullList({
      filter: 'office_type="representative"',
      sort: 'name',
    });
    
    console.log(`📊 Total representatives in PocketBase: ${allReps.length}\n`);
    
    // Check for previous/former
    const previousReps = allReps.filter(rep => {
      const pos = (rep.current_position || '').toLowerCase();
      return pos.includes('previous') || pos.includes('former');
    });
    
    const currentReps = allReps.filter(rep => {
      const pos = (rep.current_position || '').toLowerCase();
      return !pos.includes('previous') && !pos.includes('former');
    });
    
    console.log(`   Current representatives: ${currentReps.length}`);
    console.log(`   Previous/Former: ${previousReps.length}\n`);
    
    // Check with photos
    const withPhotos = allReps.filter(rep => rep.photo);
    const withoutPhotos = allReps.filter(rep => !rep.photo);
    
    console.log(`📸 Photo Status:`);
    console.log(`   With photos: ${withPhotos.length}`);
    console.log(`   Without photos: ${withoutPhotos.length}\n`);
    
    // Check scraped count
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = path.resolve(__dirname, '..');
    const indexFile = path.join(projectRoot, 'portraits/representatives/index.json');
    
    if (fs.existsSync(indexFile)) {
      const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      console.log(`📥 Scraped representatives: ${index.length}\n`);
      
      // Find which scraped ones are missing from PocketBase
      const scrapedNames = index.map(item => item.name.toLowerCase().trim());
      const pbNames = allReps.map(rep => rep.name.toLowerCase().trim());
      
      const missing = index.filter(item => {
        const name = item.name.toLowerCase().trim();
        return !pbNames.some(pbName => {
          // Try exact match
          if (pbName === name) return true;
          // Try last name match
          const lastName = name.split(' ').pop();
          const pbLastName = pbName.split(' ').pop();
          return lastName === pbLastName && lastName.length > 2;
        });
      });
      
      if (missing.length > 0) {
        console.log(`⚠️  Missing from PocketBase (${missing.length}):`);
        missing.slice(0, 20).forEach(rep => {
          console.log(`   - ${rep.name}`);
        });
        if (missing.length > 20) {
          console.log(`   ... and ${missing.length - 20} more`);
        }
        console.log('');
      }
    }
    
    // Expected: 435 current representatives
    const expected = 435;
    const difference = expected - currentReps.length;
    
    console.log(`🎯 Expected: ${expected} current representatives`);
    console.log(`📊 Actual: ${currentReps.length} current representatives`);
    if (difference !== 0) {
      console.log(`⚠️  Difference: ${difference > 0 ? `Missing ${difference}` : `Extra ${Math.abs(difference)}`}\n`);
    } else {
      console.log(`✅ Count matches!\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRepresentatives().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
