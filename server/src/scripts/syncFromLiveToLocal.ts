/**
 * Sync politicians (and their photos) from live site to local PocketBase.
 *
 * Fetches all politicians from live, creates/updates local by slug, and
 * downloads each photo from live and uploads to the local record.
 *
 * Usage:
 *   LIVE_PB_URL=https://app.socialpolitician.com/pb \
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=... \
 *   npx tsx server/src/scripts/syncFromLiveToLocal.ts [--skip-photos]
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const livePbUrl = (process.env.LIVE_PB_URL || 'https://app.socialpolitician.com/pb').replace(/\/$/, '');
const localPbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
const skipPhotos = process.argv.includes('--skip-photos');

const ALLOWED_KEYS = new Set([
  'name', 'slug', 'office_type', 'state', 'district', 'political_party',
  'current_position', 'position_start_date', 'website_url', 'wikipedia_url',
  'facebook_url', 'youtube_url', 'instagram_url', 'x_url', 'linkedin_url', 'tiktok_url', 'truth_social_url',
  'bio', 'headline', 'birth_date', 'chamber', 'office_title', 'term_start_date', 'term_end_date',
  'wikipedia_title',
]);

interface LiveRecord {
  id: string;
  slug: string;
  name?: string;
  photo?: string;
  [key: string]: unknown;
}

async function fetchAllFromLive(): Promise<LiveRecord[]> {
  const items: LiveRecord[] = [];
  let page = 1;
  const perPage = 500;
  let totalPages = 1;
  do {
    const url = `${livePbUrl}/api/collections/politicians/records?page=${page}&perPage=${perPage}&sort=slug`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`Live API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    items.push(...(data.items || []));
    totalPages = data.totalPages ?? 1;
    page++;
  } while (page <= totalPages);
  return items;
}

function sanitizePayload(record: LiveRecord): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (k === 'id' || k === 'created' || k === 'updated' || k === 'photo' || k === 'collectionId') continue;
    if (!ALLOWED_KEYS.has(k)) continue;
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[k] = v;
  }
  if (record.name != null) out.name = String(record.name).trim();
  if (record.slug != null) out.slug = String(record.slug).trim();
  return out;
}

function getPhotoFilename(record: LiveRecord): string | null {
  const p = record.photo;
  if (typeof p === 'string' && p.trim()) return p.trim();
  if (Array.isArray(p) && p.length > 0 && typeof p[0] === 'string') return p[0].trim();
  return null;
}

async function downloadPhoto(liveRecordId: string, photoFilename: string): Promise<Buffer | null> {
  const url = `${livePbUrl}/api/files/politicians/${liveRecordId}/${encodeURIComponent(photoFilename)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > 0 ? buf : null;
}

async function uploadPhotoToLocal(pb: PocketBase, localRecordId: string, buffer: Buffer, filename: string): Promise<boolean> {
  try {
    const ext = path.extname(filename).toLowerCase() || '.jpg';
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mime });
    formData.append('photo', blob, filename);
    await pb.collection('politicians').update(localRecordId, formData);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('📥 Sync from live site to local PocketBase');
  console.log('==========================================');
  console.log(`Live:  ${livePbUrl}`);
  console.log(`Local: ${localPbUrl}`);
  if (skipPhotos) console.log('--skip-photos: will not download/attach photos');
  console.log('');

  if (!adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD is required');
    process.exit(1);
  }

  const pb = new PocketBase(localPbUrl);
  try {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
  } catch (e: any) {
    console.error('❌ Local PocketBase auth failed:', e?.message);
    process.exit(1);
  }
  console.log('✅ Authenticated to local PocketBase');
  console.log('');

  console.log('📡 Fetching politicians from live...');
  let liveRecords: LiveRecord[];
  try {
    liveRecords = await fetchAllFromLive();
  } catch (e: any) {
    console.error('❌ Failed to fetch from live:', e?.message);
    process.exit(1);
  }
  console.log(`   Found ${liveRecords.length} records on live`);
  console.log('');

  let created = 0;
  let updated = 0;
  let photosAttached = 0;
  let photoErrors = 0;
  let errors = 0;

  for (let i = 0; i < liveRecords.length; i++) {
    const live = liveRecords[i];
    const slug = live.slug;
    if (!slug) {
      errors++;
      continue;
    }
    const payload = sanitizePayload(live);

    try {
      let localRecord: { id: string } | null = null;
      try {
        localRecord = await pb.collection('politicians').getFirstListItem(`slug="${slug}"`, {});
      } catch {
        localRecord = null;
      }

      if (localRecord) {
        await pb.collection('politicians').update(localRecord.id, payload);
        updated++;
      } else {
        await pb.collection('politicians').create(payload as Record<string, unknown>);
        created++;
        localRecord = await pb.collection('politicians').getFirstListItem(`slug="${slug}"`, {});
      }

      if (!skipPhotos && localRecord) {
        const photoFilename = getPhotoFilename(live);
        if (photoFilename) {
          const buf = await downloadPhoto(live.id, photoFilename);
          if (buf) {
            const ok = await uploadPhotoToLocal(pb, localRecord.id, buf, photoFilename);
            if (ok) photosAttached++;
            else photoErrors++;
          }
        }
      }

      if ((i + 1) % 100 === 0) {
        console.log(`   [${i + 1}/${liveRecords.length}] ${created} created, ${updated} updated, ${photosAttached} photos`);
      }
    } catch (e: any) {
      errors++;
      if (errors <= 5) console.error(`❌ ${slug}: ${e?.message ?? e}`);
    }
  }

  console.log('');
  console.log('📊 Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Photos attached: ${photosAttached}`);
  if (photoErrors) console.log(`   Photo upload errors: ${photoErrors}`);
  if (errors) console.log(`   Record errors: ${errors}`);
  console.log('');
  console.log('✅ Sync complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
