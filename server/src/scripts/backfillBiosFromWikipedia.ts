/**
 * Backfill headline and bio from Wikipedia.
 * - Headline = one short sentence, shown in full in the profile hero.
 * - Bio = ~500-word summary for the Biography accordion (major events, career).
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

const TARGET_BIO_WORDS = 500;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract up to ~500 words from the first paragraphs (after infobox) for Biography accordion. */
function extractBio500Words(html: string): string | null {
  try {
    const clean = html.replace(/<!--[\s\S]*?-->/g, '');
    const afterInfobox = clean.indexOf('</table>') > 0 ? clean.indexOf('</table>') : 0;
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let match: RegExpExecArray | null;
    const chunk = clean.substring(afterInfobox);
    const parts: string[] = [];
    let totalWords = 0;
    while ((match = pRe.exec(chunk)) !== null && totalWords < TARGET_BIO_WORDS) {
      let text = stripHtml(match[1]);
      if (text.length < 80) continue;
      if (text.includes('may refer to:') || text.includes('disambiguation')) continue;
      const words = text.split(/\s+/).filter(Boolean);
      const remaining = TARGET_BIO_WORDS - totalWords;
      if (words.length <= remaining) {
        parts.push(text);
        totalWords += words.length;
      } else {
        parts.push(words.slice(0, remaining).join(' '));
        totalWords = TARGET_BIO_WORDS;
      }
    }
    const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
    return joined.length >= 100 ? joined : null;
  } catch (_) {}
  return null;
}

function firstSentence(text: string, maxLen = 160): string {
  const trimmed = text.trim();
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

  // Build filter: optional office type (match office_type OR current_position for robustness)
  // Match empty or null bio so we backfill regardless of how PocketBase stored it
  let officeFilter = 'wikipedia_url != "" && (bio = "" || bio = null)';
  if (officeType) {
    if (officeType === 'governor') {
      officeFilter = `(office_type="governor" || current_position~"Governor") && ${officeFilter}`;
    } else if (officeType === 'senator') {
      officeFilter = `(office_type="senator" || current_position~"Senator") && ${officeFilter}`;
    } else if (officeType === 'representative') {
      officeFilter = `(office_type="representative" || current_position~"Representative") && ${officeFilter}`;
    } else {
      officeFilter = `office_type="${officeType}" && ${officeFilter}`;
    }
  }
  const records = await pb.collection('politicians').getFullList({
    filter: officeFilter,
    sort: 'name',
  });

  console.log(`📋 Found ${records.length} politicians missing bio (headline + ~500-word bio)${officeType ? ` (${officeType}s)` : ''}`);
  if (records.length === 0) {
    // Diagnose why: count governors (or selected type) and how many have wikipedia_url / empty bio
    if (officeType === 'governor') {
      const allGovs = await pb.collection('politicians').getFullList({
        filter: 'office_type="governor" || current_position~"Governor"',
        sort: 'name',
      });
      const withWiki = allGovs.filter((r: any) => r.wikipedia_url && String(r.wikipedia_url).trim() !== '');
      const withEmptyBio = allGovs.filter((r: any) => !r.bio || String(r.bio).trim() === '');
      const needBackfill = allGovs.filter((r: any) => r.wikipedia_url && String(r.wikipedia_url).trim() !== '' && (!r.bio || String(r.bio).trim() === ''));
      console.log('✅ Nothing to backfill.');
      console.log(`   📊 Governors in DB: ${allGovs.length} | with wikipedia_url: ${withWiki.length} | with empty bio: ${withEmptyBio.length} | need backfill: ${needBackfill.length}`);
      if (allGovs.length > 0 && needBackfill.length === 0 && withEmptyBio.length > 0) {
        console.log('   💡 Tip: If governors have empty bio but have wikipedia_url, the filter may not match (e.g. field name or empty-string check). Try running without --office-type=governor to backfill all missing bios.');
      }
    } else {
      console.log('✅ Nothing to backfill.');
    }
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
      const bio = extractBio500Words(html);
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
