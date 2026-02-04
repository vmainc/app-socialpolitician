/**
 * Delete ALL records from the politicians collection in PocketBase.
 * Use before re-importing to hit the 585 target (435 House, 100 Senate, 50 Governors).
 *
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/deleteAllPoliticians.ts
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

  const batchSize = 100;
  let total = 0;
  let list = await pb.collection('politicians').getList(1, batchSize);
  total = list.totalItems;
  console.log(`Politicians in collection: ${total}`);

  while (list.items.length > 0) {
    for (const item of list.items) {
      await pb.collection('politicians').delete(item.id);
    }
    console.log(`Deleted ${list.items.length} records...`);
    list = await pb.collection('politicians').getList(1, batchSize);
  }

  console.log(`Done. All ${total} politicians removed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
