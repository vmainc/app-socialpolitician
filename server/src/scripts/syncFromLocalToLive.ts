/**
 * Push politician data (and optional photos) from local PocketBase to live.
 * Use this to copy from dev instead of re-running enrich on live.
 *
 * By default syncs only executives (president, vice_president, cabinet).
 * Use --all to sync every politician.
 *
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   LIVE_PB_URL=https://app.socialpolitician.com/pb \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=... \
 *   npx tsx server/src/scripts/syncFromLocalToLive.ts [--all] [--skip-photos]
 */

import PocketBase from 'pocketbase';

const localPbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const livePbUrl = (process.env.LIVE_PB_URL || 'https://app.socialpolitician.com/pb').replace(/\/$/, '');
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
const syncAll = process.argv.includes('--all');
const skipPhotos = process.argv.includes('--skip-photos');

const ALLOWED_KEYS = new Set([
  'name', 'slug', 'office_type', 'state', 'district', 'political_party', 'party',
  'current_position', 'position_start_date', 'website_url', 'wikipedia_url',
  'facebook_url', 'youtube_url', 'instagram_url', 'x_url', 'linkedin_url', 'tiktok_url', 'truth_social_url',
  'bio', 'headline', 'birth_date', 'chamber', 'office_title', 'term_start_date', 'term_end_date',
]);

interface RecordWithPhoto {
  id: string;
  slug: string;
  name?: string;
  photo?: string;
  [key: string]: unknown;
}

function sanitize(record: RecordWithPhoto): Record<string, unknown> {
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

function getPhotoFilename(record: RecordWithPhoto): string | null {
  const p = record.photo;
  if (typeof p === 'string' && p.trim()) return p.trim();
  if (Array.isArray(p) && p.length > 0 && typeof p[0] === 'string') return p[0].trim();
  return null;
}

async function main() {
  console.log('📤 Sync from local PocketBase to live');
  console.log('=====================================');
  console.log(`Local: ${localPbUrl}`);
  console.log(`Live:  ${livePbUrl}`);
  console.log(`Scope: ${syncAll ? 'all politicians' : 'executives only (president, vice_president, cabinet)'}`);
  if (skipPhotos) console.log('--skip-photos: will not push photos');
  console.log('');

  if (!adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD is required');
    process.exit(1);
  }

  const localPb = new PocketBase(localPbUrl);
  const livePb = new PocketBase(livePbUrl);

  try {
    await localPb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated to local PocketBase');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('❌ Local auth failed:', msg);
    process.exit(1);
  }

  try {
    await livePb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated to live PocketBase');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('❌ Live auth failed:', msg);
    process.exit(1);
  }
  console.log('');

  const filter = syncAll ? '' : '(office_type="president" || office_type="vice_president" || office_type="cabinet")';
  const list = await localPb.collection('politicians').getFullList<RecordWithPhoto>({
    filter: filter || undefined,
    sort: 'slug',
    fields: 'id,slug,name,photo,office_type,state,district,political_party,party,current_position,position_start_date,website_url,wikipedia_url,facebook_url,youtube_url,instagram_url,x_url,linkedin_url,tiktok_url,truth_social_url,bio,headline,birth_date,chamber,office_title,term_start_date,term_end_date',
  });

  console.log(`📋 Found ${list.length} record(s) to push`);
  console.log('');

  let created = 0;
  let updated = 0;
  let photosPushed = 0;
  const photoErrorSlugs: string[] = [];

  for (let i = 0; i < list.length; i++) {
    const local = list[i];
    const slug = local.slug;
    if (!slug) continue;

    const payload = sanitize(local);

    try {
      let liveRecord: { id: string } | null = null;
      try {
        liveRecord = await livePb.collection('politicians').getFirstListItem(`slug="${slug}"`, {});
      } catch {
        liveRecord = null;
      }

      if (liveRecord) {
        await livePb.collection('politicians').update(liveRecord.id, payload);
        updated++;
      } else {
        const createdRecord = await livePb.collection('politicians').create(payload as Record<string, unknown>);
        liveRecord = { id: createdRecord.id };
        created++;
      }

      if (!skipPhotos && liveRecord) {
        const photoFilename = getPhotoFilename(local);
        if (photoFilename) {
          const fileUrl = `${localPbUrl}/api/files/politicians/${local.id}/${encodeURIComponent(photoFilename)}`;
          const fileRes = await fetch(fileUrl);
          if (fileRes.ok) {
            const buf = Buffer.from(await fileRes.arrayBuffer());
            if (buf.length > 0) {
              const ext = photoFilename.includes('.png') ? '.png' : photoFilename.includes('.webp') ? '.webp' : '.jpg';
              const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
              const formData = new FormData();
              formData.append('photo', new Blob([buf], { type: mime }), photoFilename);
              try {
                await livePb.collection('politicians').update(liveRecord!.id, formData);
                photosPushed++;
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                photoErrorSlugs.push(slug);
                console.log(`      ⚠️  Photo failed: ${msg}`);
              }
            }
          } else {
            photoErrorSlugs.push(slug);
            console.log(`      ⚠️  Photo fetch ${fileRes.status} from local`);
          }
        }
      }

      console.log(`   [${i + 1}/${list.length}] ${local.name} (${slug})`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`   ❌ ${slug}: ${msg}`);
    }
  }

  console.log('');
  console.log('📊 Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Photos pushed: ${photosPushed}`);
  if (photoErrorSlugs.length > 0) {
    console.log(`   Photo errors (${photoErrorSlugs.length}): ${photoErrorSlugs.join(', ')}`);
  }
  console.log('');
  console.log('✅ Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
