#!/usr/bin/env node
/**
 * Upload portraits to PocketBase
 * 
 * Reads portraits from portraits/to-label/ or portraits/labeled/
 * and uploads them to the photo field in PocketBase
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   node scripts/upload_portraits.js [--use-labeled] [--dry-run]
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

// Directories
const PORTRAITS_DIR = path.join(projectRoot, 'portraits');
const TO_LABEL_DIR = path.join(PORTRAITS_DIR, 'to-label');
const LABELED_DIR = path.join(PORTRAITS_DIR, 'labeled');
const UPLOADED_DIR = path.join(PORTRAITS_DIR, 'uploaded');
const INDEX_FILE = path.join(PORTRAITS_DIR, 'index.json');

// Parse args
const args = process.argv.slice(2);
const useLabeled = args.includes('--use-labeled');
const dryRun = args.includes('--dry-run');

/**
 * Load index
 */
function loadIndex() {
  if (fs.existsSync(INDEX_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    } catch (error) {
      // Ignore
    }
  }
  return {};
}

/**
 * Save index
 */
function saveIndex(index) {
  const dir = path.dirname(INDEX_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

/**
 * Extract record ID from filename
 */
function extractRecordId(filename) {
  // Format: slug_recordId.ext
  const match = filename.match(/_([a-z0-9]{15})\./);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Upload portrait to PocketBase
 * Uses PocketBase SDK's file upload support with FormData
 */
async function uploadPortrait(recordId, filepath) {
  try {
    const fileBuffer = fs.readFileSync(filepath);
    const filename = path.basename(filepath);
    const mimeType = getMimeType(filepath);
    
    // Create FormData with Blob (Node.js 18+ supports this)
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    
    // FormData.append accepts Blob with filename as third parameter
    formData.append('photo', blob, filename);
    
    await pb.collection('politicians').update(recordId, formData);
    return true;
  } catch (error) {
    console.error(`   ❌ Upload error: ${error.message}`);
    if (error.response) {
      console.error(`   Response: ${JSON.stringify(error.response, null, 2)}`);
    }
    return false;
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

/**
 * Main function
 */
async function main() {
  console.log('📤 Uploading Portraits to PocketBase');
  console.log('===================================');
  console.log('');
  
  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No files will be uploaded');
    console.log('');
  }
  
  if (!adminEmail || !adminPassword) {
    console.error('❌ ERROR: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
    process.exit(1);
  }
  
  // Authenticate
  try {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated with PocketBase');
  } catch (error) {
    console.error(`❌ Authentication failed: ${error.message}`);
    process.exit(1);
  }
  
  // Create uploaded directory
  if (!fs.existsSync(UPLOADED_DIR)) {
    fs.mkdirSync(UPLOADED_DIR, { recursive: true });
  }
  
  // Load index
  const index = loadIndex();
  
  // Get source directory
  const sourceDir = useLabeled ? LABELED_DIR : TO_LABEL_DIR;
  
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory not found: ${sourceDir}`);
    process.exit(1);
  }
  
  // Get all image files
  const files = fs.readdirSync(sourceDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  });
  
  console.log(`📋 Found ${files.length} portrait files in ${sourceDir}`);
  console.log('');
  
  if (files.length === 0) {
    console.log('⚠️  No files to upload');
    return;
  }
  
  let uploaded = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filepath = path.join(sourceDir, filename);
    
    console.log(`[${i + 1}/${files.length}] ${filename}`);
    
    // Extract record ID
    const recordId = extractRecordId(filename);
    if (!recordId) {
      console.log(`   ⚠️  Could not extract record ID from filename`);
      errors++;
      continue;
    }
    
    // Check if already uploaded (in index)
    const entry = index[recordId];
    if (entry && entry.status === 'uploaded') {
      console.log(`   ⏭️  Already uploaded (according to index)`);
      skipped++;
      continue;
    }
    
    // Verify record exists
    try {
      const record = await pb.collection('politicians').getOne(recordId);
      console.log(`   👤 Found: ${record.name}`);
    } catch (error) {
      console.log(`   ⚠️  Record not found: ${recordId}`);
      errors++;
      continue;
    }
    
    // Upload
    if (!dryRun) {
      console.log(`   📤 Uploading...`);
      const success = await uploadPortrait(recordId, filepath);
      
      if (success) {
        // Move file to uploaded directory
        const uploadedPath = path.join(UPLOADED_DIR, filename);
        fs.renameSync(filepath, uploadedPath);
        
        // Update index
        if (entry) {
          entry.status = 'uploaded';
          entry.uploaded_at = new Date().toISOString();
          entry.uploaded_filepath = uploadedPath;
        } else {
          index[recordId] = {
            recordId: recordId,
            filepath: uploadedPath,
            status: 'uploaded',
            uploaded_at: new Date().toISOString(),
          };
        }
        
        uploaded++;
        console.log(`   ✅ Uploaded and moved to: ${uploadedPath}`);
      } else {
        errors++;
      }
    } else {
      console.log(`   🧪 Would upload to record: ${recordId}`);
      uploaded++; // Count as would-be uploaded
    }
    
    // Save index every 10 records
    if ((i + 1) % 10 === 0 && !dryRun) {
      saveIndex(index);
      console.log(`   💾 Index saved`);
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Final save
  if (!dryRun) {
    saveIndex(index);
  }
  
  console.log('');
  console.log('===================================');
  console.log('✅ Upload complete!');
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  if (!dryRun) {
    console.log(`   Index saved to: ${INDEX_FILE}`);
  }
  console.log('');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
