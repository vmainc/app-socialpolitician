#!/usr/bin/env node
/**
 * Update office_type field based on current_position
 */

import PocketBase from 'pocketbase';
import fs from 'fs';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';

if (!adminPassword) {
  console.error('❌ POCKETBASE_ADMIN_PASSWORD required');
  process.exit(1);
}

function getOfficeType(currentPosition) {
  if (!currentPosition) return '';
  
  const pos = currentPosition.toLowerCase().trim();
  if (pos.includes('senator')) return 'senator';
  if (pos.includes('representative') || pos.includes('congress')) return 'representative';
  if (pos.includes('governor')) return 'governor';
  return '';
}

async function main() {
  console.log('🔄 Updating office_type field');
  console.log('=============================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');

  const pb = new PocketBase(pbUrl);

  try {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin');
    console.log('');

    // Get all politicians
    let page = 1;
    let totalUpdated = 0;
    let totalSkipped = 0;

    while (true) {
      const result = await pb.collection('politicians').getList(page, 500);
      
      if (result.items.length === 0) break;

      console.log(`📄 Processing page ${page} (${result.items.length} records)...`);

      for (const politician of result.items) {
        const currentPosition = politician.current_position || '';
        const officeType = getOfficeType(currentPosition);
        
        if (!officeType) {
          totalSkipped++;
          continue;
        }

        if (politician.office_type === officeType) {
          // Already correct
          continue;
        }

        try {
          await pb.collection('politicians').update(politician.id, {
            office_type: officeType
          });
          totalUpdated++;
        } catch (err) {
          console.error(`❌ Failed to update ${politician.slug}: ${err.message}`);
        }
      }

      if (result.items.length < 500) break;
      page++;
    }

    console.log('');
    console.log('📊 Summary:');
    console.log(`   ✅ Updated: ${totalUpdated}`);
    console.log(`   ⏭️  Skipped: ${totalSkipped} (no office_type match)`);
    console.log('');

    // Verify
    const senatorCount = await pb.collection('politicians').getList(1, 1, {
      filter: 'office_type="senator"'
    });
    const repCount = await pb.collection('politicians').getList(1, 1, {
      filter: 'office_type="representative"'
    });
    const govCount = await pb.collection('politicians').getList(1, 1, {
      filter: 'office_type="governor"'
    });

    console.log('📈 Verification:');
    console.log(`   Senators: ${senatorCount.totalItems}`);
    console.log(`   Representatives: ${repCount.totalItems}`);
    console.log(`   Governors: ${govCount.totalItems}`);

  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

main();
