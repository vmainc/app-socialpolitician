/**
 * Backfill official social and website URLs for President and Vice President.
 * Cabinet members are left for enrichPoliticiansFromWikipedia (--office-type=executive).
 *
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/backfillExecutiveSocial.ts
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

const OFFICIAL_PRESIDENT = {
  website_url: 'https://www.whitehouse.gov',
  x_url: 'https://x.com/POTUS',
  facebook_url: 'https://www.facebook.com/POTUS',
  instagram_url: 'https://www.instagram.com/potus/',
  youtube_url: 'https://www.youtube.com/user/whitehouse',
};

const OFFICIAL_VICE_PRESIDENT = {
  website_url: 'https://www.whitehouse.gov/vice-president/',
  x_url: 'https://x.com/VP',
  facebook_url: 'https://www.facebook.com/VP',
  instagram_url: 'https://www.instagram.com/vp/',
  youtube_url: 'https://www.youtube.com/user/whitehouse',
};

async function main() {
  console.log('Backfilling executive social / website (President & VP)');
  console.log('PocketBase:', pbUrl);
  console.log('');

  if (!adminEmail || !adminPassword) {
    console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD');
    process.exit(1);
  }

  await pb.admins.authWithPassword(adminEmail, adminPassword);

  const filter = '(office_type="president" || office_type="vice_president")';
  const list = await pb.collection('politicians').getFullList<Record<string, unknown>>({
    filter,
    fields: 'id,name,slug,office_type,website_url,x_url,facebook_url,instagram_url,youtube_url',
  });

  let updated = 0;
  for (const record of list) {
    const officeType = String(record.office_type || '').toLowerCase();
    const template =
      officeType === 'president'
        ? OFFICIAL_PRESIDENT
        : officeType === 'vice_president'
          ? OFFICIAL_VICE_PRESIDENT
          : null;

    if (!template) continue;

    const updates: Record<string, string> = {};
    for (const [key, value] of Object.entries(template)) {
      const current = record[key];
      if (value && (!current || String(current).trim() === '')) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log(`${record.name} (${record.slug}): already has links, skip`);
      continue;
    }

    try {
      await pb.collection('politicians').update(record.id as string, updates);
      console.log(`${record.name} (${record.slug}): updated ${Object.keys(updates).join(', ')}`);
      updated++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${record.name} (${record.slug}): ${msg}`);
    }
  }

  console.log('');
  console.log(`Done. Updated ${updated} executive record(s).`);
  if (list.length > updated) {
    console.log('For Cabinet social links, run: npm run pb:enrich:social:executive');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
