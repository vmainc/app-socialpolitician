/**
 * Backfill bio (and headline) from Wikipedia for politicians missing them.
 * Use this to get bios showing on all governor/senator/representative profiles.
 *
 * Usage (on VPS or local):
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD='...' \
 *   npx tsx server/src/scripts/backfillBiosFromWikipedia.ts
 *
 * Optional: --office-type=governor  (or senator, representative) to only backfill that type.
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const MIN_MS_BETWEEN_REQUESTS = 1500;
let lastRequest = 0;

const pb = new PocketBase(pbUrl);

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = MIN_MS_BETWEEN_REQUESTS - (now - lastRequest);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  return fetch(url, {
    headers: { 'User-Agent': 'SocialPoliticianApp/1.0 (https://app.socialpolitician.com)' },
  });
}

async function getWikipediaPageHTML(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'parse',
    format: 'json',
    page: title,
    prop: 'text',
    origin: '*',
  });
  const res = await rateLimitedFetch(`${WIKIPEDIA_API}?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.parse?.text?.['*'] ?? null;
}

function getWikipediaTitle(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/wiki\/(.+)$/);
  return m ? decodeURIComponent(m[1].replace(/_/g, ' ')) : null;
}

function extractBio(html: string): string | null {
  try {
    const clean = html.replace(/<!--[\s\S]*?-->/g, '');
    const afterInfobox = clean.indexOf('</table>') > 0 ? clean.indexOf('</table>') : 0;
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let match: RegExpExecArray | null;
    const chunk = clean.substring(afterInfobox);
    while ((match = pRe.exec(chunk)) !== null) {
      let text = match[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      if (text.length < 100) continue;
      if (text.includes('may refer to:') || text.includes('disambiguation')) continue;
      text = text.replace(/\s+/g, ' ').trim();
      if (text.length > 500) text = text.substring(0, 497) + '...';
      if (text.length >= 100) return text;
    }
  } catch (_) {}
  return null;
}

function firstSentence(bio: string, maxLen = 160): string {
  const trimmed = bio.trim();
  const dot = trimmed.indexOf('. ');
  if (dot > 0 && dot <= maxLen) return trimmed.substring(0, dot + 1);
  if (trimmed.length <= maxLen) return trimmed;
  const space = trimmed.lastIndexOf(' ', maxLen);
  return (space > 0 ? trimmed.substring(0, space) : trimmed.substring(0, maxLen)) + '…';
}

async function main() {
  const officeType = process.argv.find((a) => a.startsWith('--office-type='))?.split('=')[1] ?? null;

  if (!adminEmail || !adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD required');
    process.exit(1);
  }

  await pb.admins.authWithPassword(adminEmail, adminPassword);

  const filter =
    (officeType ? `office_type="${officeType}" && ` : '') +
    'wikipedia_url != "" && bio = ""';
  const records = await pb.collection('politicians').getFullList({
    filter,
    sort: 'name',
  });

  console.log(`📋 Found ${records.length} politicians missing bio${officeType ? ` (${officeType}s)` : ''}`);
  if (records.length === 0) {
    console.log('✅ Nothing to backfill.');
    return;
  }

  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const title = getWikipediaTitle(r.wikipedia_url);
    if (!title) {
      console.log(`[${i + 1}/${records.length}] ⏭️ ${r.name}: no Wikipedia title`);
      continue;
    }
    process.stdout.write(`[${i + 1}/${records.length}] ${r.name}... `);
    try {
      const html = await getWikipediaPageHTML(title);
      if (!html) {
        console.log('no HTML');
        errors++;
        continue;
      }
      const bio = extractBio(html);
      if (!bio) {
        console.log('no bio extracted');
        continue;
      }
      const headline = firstSentence(bio);
      try {
        await pb.collection('politicians').update(r.id, { bio, headline });
      } catch {
        await pb.collection('politicians').update(r.id, { bio });
      }
      updated++;
      console.log('✅');
    } catch (e: any) {
      errors++;
      console.log(`❌ ${e?.message || e}`);
    }
  }

  console.log('');
  console.log(`✅ Done. Updated: ${updated}, errors: ${errors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
