#!/usr/bin/env node
/**
 * Verify if governor photos exist in production PocketBase
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!adminPassword) {
  console.error('❌ POCKETBASE_ADMIN_PASSWORD required');
  process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function main() {
  try {
    console.log('🔐 Authenticating...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated\n');

    console.log('📊 Checking governors...');
    const governors = await pb.collection('politicians').getFullList({
      filter: 'office_type="governor"',
      sort: 'name',
    });

    console.log(`\n📈 Total governors: ${governors.length}\n`);

    const withPhotos = governors.filter(g => g.photo);
    const withoutPhotos = governors.filter(g => !g.photo);

    console.log(`✅ With photos: ${withPhotos.length}`);
    console.log(`❌ Without photos: ${withoutPhotos.length}\n`);

    if (withPhotos.length > 0) {
      console.log('✅ Governors WITH photos (first 5):');
      withPhotos.slice(0, 5).forEach(g => {
        const photoUrl = pb.files.getURL(g, g.photo);
        console.log(`   - ${g.name}: ${photoUrl}`);
      });
      console.log('');
    }

    if (withoutPhotos.length > 0) {
      console.log('❌ Governors WITHOUT photos (first 10):');
      withoutPhotos.slice(0, 10).forEach(g => {
        console.log(`   - ${g.name} (${g.slug})`);
      });
      if (withoutPhotos.length > 10) {
        console.log(`   ... and ${withoutPhotos.length - 10} more`);
      }
    }

    // Test a photo URL if we have one
    if (withPhotos.length > 0) {
      const testGov = withPhotos[0];
      const testUrl = pb.files.getURL(testGov, testGov.photo);
      console.log(`\n🧪 Testing photo URL: ${testUrl}`);
      try {
        const response = await fetch(testUrl);
        console.log(`   Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
          console.log('   ✅ Photo URL is accessible!');
        } else {
          console.log('   ⚠️  Photo URL returned error');
        }
      } catch (error) {
        console.log(`   ❌ Error fetching photo: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

main();

