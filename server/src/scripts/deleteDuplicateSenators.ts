/**
 * One-time: Delete duplicate senator records (wrong slugs).
 * Removes: angus-s-jr-king, ben-ray-luj-aacute-n so only angus-king and ben-ray-lujan remain.
 *
 * Usage (on VPS):
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD='...' \
 *   npx tsx server/src/scripts/deleteDuplicateSenators.ts
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';

const DUPLICATE_SLUGS = ['angus-s-jr-king', 'ben-ray-luj-aacute-n'];

async function main() {
  if (!adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD required');
    process.exit(1);
  }

  const pb = new PocketBase(pbUrl);
  await pb.admins.authWithPassword(adminEmail, adminPassword);

  console.log('🗑️  Deleting duplicate senator records...');
  for (const slug of DUPLICATE_SLUGS) {
    try {
      const record = await pb.collection('politicians').getFirstListItem(
        `slug="${slug}" && (office_type="senator" || current_position~"U.S. Senator")`
      );
      await pb.collection('politicians').delete(record.id);
      console.log(`   ✅ Deleted: ${slug} (${record.name})`);
    } catch (e: any) {
      if (e?.status === 404) {
        console.log(`   ⏭️  Not found (already removed?): ${slug}`);
      } else {
        console.error(`   ❌ ${slug}: ${e?.message}`);
      }
    }
  }
  console.log('✅ Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
