#!/usr/bin/env node

/**
 * Upload senator portraits to PocketBase
 * Reads from portraits/senators/ directory and uploads to politicians collection
 * 
 * Features:
 * - Robust name matching with accent normalization
 * - Handles HTML entities (e.g., &aacute;, &eacute;)
 * - Handles special characters (á, é, í, ó, ú, ñ, ç, etc.)
 * - Solves Ben Ray Luján matching issue
 * - Fuzzy matching with exact name first, then normalized last name
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
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'VMAmadmia42O200!';

const pb = new PocketBase(PB_URL);

/**
 * Decode HTML entities to actual characters
 * Handles: &aacute;, &eacute;, &iacute;, &oacute;, &uacute;, &ntilde;, &ccedil;, etc.
 */
function decodeHtmlEntities(text) {
  if (!text) return '';
  const htmlEntityMap = {
    '&aacute;': 'á',
    '&eacute;': 'é',
    '&iacute;': 'í',
    '&oacute;': 'ó',
    '&uacute;': 'ú',
    '&Aacute;': 'Á',
    '&Eacute;': 'É',
    '&Iacute;': 'Í',
    '&Oacute;': 'Ó',
    '&Uacute;': 'Ú',
    '&ntilde;': 'ñ',
    '&Ntilde;': 'Ñ',
    '&ccedil;': 'ç',
    '&Ccedil;': 'Ç',
    '&agrave;': 'à',
    '&egrave;': 'è',
    '&igrave;': 'ì',
    '&ograve;': 'ò',
    '&ugrave;': 'ù',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
  };
  
  let result = text;
  Object.entries(htmlEntityMap).forEach(([entity, char]) => {
    result = result.replace(new RegExp(entity, 'g'), char);
  });
  return result;
}

/**
 * Normalize string by removing accents and special characters
 * Handles: á, é, í, ó, ú, ü, ñ, ç, etc., and HTML entities
 */
function normalizeString(str) {
  if (!str) return '';
  
  // First decode HTML entities
  let decoded = decodeHtmlEntities(str);
  
  // Then remove accents using Unicode normalization
  return decoded
    .normalize('NFD')                    // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '')    // Remove diacritical marks
    .toLowerCase()
    .trim();
}

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
    const names = senatorName.split(' ');
    const lastName = names[names.length - 1];
    const normalizedSenatorName = normalizeString(senatorName);
    const normalizedLastName = normalizeString(lastName);
    
    // Try 1: Exact name match
    let records = await pb.collection('politicians').getFullList({
      filter: `name="${senatorName}"`,
      requestKey: null,
    });
    
    if (records.length > 0) {
      return records[0];
    }
    
    // Try 2: Get all senators and match with normalized names
    // (This handles accents like Luján, HTML entities, etc.)
    records = await pb.collection('politicians').getFullList({
      filter: `office_type="senator"`,
      requestKey: null,
    });
    
    // Find best match by normalized name
    for (const record of records) {
      const normalizedRecordName = normalizeString(record.name);
      const recordLastName = normalizeString(record.name.split(' ').pop());
      
      // Check for exact normalized match
      if (normalizedRecordName === normalizedSenatorName) {
        return record;
      }
      
      // Check for last name match with normalized names
      if (recordLastName === normalizedLastName && normalizedLastName.length > 2) {
        return record;
      }
    }
    
    return null;
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
  const notFoundList = [];

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
      notFoundList.push(entry.name);
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
  
  if (notFoundList.length > 0) {
    console.log('\n❓ Not found senators:');
    notFoundList.forEach(name => console.log(`   - ${name}`));
  }
}

async function main() {
  await authenticate();
  await uploadSenatorPhotos();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
