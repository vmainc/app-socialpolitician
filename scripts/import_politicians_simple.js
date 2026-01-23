#!/usr/bin/env node
/**
 * Simple import script that uses absolute paths
 */

import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';

if (!adminPassword) {
  console.error('❌ POCKETBASE_ADMIN_PASSWORD required');
  process.exit(1);
}

async function main() {
  console.log('🔄 Importing Politicians');
  console.log('========================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');

  const pb = new PocketBase(pbUrl);

  try {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin');
    console.log('');

    // Use absolute path
    const jsonPath = process.argv[2] || '/var/www/socialpolitician-app/data/politicians_import_ready.json';
    
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ File not found: ${jsonPath}`);
      process.exit(1);
    }

    console.log(`📄 Loading data from: ${jsonPath}`);
    const content = fs.readFileSync(jsonPath, 'utf-8');
    const politicians = JSON.parse(content);
    console.log(`   Found ${politicians.length} politicians`);
    console.log('');

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < politicians.length; i++) {
      const politician = politicians[i];
      try {
        // Check if exists by slug
        const existing = await pb.collection('politicians').getFirstListItem(`slug="${politician.slug}"`, {});
        
        // Update existing
        await pb.collection('politicians').update(existing.id, politician);
        updated++;
        if ((i + 1) % 50 === 0) {
          console.log(`   Processed ${i + 1}/${politicians.length}...`);
        }
      } catch (err) {
        if (err?.status === 404) {
          // Not found, create new
          try {
            await pb.collection('politicians').create(politician);
            created++;
            if ((i + 1) % 50 === 0) {
              console.log(`   Processed ${i + 1}/${politicians.length}...`);
            }
          } catch (createErr) {
            errors++;
            console.error(`❌ Failed to create ${politician.slug}: ${createErr?.message}`);
          }
        } else {
          errors++;
          console.error(`❌ Error with ${politician.slug}: ${err?.message}`);
        }
      }
    }

    console.log('');
    console.log('📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('');

    // Verify
    const count = await pb.collection('politicians').getList(1, 1);
    console.log(`📈 Total politicians in collection: ${count.totalItems}`);

  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

main();
