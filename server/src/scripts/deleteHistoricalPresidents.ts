/**
 * Delete historical U.S. president records from the politicians collection.
 * Keeps only active politicians (current senators, reps, governors, executives).
 *
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/deleteHistoricalPresidents.ts
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const HISTORICAL_PRESIDENT_SLUGS = new Set([
  'abraham-lincoln', 'john-adams', 'thomas-jefferson', 'james-madison', 'james-monroe',
  'john-quincy-adams', 'andrew-jackson', 'martin-van-buren', 'william-henry-harrison',
  'john-tyler', 'james-k-polk', 'zachary-taylor', 'millard-fillmore', 'franklin-pierce',
  'james-buchanan', 'andrew-johnson', 'ulysses-s-grant', 'rutherford-b-hayes', 'james-a-garfield',
  'chester-a-arthur', 'grover-cleveland', 'benjamin-harrison', 'william-mckinley', 'theodore-roosevelt',
  'william-howard-taft', 'woodrow-wilson', 'warren-g-harding', 'calvin-coolidge', 'herbert-hoover',
  'franklin-d-roosevelt', 'harry-s-truman', 'dwight-d-eisenhower', 'john-f-kennedy', 'lyndon-b-johnson',
  'richard-nixon', 'gerald-ford', 'jimmy-carter-2', 'ronald-reagan',
]);

const pb = new PocketBase(pbUrl);

async function main() {
  if (!adminEmail || !adminPassword) {
    console.error('POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD required');
    process.exit(1);
  }
  await pb.admins.authWithPassword(adminEmail, adminPassword);

  const all = await pb.collection('politicians').getFullList({ fields: 'id,slug,website_url' });
  const toDelete = all.filter(
    (r) =>
      (r.slug && HISTORICAL_PRESIDENT_SLUGS.has(r.slug)) ||
      (typeof r.website_url === 'string' && r.website_url.includes('whitehouse.gov/about-the-white-house/presidents/'))
  );

  console.log(`Found ${toDelete.length} historical president records to delete.`);
  for (const r of toDelete) {
    await pb.collection('politicians').delete(r.id);
    console.log(`  Deleted: ${r.slug ?? r.id}`);
  }
  console.log(`Done. Removed ${toDelete.length} historical presidents.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
