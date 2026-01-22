/**
 * Clean up slugs to "first-last" format and add district field
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/cleanupSlugsAndAddDistricts.ts
 */

import PocketBase from 'pocketbase';

function normalizeSlug(name: string): string {
  const parts = name.trim().split(' ').filter(p => p.length > 0);
  
  if (parts.length < 2) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  // Extract first and last name
  const first = parts[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const last = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
  
  return `${first}-${last}`;
}

async function main() {
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
  const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
  const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
  
  console.log('📊 Cleanup Slugs and Add Districts Script');
  console.log('==========================================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');
  
  if (!pbAdminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD environment variable required');
    process.exit(1);
  }
  
  const pb = new PocketBase(pbUrl);
  
  try {
    await pb.admins.authWithPassword(pbAdminEmail, pbAdminPassword);
    console.log('✅ Authenticated as admin');
    console.log('');
    
    // Get all politicians
    const allPoliticians = await pb.collection('politicians').getFullList();
    console.log(`📄 Found ${allPoliticians.length} total politicians`);
    console.log('');
    
    let updatedCount = 0;
    let errorCount = 0;
    const errors: Array<{ name: string; error: string }> = [];
    
    // Process representatives first (they have districts)
    const representatives = allPoliticians.filter(p => p.current_position === 'U.S. Representative');
    console.log(`📊 Processing ${representatives.length} representatives...`);
    
    // We need to re-import district data from Wikipedia since it wasn't stored
    // For now, extract district from slug if it follows pattern "name-state-district"
    for (let i = 0; i < representatives.length; i++) {
      const rep = representatives[i];
      
      try {
        const newSlug = normalizeSlug(rep.name);
        const updateData: any = {
          slug: newSlug,
        };
        
        // Try to extract district from current slug
        // Old format might be: "name-state-district" or "name-state-1"
        const slugParts = (rep.slug || '').split('-');
        let district: string | null = null;
        
        // If slug has multiple parts, last part might be district number
        if (slugParts.length >= 3) {
          const lastPart = slugParts[slugParts.length - 1];
          // Check if last part is a number (district)
          if (/^\d+$/.test(lastPart)) {
            district = lastPart;
          } else if (lastPart.toLowerCase() === 'large' || lastPart.toLowerCase() === 'atlarge') {
            district = 'At-large';
          }
        }
        
        // If we couldn't extract from slug, we'll need to fetch from Wikipedia
        // For now, set what we have
        if (district) {
          updateData.district = district;
        }
        
        await pb.collection('politicians').update(rep.id, updateData);
        updatedCount++;
        
        if ((i + 1) % 50 === 0) {
          console.log(`  [${i + 1}/${representatives.length}] Updated: ${rep.name} -> ${newSlug}${district ? ` (District ${district})` : ''}`);
        }
      } catch (err: any) {
        errorCount++;
        const errorMsg = err?.message || 'Unknown error';
        errors.push({ name: rep.name, error: errorMsg });
        if (errors.length <= 10) {
          console.log(`  ❌ Error updating ${rep.name}: ${errorMsg}`);
        }
      }
    }
    
    console.log('');
    
    // Process senators and governors (no districts)
    const others = allPoliticians.filter(
      p => p.current_position === 'U.S. Senator' || p.current_position === 'Governor'
    );
    console.log(`📊 Processing ${others.length} senators and governors...`);
    
    for (let i = 0; i < others.length; i++) {
      const pol = others[i];
      
      try {
        const newSlug = normalizeSlug(pol.name);
        const updateData: any = {
          slug: newSlug,
          district: null, // Clear district for non-representatives
        };
        
        await pb.collection('politicians').update(pol.id, updateData);
        updatedCount++;
        
        if ((i + 1) % 50 === 0) {
          console.log(`  [${i + 1}/${others.length}] Updated: ${pol.name} -> ${newSlug}`);
        }
      } catch (err: any) {
        errorCount++;
        const errorMsg = err?.message || 'Unknown error';
        errors.push({ name: pol.name, error: errorMsg });
        if (errors.length <= 10) {
          console.log(`  ❌ Error updating ${pol.name}: ${errorMsg}`);
        }
      }
    }
    
    console.log('');
    console.log('📊 Summary:');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log('');
      console.log('Errors:');
      errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
    } else if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
    
  } catch (authErr: any) {
    console.error('❌ Failed to authenticate with PocketBase:', authErr?.message);
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ Cleanup complete!');
}

main().catch(console.error);
