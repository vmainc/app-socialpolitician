#!/usr/bin/env node
/**
 * Attach portraits from portraits/uploaded/ to politician records by slug
 *
 * Use this when PocketBase record IDs changed (e.g. after re-import) but you
 * still have files in portraits/uploaded/ named slug_recordId.ext. This script
 * looks up each politician by slug and uploads the file to the current record.
 *
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   node scripts/upload_portraits_by_slug.js [--force] [--slug=spencer-cox]
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

let sharp = null;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
} catch (_) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

const UPLOADED_DIR = path.join(projectRoot, 'portraits', 'uploaded');

const args = process.argv.slice(2);
const force = args.includes('--force');
const slugArg = args.find(a => a.startsWith('--slug='));
const singleSlug = slugArg ? slugArg.split('=')[1] : null;

/**
 * Extract slug from filename (slug_recordId.ext)
 */
function extractSlug(filename) {
  const base = path.basename(filename, path.extname(filename));
  const i = base.indexOf('_');
  if (i === -1) return null;
  return base.slice(0, i);
}

function getMimeType(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  return mimeTypes[ext] || 'image/jpeg';
}

async function compressImageIfNeeded(filepath) {
  const MAX_SIZE = 4 * 1024 * 1024;
  const stats = fs.statSync(filepath);
  if (stats.size <= MAX_SIZE || !sharp) return filepath;
  try {
    const ext = path.extname(filepath).toLowerCase();
    const tempPath = filepath.replace(/\.(jpg|jpeg|png|webp)$/i, '_compressed$&');
    let image = sharp(filepath).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true });
    if (ext === '.png') await image.png({ quality: 85, compressionLevel: 9 }).toFile(tempPath);
    else if (ext === '.webp') await image.webp({ quality: 85 }).toFile(tempPath);
    else await image.jpeg({ quality: 85, mozjpeg: true }).toFile(tempPath);
    const newStats = fs.statSync(tempPath);
    if (newStats.size < stats.size && newStats.size <= MAX_SIZE) {
      fs.renameSync(tempPath, filepath);
      return filepath;
    }
    fs.unlinkSync(tempPath);
  } catch (_) {}
  return filepath;
}

async function uploadPortrait(recordId, filepath) {
  try {
    const finalPath = await compressImageIfNeeded(filepath);
    const fileBuffer = fs.readFileSync(finalPath);
    const filename = path.basename(finalPath);
    const mimeType = getMimeType(finalPath);
    if (fileBuffer.length > 5 * 1024 * 1024) {
      console.error(`   ❌ File too large: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB`);
      return false;
    }
    const formData = new FormData();
    formData.append('photo', new Blob([fileBuffer], { type: mimeType }), filename);
    await pb.collection('politicians').update(recordId, formData);
    return true;
  } catch (error) {
    console.error(`   ❌ Upload error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('📤 Upload portraits by slug (from portraits/uploaded/)');
  console.log('=====================================================');
  if (force) console.log('   --force: overwriting existing photos');
  if (singleSlug) console.log(`   --slug=${singleSlug}: only this slug`);
  console.log('');

  if (!adminEmail || !adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD required');
    process.exit(1);
  }

  try {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
  } catch (e) {
    console.error('❌ Auth failed:', e.message);
    process.exit(1);
  }

  if (!fs.existsSync(UPLOADED_DIR)) {
    console.error('❌ Not found:', UPLOADED_DIR);
    process.exit(1);
  }

  const exts = ['.jpg', '.jpeg', '.png', '.webp'];
  let files = fs.readdirSync(UPLOADED_DIR).filter(f => exts.includes(path.extname(f).toLowerCase()));
  if (singleSlug) {
    files = files.filter(f => extractSlug(f) === singleSlug);
    if (files.length === 0) {
      console.log(`No file in uploaded/ for slug: ${singleSlug}`);
      return;
    }
  }

  console.log(`Found ${files.length} file(s) in portraits/uploaded/\n`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filepath = path.join(UPLOADED_DIR, filename);
    const slug = extractSlug(filename);
    if (!slug) {
      console.log(`[${i + 1}/${files.length}] ${filename} — ⚠️ no slug in filename`);
      errors++;
      continue;
    }

    console.log(`[${i + 1}/${files.length}] ${filename} → slug: ${slug}`);

    let record;
    try {
      record = await pb.collection('politicians').getFirstListItem(`slug="${slug}"`);
    } catch (e) {
      console.log(`   ⚠️ No politician with slug "${slug}"`);
      errors++;
      continue;
    }

    if (record.photo && !force) {
      console.log(`   ⏭️ Already has photo, skip (use --force to overwrite)`);
      skipped++;
      continue;
    }

    const ok = await uploadPortrait(record.id, filepath);
    if (ok) {
      uploaded++;
      console.log(`   ✅ Attached to ${record.name} (${record.id})`);
    } else {
      errors++;
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log('');
  console.log('Done.');
  console.log(`   Uploaded: ${uploaded}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
