/**
 * Enrich politician social links and website from Google’s right-side panel
 * (Knowledge Panel) via SerpApi. Does not use Wikipedia.
 *
 * Requires: SERPAPI_API_KEY (get one at https://serpapi.com/)
 *
 * Usage:
 *   SERPAPI_API_KEY=your_key POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=... POCKETBASE_ADMIN_PASSWORD=... \
 *   npx tsx server/src/scripts/enrichSocialFromGoogle.ts
 *
 * Options:
 *   --office-type=executive|senator|representative|governor  only that type (default: all)
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
const serpApiKey = process.env.SERPAPI_API_KEY;

const pb = new PocketBase(pbUrl);

const SERPAPI_BASE = 'https://serpapi.com/search';

interface SerpProfile {
  name?: string;
  link?: string;
}

interface KnowledgeGraph {
  website?: string;
  profiles?: SerpProfile[];
}

interface SerpResponse {
  knowledge_graph?: KnowledgeGraph;
  error?: string;
}

// Map Knowledge Panel profile name (and link host) to our DB field
function profileToField(name: string, link: string): string | null {
  const n = name.toLowerCase();
  const url = link.toLowerCase();
  if (n.includes('twitter') || n.includes('x ') || url.includes('twitter.com') || url.includes('x.com')) return 'x_url';
  if (n.includes('facebook') || url.includes('facebook.com') || url.includes('fb.com')) return 'facebook_url';
  if (n.includes('instagram') || url.includes('instagram.com')) return 'instagram_url';
  if (n.includes('youtube') || url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube_url';
  if (n.includes('tiktok') || url.includes('tiktok.com')) return 'tiktok_url';
  if (n.includes('linkedin') || url.includes('linkedin.com')) return 'linkedin_url';
  if (n.includes('truth social') || url.includes('truthsocial.com')) return 'truth_social_url';
  return null;
}

function normalizeUrl(field: string, url: string): string {
  if (field === 'x_url' && url.includes('twitter.com')) {
    return url.replace(/https?:\/\/(www\.)?twitter\.com/, 'https://x.com');
  }
  return url;
}

async function fetchKnowledgePanel(query: string): Promise<KnowledgeGraph | null> {
  if (!serpApiKey?.trim()) return null;
  const params = new URLSearchParams({
    engine: 'google',
    q: query,
    api_key: serpApiKey,
  });
  const url = `${SERPAPI_BASE}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as SerpResponse;
  if (data.error) return null;
  return data.knowledge_graph ?? null;
}

function buildSearchQuery(record: Record<string, unknown>): string {
  const name = String(record.name || '').trim();
  const position = (record.current_position || record.office_title) as string | undefined;
  if (position?.trim()) return `${name} ${position.trim()}`;
  return `${name} politician`;
}

async function main() {
  const args = process.argv.slice(2);
  const officeTypeArg = args.find((a) => a.startsWith('--office-type='));
  const officeType = officeTypeArg ? officeTypeArg.split('=')[1] : null;

  console.log('Enrich social / website from Google (SerpApi Knowledge Panel)');
  console.log('PocketBase:', pbUrl);
  if (officeType) console.log('Filter: office_type =', officeType);
  console.log('');

  if (!serpApiKey?.trim()) {
    console.error('Set SERPAPI_API_KEY (get one at https://serpapi.com/)');
    process.exit(1);
  }
  if (!adminEmail || !adminPassword) {
    console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD');
    process.exit(1);
  }

  await pb.admins.authWithPassword(adminEmail, adminPassword);

  let filter = '';
  if (officeType) {
    if (officeType === 'executive') {
      filter = '(office_type="president" || office_type="vice_president" || office_type="cabinet")';
    } else {
      filter = `office_type="${officeType}"`;
    }
  }

  const list = await pb.collection('politicians').getFullList<Record<string, unknown>>({
    filter: filter || undefined,
    sort: 'name',
    fields: 'id,name,slug,office_type,website_url,x_url,facebook_url,instagram_url,youtube_url,tiktok_url,linkedin_url,truth_social_url',
  });

  console.log(`Found ${list.length} politician(s). Querying Google for each...`);
  console.log('');

  let updated = 0;
  let errors = 0;
  const delayMs = 1500;

  for (let i = 0; i < list.length; i++) {
    const record = list[i];
    const query = buildSearchQuery(record);
    process.stdout.write(`[${i + 1}/${list.length}] ${record.name} ... `);

    try {
      const kg = await fetchKnowledgePanel(query);
      if (!kg) {
        console.log('no knowledge panel');
        errors++;
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      const updates: Record<string, string> = {};

      if (kg.website?.trim()) {
        const cur = record.website_url;
        if (!cur || String(cur).trim() === '') updates.website_url = kg.website.trim();
      }

      const profiles = kg.profiles ?? [];
      for (const p of profiles) {
        const link = p.link?.trim();
        if (!link || !link.startsWith('http')) continue;
        const field = profileToField((p.name || '').toLowerCase(), link);
        if (!field) continue;
        const cur = record[field];
        if (cur && String(cur).trim() !== '') continue;
        updates[field] = normalizeUrl(field, link);
      }

      if (Object.keys(updates).length === 0) {
        console.log('no new links');
      } else {
        await pb.collection('politicians').update(record.id as string, updates);
        console.log('updated:', Object.keys(updates).join(', '));
        updated++;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log('error:', msg);
      errors++;
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  console.log('');
  console.log('Done. Updated', updated, 'record(s). Errors:', errors);
  console.log('Tip: Use local PocketBase (npm run dev) to see links in the app.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
