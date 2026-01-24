#!/usr/bin/env node

/**
 * Upload senator portraits to PocketBase
 * Reads from portraits/senators/ directory and uploads to politicians collection
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const PORTRAITS_DIR = path.join(projectRoot, 'portraits/senators');
const INDEX_FILE = path.join(PORTRAITS_DIR, 'index.json');

// PocketBase config from environment
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'admin';

const pb = new PocketBase(PB_URL);

async function authenticate() {
  console.log('🔐 Authenticating with PocketBase...');
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }
}

async function findSenatorInPocketBase(senatorName) {
  try {
    // Try to find senator by name
    const names = senatorName.split(' ');
    const lastName = names[names.length - 1];
    
    // Try exact match first
    let records = await pb.collection('politicians').getFullList({
      filter: `name="${senatorName}"`,
      requestKey: null,
    });
    
    if (records.length > 0) {
      return records[0];
    }
    
    // Try last name match with senator filter
    records = await pb.collection('politicians').getFullList({
      filter: `name~"${lastName}" && office_type="senator"`,
      requestKey: null,
    });
    
    return records[0] || null;
  } catch (error) {
    console.error(`Error finding senator ${senatorName}:`, error.message);
    return null;
  }
}

async function uploadPhoto(senatorName, filePath, recordId) {
  try {
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    // Create a File-like object for PocketBase
    const file = new File([fileBuffer], fileName, { type: 'image/jpeg' });

    const record = await pb.collection('politicians').update(recordId, {
      photo: file,
    });

    console.log(`   ✅ Uploaded: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Upload failed: ${error.message}`);
    return false;
  }
}

async function uploadSenatorPhotos() {
  if (!fs.existsSync(INDEX_FILE)) {
    console.error('❌ index.json not found. Run scraper first.');
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  
  console.log('📤 Uploading Senator Photos');
  console.log('============================\n');

  let uploaded = 0;
  let failed = 0;
  let notFound = 0;

  for (const entry of index) {
    const imagePath = path.join(PORTRAITS_DIR, entry.filename);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`⚠️  ${entry.name}: Image file not found`);
      failed++;
      continue;
    }

    console.log(`${entry.name}`);

    // Find senator in PocketBase
    const senator = await findSenatorInPocketBase(entry.name);
    
    if (!senator) {
      console.log(`   ⚠️  Not found in PocketBase`);
      notFound++;
      continue;
    }

    console.log(`   📍 Found: ${senator.name} (${senator.id})`);

    // Upload photo
    const success = await uploadPhoto(entry.name, imagePath, senator.id);
    if (success) {
      uploaded++;
    } else {
      failed++;
    }

    // Small delay between uploads
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(40));
  console.log(`✅ Uploaded: ${uploaded}`);
  console.log(`⚠️  Not found: ${notFound}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${index.length}`);
}

async function main() {
  await authenticate();
  await uploadSenatorPhotos();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
