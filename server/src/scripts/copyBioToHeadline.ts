/**
 * One-time: copy existing bio to headline for politicians where headline is empty.
 * Run after adding the headline field so the hero can show current content in full.
 *
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=... POCKETBASE_ADMIN_PASSWORD=... \
 *   npx tsx server/src/scripts/copyBioToHeadline.ts
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function main() {
  if (!adminEmail || !adminPassword) {
    console.error('POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD required');
    process.exit(1);
  }
  await pb.admins.authWithPassword(adminEmail, adminPassword);

  const list = await pb.collection('politicians').getFullList<{ id: string; bio?: string; headline?: string }>({});
  let copied = 0;
  for (const r of list) {
    const headline = (r.headline ?? '').trim();
    const bio = (r.bio ?? '').trim();
    if (headline.length > 0 || bio.length === 0) continue;
    await pb.collection('politicians').update(r.id, { headline: bio });
    copied++;
  }
  console.log(`Copied bio → headline for ${copied} politicians.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
