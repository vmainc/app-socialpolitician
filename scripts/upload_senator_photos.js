#!/usr/bin/env node

/**
 * Upload senator portraits to PocketBase
 * Reads from portraits/senators/ directory and uploads to politicians collection
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const PORTRAITS_DIR = path.join(__dirname, '../portraits/senators');
const INDEX_FILE = path.join(PORTRAITS_DIR, 'index.json');

// PocketBase config from environment
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'admin';

let authToken = null;

async function authenticate() {
  console.log('🔐 Authenticating with PocketBase...');
  try {
    const response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: PB_ADMIN_EMAIL,
        password: PB_ADMIN_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status}`);
    }

    const data = await response.json();
    authToken = data.token;
    console.log('✅ Authenticated\n');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }
}

async function findSenatorInPocketBase(senatorName) {
  try {
    // Try to find senator by name with fuzzy matching
    const names = senatorName.split(' ');
    const lastName = names[names.length - 1];
    
    // Try exact name first
    let filter = `name="${senatorName}"`;
    let response = await fetch(
      `${PB_URL}/api/collections/politicians/records?filter=${encodeURIComponent(filter)}&limit=1`,
      {
        headers: { Authorization: authToken },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.items?.length > 0) {
        return data.items[0];
      }
    }

    // Try last name match
    filter = `name~"${lastName}" && office_type="senator"`;
    response = await fetch(
      `${PB_URL}/api/collections/politicians/records?filter=${encodeURIComponent(filter)}&limit=1`,
      {
        headers: { Authorization: authToken },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.items?.[0] || null;
    }

    return null;
  } catch (error) {
    console.error(`Error finding senator ${senatorName}:`, error.message);
    return null;
  }
}

async function uploadPhoto(senatorName, filePath, recordId) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const formData = new FormData();
    formData.append('photo', fileBuffer, { filename: fileName });

    const response = await fetch(
      `${PB_URL}/api/collections/politicians/records/${recordId}`,
      {
        method: 'PATCH',
        headers: { 
          Authorization: authToken,
          ...formData.getHeaders(),
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText}`);
    }

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

    // Small delay between uploads to avoid hammering the server
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
